-- ASC WORKING V2.5.0 - Resource Allocation Foundation
-- Adds hour-based capacity fields for workload/resource planning.

alter table public.people
  add column if not exists capacity_hours_per_week numeric(6,2) not null default 40,
  add column if not exists allocation_target_percent numeric(5,2) not null default 100;

alter table public.issues
  add column if not exists estimated_hours numeric(7,2),
  add column if not exists actual_hours numeric(7,2) not null default 0;

alter table public.project_plan_tasks
  add column if not exists estimated_hours numeric(7,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'people_capacity_hours_per_week_v250_check') then
    alter table public.people
      add constraint people_capacity_hours_per_week_v250_check
      check (capacity_hours_per_week >= 0 and capacity_hours_per_week <= 168);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'people_allocation_target_percent_v250_check') then
    alter table public.people
      add constraint people_allocation_target_percent_v250_check
      check (allocation_target_percent >= 0 and allocation_target_percent <= 200);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'issues_estimated_hours_v250_check') then
    alter table public.issues
      add constraint issues_estimated_hours_v250_check
      check (estimated_hours is null or (estimated_hours >= 0 and estimated_hours <= 9999));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'issues_actual_hours_v250_check') then
    alter table public.issues
      add constraint issues_actual_hours_v250_check
      check (actual_hours >= 0 and actual_hours <= 9999);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'project_plan_tasks_estimated_hours_v250_check') then
    alter table public.project_plan_tasks
      add constraint project_plan_tasks_estimated_hours_v250_check
      check (estimated_hours is null or (estimated_hours >= 0 and estimated_hours <= 9999));
  end if;
end $$;

create index if not exists people_project_capacity_v250_idx
  on public.people(project_id, person_type, is_active, capacity_hours_per_week, allocation_target_percent);

create index if not exists issues_project_assignee_estimated_hours_v250_idx
  on public.issues(project_id, assignee_person_id, estimated_hours)
  where archived_at is null;

create index if not exists project_plan_tasks_project_owner_estimated_hours_v250_idx
  on public.project_plan_tasks(project_id, owner_person_id, estimated_hours);

comment on column public.people.capacity_hours_per_week is 'V2.5.0 weekly available capacity for resource allocation planning.';
comment on column public.people.allocation_target_percent is 'V2.5.0 target utilization percent used to calculate effective capacity.';
comment on column public.issues.estimated_hours is 'V2.5.0 estimated effort hours used by Workload and Resource Allocation.';
comment on column public.issues.actual_hours is 'V2.5.0 actual logged effort hours; reserved for Jira/worklog automation.';
comment on column public.project_plan_tasks.estimated_hours is 'V2.5.0 estimated effort hours for execution task workload planning.';
