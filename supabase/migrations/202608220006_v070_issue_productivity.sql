-- ASC WORKING V0.7.0 — ISSUE Productivity
-- Saved Views + per-user ISSUE grid preferences.

create table if not exists public.issue_saved_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  query_params jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, user_id, name)
);

create index if not exists issue_saved_views_user_project_idx
  on public.issue_saved_views(user_id, project_id, updated_at desc);

create table if not exists public.issue_user_preferences (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  visible_columns jsonb not null default '["issueNo","content","status","customerStatus","priority","module","department","assignee","dueDate","jira"]'::jsonb,
  column_order jsonb not null default '["issueNo","content","status","customerStatus","priority","module","department","assignee","dueDate","jira"]'::jsonb,
  column_widths jsonb not null default '{}'::jsonb,
  pinned_columns jsonb not null default '["issueNo","content"]'::jsonb,
  page_size integer not null default 50 check (page_size in (25,50,100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(project_id, user_id)
);

alter table public.issue_saved_views enable row level security;
alter table public.issue_user_preferences enable row level security;

drop policy if exists "issue_saved_views_select_own" on public.issue_saved_views;
create policy "issue_saved_views_select_own" on public.issue_saved_views
for select using (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "issue_saved_views_insert_own" on public.issue_saved_views;
create policy "issue_saved_views_insert_own" on public.issue_saved_views
for insert with check (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "issue_saved_views_update_own" on public.issue_saved_views;
create policy "issue_saved_views_update_own" on public.issue_saved_views
for update using (user_id = auth.uid() and public.is_project_member(project_id))
with check (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "issue_saved_views_delete_own" on public.issue_saved_views;
create policy "issue_saved_views_delete_own" on public.issue_saved_views
for delete using (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "issue_user_preferences_select_own" on public.issue_user_preferences;
create policy "issue_user_preferences_select_own" on public.issue_user_preferences
for select using (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "issue_user_preferences_insert_own" on public.issue_user_preferences;
create policy "issue_user_preferences_insert_own" on public.issue_user_preferences
for insert with check (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "issue_user_preferences_update_own" on public.issue_user_preferences;
create policy "issue_user_preferences_update_own" on public.issue_user_preferences
for update using (user_id = auth.uid() and public.is_project_member(project_id))
with check (user_id = auth.uid() and public.is_project_member(project_id));

grant select, insert, update, delete on public.issue_saved_views to authenticated;
grant select, insert, update on public.issue_user_preferences to authenticated;

comment on table public.issue_saved_views is 'V0.7.0 per-user saved ISSUE filters/views scoped to a project.';
comment on table public.issue_user_preferences is 'V0.7.0 per-user ISSUE grid columns, widths, pins and page size.';
