-- ASC WORKING V2.6.0 - Resource Scheduling & Assignment Board
-- Adds a lightweight audit trail for PM resource assignment actions.

create table if not exists public.resource_assignment_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_type text not null check (item_type in ('issue', 'task')),
  item_id uuid not null,
  assignee_person_id uuid references public.people(id) on delete set null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists resource_assignment_events_project_idx
  on public.resource_assignment_events(project_id, changed_at desc);

create index if not exists resource_assignment_events_item_idx
  on public.resource_assignment_events(project_id, item_type, item_id);

alter table public.resource_assignment_events enable row level security;

drop policy if exists resource_assignment_events_select_member_v260 on public.resource_assignment_events;
create policy resource_assignment_events_select_member_v260
  on public.resource_assignment_events
  for select
  using (
    public.is_project_member(project_id)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'master'
    )
  );

drop policy if exists resource_assignment_events_insert_pm_v260 on public.resource_assignment_events;
create policy resource_assignment_events_insert_pm_v260
  on public.resource_assignment_events
  for insert
  with check (
    public.has_project_role(project_id, array['admin','pm'])
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'master'
    )
  );

comment on table public.resource_assignment_events is 'V2.6.0 audit trail for Resource Scheduling assignment board actions.';
