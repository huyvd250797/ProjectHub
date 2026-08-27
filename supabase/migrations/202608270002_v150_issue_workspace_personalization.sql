-- ASC WORKING V1.5.0 — ISSUE Visual Customization & Workspace Layout
-- Run after 202608270001_v140_google_drive_documents.sql.

alter table public.issue_user_preferences
  add column if not exists filters_visible boolean not null default true;

alter table public.issue_user_preferences
  add column if not exists tag_styles jsonb not null default '{}'::jsonb;

create table if not exists public.workspace_user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  navigation_order jsonb not null default '["/dashboard","/analytics","/reports","/contract","/departments","/issues","/documents","/activity","/resources"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists workspace_user_preferences_set_updated_at on public.workspace_user_preferences;
create trigger workspace_user_preferences_set_updated_at
before update on public.workspace_user_preferences
for each row execute function public.set_updated_at();

alter table public.workspace_user_preferences enable row level security;

drop policy if exists "workspace_user_preferences_select_own_v150" on public.workspace_user_preferences;
create policy "workspace_user_preferences_select_own_v150"
on public.workspace_user_preferences for select
using (user_id = auth.uid());

drop policy if exists "workspace_user_preferences_insert_own_v150" on public.workspace_user_preferences;
create policy "workspace_user_preferences_insert_own_v150"
on public.workspace_user_preferences for insert
with check (user_id = auth.uid());

drop policy if exists "workspace_user_preferences_update_own_v150" on public.workspace_user_preferences;
create policy "workspace_user_preferences_update_own_v150"
on public.workspace_user_preferences for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on public.workspace_user_preferences to authenticated;

comment on column public.issue_user_preferences.tag_styles is 'V1.5.0 per-value border/background/text tag colors.';
comment on column public.issue_user_preferences.filters_visible is 'V1.5.0 default-visible ISSUE filter toolbar preference.';
comment on table public.workspace_user_preferences is 'V1.5.0 per-user global workspace navigation order.';
