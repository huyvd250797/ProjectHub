-- ASC WORKING V0.9.1 — Master Account / Multi-Project Access
-- Run after V0.9.0 migrations.
-- Adds a global MASTER role without requiring one project_members row per project.

alter table public.profiles
  add column if not exists global_role text not null default 'user';

-- Add the constraint only once.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_global_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_global_role_check
      check (global_role in ('user','master'));
  end if;
end $$;

create index if not exists profiles_global_role_idx
  on public.profiles(global_role)
  where global_role = 'master';

-- MASTER is a global system role. Security definer is required so the helper can
-- inspect profiles even while RLS is enabled on the table.
create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.global_role = 'master'
      and p.is_active = true
  );
$$;

-- Upgrade existing project helpers. Existing RLS policies already call these
-- functions, so MASTER automatically gains access to current and future projects.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master()
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
    );
$$;

create or replace function public.has_project_role(p_project_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master()
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and pm.role = any(p_roles)
    );
$$;

-- ISSUE history/profile lookup should also work across every project for MASTER.
create or replace function public.shares_project_with_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master()
    or exists (
      select 1
      from public.project_members me
      join public.project_members them on them.project_id = me.project_id
      where me.user_id = auth.uid()
        and them.user_id = p_profile_id
    );
$$;

-- MASTER can inspect user profiles to manage project membership.
drop policy if exists "profiles_select_master" on public.profiles;
create policy "profiles_select_master"
on public.profiles for select
using (public.is_master());

-- MASTER can maintain profiles/global roles. Normal users remain limited to the
-- existing self policy, while the trigger below prevents self-escalation.
drop policy if exists "profiles_update_master" on public.profiles;
create policy "profiles_update_master"
on public.profiles for update
using (public.is_master())
with check (public.is_master());

-- Only MASTER may create/remove projects globally. Existing PM/Admin update
-- policy continues to handle project-scoped updates.
drop policy if exists "projects_insert_master" on public.projects;
create policy "projects_insert_master"
on public.projects for insert
with check (public.is_master());

drop policy if exists "projects_delete_master" on public.projects;
create policy "projects_delete_master"
on public.projects for delete
using (public.is_master());

-- Prevent an authenticated user from promoting their own global_role through
-- the existing profile self-update policy. SQL Editor/service-role/bootstrap is
-- allowed; an existing MASTER may promote/demote users.
create or replace function public.guard_profile_global_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.global_role is distinct from old.global_role then
    if current_user not in ('postgres','supabase_admin')
       and coalesce(auth.role(), '') <> 'service_role'
       and not public.is_master() then
      raise exception 'Only MASTER may change global_role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_global_role_trigger on public.profiles;
create trigger guard_profile_global_role_trigger
before update on public.profiles
for each row execute function public.guard_profile_global_role();

comment on column public.profiles.global_role is 'V0.9.1 global ASC WORKING role: user or master.';
comment on function public.is_master() is 'Returns true for an active global MASTER account.';
