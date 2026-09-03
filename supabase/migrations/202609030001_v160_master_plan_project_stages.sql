-- ASC WORKING V1.6.0 — Master Plan & Project Stages
-- Run after 202608270002_v150_issue_workspace_personalization.sql.
-- Extends the existing project_stages table so ISSUE/Dashboard/Import references stay intact.

alter table public.workspace_user_preferences
  alter column navigation_order set default '["/dashboard","/plan","/analytics","/reports","/contract","/departments","/issues","/documents","/activity","/resources"]'::jsonb;

alter table public.project_stages add column if not exists description text;
alter table public.project_stages add column if not exists duration_days integer;
alter table public.project_stages add column if not exists progress integer;
alter table public.project_stages add column if not exists color text;
alter table public.project_stages add column if not exists owner_person_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_stages_owner_person_id_fkey'
      and conrelid = 'public.project_stages'::regclass
  ) then
    alter table public.project_stages
      add constraint project_stages_owner_person_id_fkey
      foreign key (owner_person_id) references public.people(id) on delete set null;
  end if;
end $$;

update public.project_stages
set duration_days = greatest(coalesce(
  duration_days,
  case when start_date is not null and end_date is not null and end_date >= start_date then (end_date - start_date) + 1 end,
  5
), 1);

update public.project_stages
set status = case
  when lower(trim(coalesce(status, ''))) in ('completed','done','hoàn tất','hoan tat','đã hoàn tất','da hoan tat') then 'completed'
  when lower(trim(coalesce(status, ''))) in ('in_progress','in progress','processing','đang chạy','dang chay','đang thực hiện','dang thuc hien') then 'in_progress'
  when lower(trim(coalesce(status, ''))) in ('blocked','tạm dừng','tam dung','bị chặn','bi chan') then 'blocked'
  else 'not_started'
end;

update public.project_stages
set progress = case when status = 'completed' then 100 else greatest(0, least(coalesce(progress, 0), 100)) end;

with ranked as (
  select id, row_number() over (partition by project_id order by sort_order, code, created_at) as position
  from public.project_stages
)
update public.project_stages stage
set color = (array['#22D3EE','#8B5CF6','#F59E0B','#10B981','#F43F5E','#3B82F6'])[
  (((ranked.position - 1) % 6) + 1)::integer
]
from ranked
where ranked.id = stage.id and (stage.color is null or stage.color !~ '^#[0-9A-Fa-f]{6}$');

alter table public.project_stages alter column duration_days set default 5;
alter table public.project_stages alter column duration_days set not null;
alter table public.project_stages alter column progress set default 0;
alter table public.project_stages alter column progress set not null;
alter table public.project_stages alter column color set default '#22D3EE';
alter table public.project_stages alter column color set not null;
alter table public.project_stages alter column status set default 'not_started';
alter table public.project_stages alter column status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='project_stages_duration_v160_check' and conrelid='public.project_stages'::regclass) then
    alter table public.project_stages add constraint project_stages_duration_v160_check check (duration_days between 1 and 3650);
  end if;
  if not exists (select 1 from pg_constraint where conname='project_stages_progress_v160_check' and conrelid='public.project_stages'::regclass) then
    alter table public.project_stages add constraint project_stages_progress_v160_check check (progress between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='project_stages_color_v160_check' and conrelid='public.project_stages'::regclass) then
    alter table public.project_stages add constraint project_stages_color_v160_check check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname='project_stages_status_v160_check' and conrelid='public.project_stages'::regclass) then
    alter table public.project_stages add constraint project_stages_status_v160_check check (status in ('not_started','in_progress','blocked','completed'));
  end if;
end $$;

create index if not exists project_stages_project_schedule_v160_idx
  on public.project_stages(project_id, sort_order, start_date, end_date);
create index if not exists project_stages_owner_v160_idx
  on public.project_stages(project_id, owner_person_id) where owner_person_id is not null;

create table if not exists public.project_master_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  title text not null,
  objective text,
  start_date date not null,
  target_end_date date,
  schedule_mode text not null default 'calendar_days' check (schedule_mode in ('calendar_days','business_days')),
  status text not null default 'draft' check (status in ('draft','active','on_hold','completed')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_master_plans_dates_v160_check check (target_end_date is null or target_end_date >= start_date)
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid constraint project_milestones_stage_id_fkey references public.project_stages(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','at_risk','completed','missed')),
  owner_person_id uuid constraint project_milestones_owner_person_id_fkey references public.people(id) on delete set null,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_milestones_project_due_v160_idx
  on public.project_milestones(project_id, due_date, sort_order);
create index if not exists project_milestones_stage_v160_idx
  on public.project_milestones(project_id, stage_id) where stage_id is not null;
create index if not exists project_milestones_owner_v160_idx
  on public.project_milestones(project_id, owner_person_id) where owner_person_id is not null;

drop trigger if exists project_master_plans_set_updated_at on public.project_master_plans;
create trigger project_master_plans_set_updated_at
before update on public.project_master_plans
for each row execute function public.set_updated_at();

drop trigger if exists project_milestones_set_updated_at on public.project_milestones;
create trigger project_milestones_set_updated_at
before update on public.project_milestones
for each row execute function public.set_updated_at();

create or replace function public.validate_project_stage_v160()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.owner_person_id
      and person.project_id = new.project_id
      and person.person_type = 'asc'
      and person.is_active = true
  ) then
    raise exception 'Planning owner must be an active ASC person in the same project' using errcode='23514';
  end if;

  if new.progress >= 100 or new.status = 'completed' then
    new.progress := 100;
    new.status := 'completed';
  elsif new.status = 'not_started' and new.progress > 0 then
    new.status := 'in_progress';
  end if;
  return new;
end;
$$;

create or replace function public.validate_project_milestone_v160()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.owner_person_id
      and person.project_id = new.project_id
      and person.person_type = 'asc'
      and person.is_active = true
  ) then
    raise exception 'Milestone owner must be an active ASC person in the same project' using errcode='23514';
  end if;

  if new.stage_id is not null and not exists (
    select 1 from public.project_stages stage
    where stage.id = new.stage_id and stage.project_id = new.project_id
  ) then
    raise exception 'Milestone stage must belong to the same project' using errcode='23514';
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists project_stages_validate_v160 on public.project_stages;
create trigger project_stages_validate_v160
before insert or update on public.project_stages
for each row execute function public.validate_project_stage_v160();

drop trigger if exists project_milestones_validate_v160 on public.project_milestones;
create trigger project_milestones_validate_v160
before insert or update on public.project_milestones
for each row execute function public.validate_project_milestone_v160();

create or replace function public.sync_master_plan_project_dates_v160()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.projects
  set start_date = new.start_date,
      due_date = new.target_end_date,
      updated_at = now()
  where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists project_master_plan_sync_dates_v160 on public.project_master_plans;
create trigger project_master_plan_sync_dates_v160
after insert or update of start_date, target_end_date on public.project_master_plans
for each row execute function public.sync_master_plan_project_dates_v160();

create or replace function public.plan_normalize_start_v160(p_date date, p_mode text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare v_date date := p_date;
begin
  if p_mode = 'business_days' then
    while extract(isodow from v_date) >= 6 loop
      v_date := v_date + 1;
    end loop;
  end if;
  return v_date;
end;
$$;

create or replace function public.plan_end_date_v160(p_start date, p_duration integer, p_mode text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_date date := public.plan_normalize_start_v160(p_start, p_mode);
  v_remaining integer := greatest(coalesce(p_duration, 1), 1) - 1;
begin
  while v_remaining > 0 loop
    v_date := v_date + 1;
    if p_mode <> 'business_days' or extract(isodow from v_date) < 6 then
      v_remaining := v_remaining - 1;
    end if;
  end loop;
  return v_date;
end;
$$;

create or replace function public.plan_next_date_v160(p_end date, p_mode text)
returns date
language plpgsql
immutable
set search_path = public
as $$
begin
  return public.plan_normalize_start_v160(p_end + 1, p_mode);
end;
$$;

create or replace function public.recalculate_project_plan_v160(p_project_id uuid)
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
  v_count integer := 0;
  v_stage record;
begin
  if auth.uid() is null or not public.has_project_role(p_project_id, array['admin','pm']) then
    raise exception 'Not authorized to recalculate this project plan' using errcode='42501';
  end if;

  select start_date, schedule_mode into v_start, v_mode
  from public.project_master_plans where project_id = p_project_id;

  if not found or v_start is null then
    return jsonb_build_object('scheduled', false, 'reason', 'master_plan_required', 'stageCount', 0);
  end if;

  v_cursor := public.plan_normalize_start_v160(v_start, v_mode);
  for v_stage in
    select id, duration_days
    from public.project_stages
    where project_id = p_project_id
    order by sort_order, code, created_at
  loop
    v_end := public.plan_end_date_v160(v_cursor, v_stage.duration_days, v_mode);
    update public.project_stages
    set start_date = v_cursor, end_date = v_end, updated_at = now()
    where id = v_stage.id;
    v_cursor := public.plan_next_date_v160(v_end, v_mode);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'scheduled', true,
    'stageCount', v_count,
    'forecastEndDate', case when v_count = 0 then null else v_end end
  );
end;
$$;

revoke all on function public.recalculate_project_plan_v160(uuid) from public;
grant execute on function public.recalculate_project_plan_v160(uuid) to authenticated;

alter table public.project_master_plans enable row level security;
alter table public.project_milestones enable row level security;

drop policy if exists "project_master_plans_select_member_v160" on public.project_master_plans;
create policy "project_master_plans_select_member_v160"
on public.project_master_plans for select
using (public.is_project_member(project_id));

drop policy if exists "project_master_plans_write_pm_v160" on public.project_master_plans;
create policy "project_master_plans_write_pm_v160"
on public.project_master_plans for all
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

drop policy if exists "project_milestones_select_member_v160" on public.project_milestones;
create policy "project_milestones_select_member_v160"
on public.project_milestones for select
using (public.is_project_member(project_id));

drop policy if exists "project_milestones_write_pm_v160" on public.project_milestones;
create policy "project_milestones_write_pm_v160"
on public.project_milestones for all
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

grant select, insert, update, delete on public.project_master_plans to authenticated;
grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.project_stages to authenticated;

create or replace function public.capture_planning_activity_v160()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_new jsonb;
  v_old jsonb;
  v_entity text;
  v_title text;
  v_summary text;
  v_event text;
begin
  v_new := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_row := case when tg_op = 'DELETE' then v_old else v_new end;

  if tg_table_name = 'project_stages' and tg_op = 'UPDATE' and
     (v_new - 'start_date' - 'end_date' - 'updated_at') = (v_old - 'start_date' - 'end_date' - 'updated_at') then
    return new;
  end if;

  if tg_table_name = 'project_master_plans' then
    v_entity := 'plan';
    v_title := case tg_op when 'INSERT' then 'Khởi tạo Master Plan' when 'DELETE' then 'Xóa Master Plan' else 'Cập nhật Master Plan' end;
    v_summary := v_row->>'title';
  elsif tg_table_name = 'project_stages' then
    v_entity := 'stage';
    v_title := case tg_op when 'INSERT' then 'Thêm Project Stage' when 'DELETE' then 'Xóa Project Stage' else 'Cập nhật Project Stage' end;
    v_summary := coalesce(v_row->>'code', '') || ' • ' || coalesce(v_row->>'name', '');
  else
    v_entity := 'milestone';
    v_title := case tg_op when 'INSERT' then 'Thêm Milestone' when 'DELETE' then 'Xóa Milestone' else 'Cập nhật Milestone' end;
    v_summary := v_row->>'title';
  end if;
  v_event := 'planning_' || v_entity || '_' || lower(tg_op);

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, metadata)
  values ((v_row->>'project_id')::uuid, auth.uid(), v_event, v_entity, (v_row->>'id')::uuid, v_title, v_summary, '/plan', jsonb_build_object('operation', lower(tg_op)));

  if tg_op = 'DELETE' then return old; end if;
  return new;
exception when others then
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists project_master_plans_activity_v160 on public.project_master_plans;
create trigger project_master_plans_activity_v160
after insert or update or delete on public.project_master_plans
for each row execute function public.capture_planning_activity_v160();

drop trigger if exists project_stages_activity_v160 on public.project_stages;
create trigger project_stages_activity_v160
after insert or update or delete on public.project_stages
for each row execute function public.capture_planning_activity_v160();

drop trigger if exists project_milestones_activity_v160 on public.project_milestones;
create trigger project_milestones_activity_v160
after insert or update or delete on public.project_milestones
for each row execute function public.capture_planning_activity_v160();

comment on table public.project_master_plans is 'V1.6.0 one active Master Plan configuration per Project.';
comment on table public.project_milestones is 'V1.6.0 dated Project milestones linked optionally to a Project Stage and owner.';
comment on column public.project_stages.duration_days is 'V1.6.0 stage duration used by automatic sequential scheduling.';
comment on function public.recalculate_project_plan_v160(uuid) is 'Rebuilds stage start/end dates sequentially from the Master Plan start date.';
