-- ASC WORKING V1.6.1 — Editable Stage Date Ranges
-- Run after 202609030001_v160_master_plan_project_stages.sql.
-- Adds manual stage date ranges without allowing automatic recalculation to overwrite them.

alter table public.project_stages add column if not exists date_mode text;

update public.project_stages
set date_mode = 'auto'
where date_mode is null or date_mode not in ('auto', 'manual');

alter table public.project_stages alter column date_mode set default 'auto';
alter table public.project_stages alter column date_mode set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_stages_date_mode_v161_check'
      and conrelid = 'public.project_stages'::regclass
  ) then
    alter table public.project_stages
      add constraint project_stages_date_mode_v161_check
      check (date_mode in ('auto', 'manual'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'project_stages_manual_dates_v161_check'
      and conrelid = 'public.project_stages'::regclass
  ) then
    alter table public.project_stages
      add constraint project_stages_manual_dates_v161_check
      check (
        date_mode = 'auto'
        or (start_date is not null and end_date is not null and end_date >= start_date)
      );
  end if;
end $$;

create or replace function public.plan_duration_between_v161(
  p_start date,
  p_end date,
  p_mode text
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_date date := p_start;
  v_count integer := 0;
begin
  if p_start is null or p_end is null or p_end < p_start then
    return 0;
  end if;

  while v_date <= p_end loop
    if p_mode <> 'business_days' or extract(isodow from v_date) < 6 then
      v_count := v_count + 1;
    end if;
    v_date := v_date + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.validate_project_stage_dates_v161()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_mode text := 'calendar_days';
  v_duration integer;
begin
  if new.date_mode = 'manual' then
    if new.start_date is null or new.end_date is null or new.end_date < new.start_date then
      raise exception 'Manual stage requires a valid start and end date' using errcode='23514';
    end if;
    if (new.end_date - new.start_date) + 1 > 5200 then
      raise exception 'Manual stage date range is too large' using errcode='23514';
    end if;

    select schedule_mode into v_mode
    from public.project_master_plans
    where project_id = new.project_id;
    if not found then v_mode := 'calendar_days'; end if;

    v_duration := public.plan_duration_between_v161(new.start_date, new.end_date, v_mode);
    if v_duration < 1 then
      raise exception 'Manual stage date range contains no scheduled days' using errcode='23514';
    end if;
    if v_duration > 3650 then
      raise exception 'Manual stage date range exceeds 3650 scheduled days' using errcode='23514';
    end if;
    new.duration_days := v_duration;
  end if;
  return new;
end;
$$;

drop trigger if exists project_stages_validate_dates_v161 on public.project_stages;
create trigger project_stages_validate_dates_v161
before insert or update on public.project_stages
for each row execute function public.validate_project_stage_dates_v161();

create or replace function public.recalculate_project_plan_v161(p_project_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_start date;
  v_mode text;
  v_cursor date;
  v_end date;
  v_duration integer;
  v_forecast date;
  v_count integer := 0;
  v_manual_count integer := 0;
  v_stage record;
begin
  if auth.uid() is null or not public.has_project_role(p_project_id, array['admin','pm']) then
    raise exception 'Not authorized to recalculate this project plan' using errcode='42501';
  end if;

  select start_date, schedule_mode into v_start, v_mode
  from public.project_master_plans
  where project_id = p_project_id;

  if not found or v_start is null then
    return jsonb_build_object('scheduled', false, 'reason', 'master_plan_required', 'stageCount', 0);
  end if;

  v_cursor := public.plan_normalize_start_v160(v_start, v_mode);
  for v_stage in
    select id, duration_days, date_mode, start_date, end_date
    from public.project_stages
    where project_id = p_project_id
    order by sort_order, code, created_at
  loop
    if v_stage.date_mode = 'manual' and v_stage.start_date is not null and v_stage.end_date is not null then
      v_end := v_stage.end_date;
      v_duration := public.plan_duration_between_v161(v_stage.start_date, v_stage.end_date, v_mode);
      if v_duration < 1 or v_duration > 3650 then
        raise exception 'Manual stage date range is outside the supported duration' using errcode='23514';
      end if;

      update public.project_stages
      set duration_days = v_duration, updated_at = now()
      where id = v_stage.id;

      if v_end >= v_cursor then
        v_cursor := public.plan_next_date_v160(v_end, v_mode);
      end if;
      v_manual_count := v_manual_count + 1;
    else
      v_end := public.plan_end_date_v160(v_cursor, v_stage.duration_days, v_mode);
      update public.project_stages
      set start_date = v_cursor, end_date = v_end, updated_at = now()
      where id = v_stage.id;
      v_cursor := public.plan_next_date_v160(v_end, v_mode);
    end if;

    if v_forecast is null or v_end > v_forecast then v_forecast := v_end; end if;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'scheduled', true,
    'stageCount', v_count,
    'manualStageCount', v_manual_count,
    'forecastEndDate', v_forecast
  );
end;
$$;

revoke all on function public.recalculate_project_plan_v161(uuid) from public;
grant execute on function public.recalculate_project_plan_v161(uuid) to authenticated;

-- Keep older callers safe: V1.6.0 recalculation now delegates to the manual-date-aware function.
create or replace function public.recalculate_project_plan_v160(p_project_id uuid)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.recalculate_project_plan_v161(p_project_id);
$$;

comment on column public.project_stages.date_mode is 'V1.6.1 auto scheduling or user-locked manual start/end dates.';
comment on function public.plan_duration_between_v161(date, date, text) is 'Counts inclusive calendar or business days for a manual stage date range.';
comment on function public.recalculate_project_plan_v161(uuid) is 'Rebuilds auto stage dates while preserving manual date ranges.';
