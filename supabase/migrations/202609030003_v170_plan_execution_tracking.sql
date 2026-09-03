-- ASC WORKING V1.7.0 — Plan Execution & Tracking
-- Run after 202609030002_v161_stage_date_range.sql.
-- Adds stage execution tasks and milestone checklist items.

create table if not exists public.project_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid constraint project_plan_tasks_stage_id_fkey references public.project_stages(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','blocked','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  due_date date,
  completed_at timestamptz,
  owner_person_id uuid constraint project_plan_tasks_owner_person_id_fkey references public.people(id) on delete set null,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_milestone_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid not null constraint project_milestone_checklist_items_milestone_id_fkey references public.project_milestones(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_plan_tasks_project_stage_v170_idx
  on public.project_plan_tasks(project_id, stage_id, sort_order);
create index if not exists project_plan_tasks_project_due_v170_idx
  on public.project_plan_tasks(project_id, due_date, status) where due_date is not null;
create index if not exists project_plan_tasks_owner_v170_idx
  on public.project_plan_tasks(project_id, owner_person_id) where owner_person_id is not null;
create index if not exists project_milestone_checklist_project_milestone_v170_idx
  on public.project_milestone_checklist_items(project_id, milestone_id, sort_order);

drop trigger if exists project_plan_tasks_set_updated_at on public.project_plan_tasks;
create trigger project_plan_tasks_set_updated_at
before update on public.project_plan_tasks
for each row execute function public.set_updated_at();

drop trigger if exists project_milestone_checklist_set_updated_at on public.project_milestone_checklist_items;
create trigger project_milestone_checklist_set_updated_at
before update on public.project_milestone_checklist_items
for each row execute function public.set_updated_at();

create or replace function public.validate_project_plan_task_v170()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if length(trim(coalesce(new.title, ''))) < 2 or length(trim(new.title)) > 180 then
    raise exception 'Plan task title must be 2-180 characters' using errcode='23514';
  end if;

  if new.stage_id is not null and not exists (
    select 1 from public.project_stages stage
    where stage.id = new.stage_id and stage.project_id = new.project_id
  ) then
    raise exception 'Plan task stage must belong to the same project' using errcode='23514';
  end if;

  if new.owner_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.owner_person_id
      and person.project_id = new.project_id
      and person.person_type = 'asc'
      and person.is_active = true
  ) then
    raise exception 'Plan task owner must be an active ASC person in the same project' using errcode='23514';
  end if;

  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.validate_milestone_checklist_v170()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if length(trim(coalesce(new.title, ''))) < 2 or length(trim(new.title)) > 180 then
    raise exception 'Milestone checklist title must be 2-180 characters' using errcode='23514';
  end if;

  if not exists (
    select 1 from public.project_milestones milestone
    where milestone.id = new.milestone_id and milestone.project_id = new.project_id
  ) then
    raise exception 'Checklist milestone must belong to the same project' using errcode='23514';
  end if;

  if new.is_done then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists project_plan_tasks_validate_v170 on public.project_plan_tasks;
create trigger project_plan_tasks_validate_v170
before insert or update on public.project_plan_tasks
for each row execute function public.validate_project_plan_task_v170();

drop trigger if exists project_milestone_checklist_validate_v170 on public.project_milestone_checklist_items;
create trigger project_milestone_checklist_validate_v170
before insert or update on public.project_milestone_checklist_items
for each row execute function public.validate_milestone_checklist_v170();

alter table public.project_plan_tasks enable row level security;
alter table public.project_milestone_checklist_items enable row level security;

drop policy if exists "project_plan_tasks_select_member_v170" on public.project_plan_tasks;
create policy "project_plan_tasks_select_member_v170"
on public.project_plan_tasks for select
using (public.is_project_member(project_id));

drop policy if exists "project_plan_tasks_write_pm_v170" on public.project_plan_tasks;
create policy "project_plan_tasks_write_pm_v170"
on public.project_plan_tasks for all
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

drop policy if exists "project_milestone_checklist_select_member_v170" on public.project_milestone_checklist_items;
create policy "project_milestone_checklist_select_member_v170"
on public.project_milestone_checklist_items for select
using (public.is_project_member(project_id));

drop policy if exists "project_milestone_checklist_write_pm_v170" on public.project_milestone_checklist_items;
create policy "project_milestone_checklist_write_pm_v170"
on public.project_milestone_checklist_items for all
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

grant select, insert, update, delete on public.project_plan_tasks to authenticated;
grant select, insert, update, delete on public.project_milestone_checklist_items to authenticated;

create or replace function public.capture_plan_execution_activity_v170()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_entity text;
  v_title text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'project_plan_tasks' then
    v_entity := 'plan_task';
    v_title := case tg_op when 'INSERT' then 'Thêm Execution Task' when 'DELETE' then 'Xóa Execution Task' else 'Cập nhật Execution Task' end;
  else
    v_entity := 'milestone_checklist';
    v_title := case tg_op when 'INSERT' then 'Thêm Checklist Milestone' when 'DELETE' then 'Xóa Checklist Milestone' else 'Cập nhật Checklist Milestone' end;
  end if;

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, metadata)
  values ((v_row->>'project_id')::uuid, auth.uid(), 'planning_' || v_entity || '_' || lower(tg_op), v_entity, (v_row->>'id')::uuid, v_title, v_row->>'title', '/plan', jsonb_build_object('operation', lower(tg_op)));

  if tg_op = 'DELETE' then return old; end if;
  return new;
exception when others then
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists project_plan_tasks_activity_v170 on public.project_plan_tasks;
create trigger project_plan_tasks_activity_v170
after insert or update or delete on public.project_plan_tasks
for each row execute function public.capture_plan_execution_activity_v170();

drop trigger if exists project_milestone_checklist_activity_v170 on public.project_milestone_checklist_items;
create trigger project_milestone_checklist_activity_v170
after insert or update or delete on public.project_milestone_checklist_items
for each row execute function public.capture_plan_execution_activity_v170();

comment on table public.project_plan_tasks is 'V1.7.0 execution tasks linked to a project and optionally a project stage.';
comment on table public.project_milestone_checklist_items is 'V1.7.0 checklist items that define completion criteria for project milestones.';
