-- ASC WORKING V3.2.0 — Project Timeline Pro
-- Run after 202609080001_v310_project_financial_control.sql.
-- Keeps the existing planning tables and adds baseline/critical-path metadata.

alter table public.project_master_plans
  add column if not exists baseline_snapshot_at timestamptz;

alter table public.project_stages
  add column if not exists baseline_start_date date,
  add column if not exists baseline_end_date date,
  add column if not exists baseline_duration_days integer,
  add column if not exists is_critical boolean;

alter table public.project_plan_tasks
  add column if not exists baseline_due_date date;

update public.project_stages
set baseline_start_date = coalesce(baseline_start_date, start_date),
    baseline_end_date = coalesce(baseline_end_date, end_date),
    baseline_duration_days = coalesce(baseline_duration_days, duration_days),
    is_critical = coalesce(is_critical, true);

update public.project_plan_tasks
set baseline_due_date = coalesce(baseline_due_date, due_date);

alter table public.project_stages alter column is_critical set default false;

create index if not exists project_stages_timeline_pro_idx
  on public.project_stages(project_id, is_critical, start_date, end_date);
create index if not exists project_plan_tasks_timeline_pro_idx
  on public.project_plan_tasks(project_id, due_date, baseline_due_date);

create or replace function public.initialize_timeline_baseline_v320()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'project_stages' then
    if tg_op = 'INSERT' then
      new.baseline_start_date := coalesce(new.baseline_start_date, new.start_date);
      new.baseline_end_date := coalesce(new.baseline_end_date, new.end_date);
      new.baseline_duration_days := coalesce(new.baseline_duration_days, new.duration_days);
      new.is_critical := coalesce(new.is_critical, false);
    end if;
  elsif tg_table_name = 'project_plan_tasks' and tg_op = 'INSERT' then
    new.baseline_due_date := coalesce(new.baseline_due_date, new.due_date);
  end if;
  return new;
end;
$$;

drop trigger if exists project_stages_timeline_baseline_v320 on public.project_stages;
create trigger project_stages_timeline_baseline_v320
before insert on public.project_stages
for each row execute function public.initialize_timeline_baseline_v320();

drop trigger if exists project_plan_tasks_timeline_baseline_v320 on public.project_plan_tasks;
create trigger project_plan_tasks_timeline_baseline_v320
before insert on public.project_plan_tasks
for each row execute function public.initialize_timeline_baseline_v320();

create or replace function public.snapshot_project_timeline_baseline_v320(p_project_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_stage_count integer := 0;
  v_task_count integer := 0;
begin
  if auth.uid() is null or not public.has_project_role(p_project_id, array['admin','pm']) then
    raise exception 'Not authorized to snapshot this project timeline' using errcode='42501';
  end if;

  update public.project_stages
  set baseline_start_date = start_date,
      baseline_end_date = end_date,
      baseline_duration_days = duration_days,
      is_critical = true,
      updated_at = now()
  where project_id = p_project_id;
  get diagnostics v_stage_count = row_count;

  update public.project_plan_tasks
  set baseline_due_date = due_date,
      updated_at = now()
  where project_id = p_project_id;
  get diagnostics v_task_count = row_count;

  update public.project_master_plans
  set baseline_snapshot_at = now(), updated_at = now()
  where project_id = p_project_id;

  return jsonb_build_object('stageCount', v_stage_count, 'taskCount', v_task_count, 'snapshotAt', now());
end;
$$;

revoke all on function public.snapshot_project_timeline_baseline_v320(uuid) from public;
grant execute on function public.snapshot_project_timeline_baseline_v320(uuid) to authenticated;

comment on column public.project_stages.baseline_start_date is 'V3.2.0 immutable schedule baseline start date until the user snapshots again.';
comment on column public.project_stages.baseline_end_date is 'V3.2.0 immutable schedule baseline end date until the user snapshots again.';
comment on column public.project_stages.is_critical is 'V3.2.0 stage participates in the critical path shown by Timeline Pro.';
comment on function public.snapshot_project_timeline_baseline_v320(uuid) is 'Captures the current stage/task schedule as the project baseline for delay tracking.';
