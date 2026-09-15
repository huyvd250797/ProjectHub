-- ASC WORKING V3.8.0 — Execution Task Grid
-- Run after 202609140001_v371_search_modal_deadline_fix.sql.
-- Adds stable auto-increment task numbers per Project and guarantees estimate storage.

alter table public.project_plan_tasks
  add column if not exists estimated_hours numeric(7,2),
  add column if not exists task_no integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_plan_tasks_estimated_hours_v250_check'
  ) then
    alter table public.project_plan_tasks
      add constraint project_plan_tasks_estimated_hours_v250_check
      check (estimated_hours is null or (estimated_hours >= 0 and estimated_hours <= 9999));
  end if;
end $$;

with project_max as (
  select project_id, coalesce(max(task_no), 0) as max_task_no
  from public.project_plan_tasks
  group by project_id
), numbered as (
  select
    task.id,
    project_max.max_task_no + row_number() over (
      partition by task.project_id
      order by task.created_at, task.id
    ) as next_task_no
  from public.project_plan_tasks task
  join project_max on project_max.project_id = task.project_id
  where task.task_no is null
)
update public.project_plan_tasks task
set task_no = numbered.next_task_no
from numbered
where task.id = numbered.id;

alter table public.project_plan_tasks
  alter column task_no set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_plan_tasks_task_no_v380_check'
  ) then
    alter table public.project_plan_tasks
      add constraint project_plan_tasks_task_no_v380_check
      check (task_no > 0);
  end if;
end $$;

create unique index if not exists project_plan_tasks_project_task_no_v380_uidx
  on public.project_plan_tasks(project_id, task_no);

create or replace function public.assign_project_plan_task_no_v380()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.task_no is null then
    perform pg_advisory_xact_lock(hashtext(new.project_id::text));
    select coalesce(max(task_no), 0) + 1
    into new.task_no
    from public.project_plan_tasks
    where project_id = new.project_id;
  end if;
  return new;
end;
$$;

drop trigger if exists project_plan_tasks_assign_task_no_v380 on public.project_plan_tasks;
create trigger project_plan_tasks_assign_task_no_v380
before insert on public.project_plan_tasks
for each row execute function public.assign_project_plan_task_no_v380();

comment on column public.project_plan_tasks.task_no is 'V3.8.0 stable auto-increment task number scoped to each Project.';
comment on column public.project_plan_tasks.estimated_hours is 'Estimated effort hours shown in the V3.8.0 Execution Task Grid.';

analyze public.project_plan_tasks;
