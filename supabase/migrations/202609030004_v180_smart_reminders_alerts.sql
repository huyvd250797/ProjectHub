-- ASC WORKING V1.8.0 — Smart Reminders & Alerts
-- Run after 202609030003_v170_plan_execution_tracking.sql.
-- Adds project plan reminders and notification sync for due alerts.

create table if not exists public.project_plan_reminders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  entity_type text not null default 'manual' check (entity_type in ('manual','stage','milestone','task','issue')),
  entity_id uuid,
  entity_title text,
  remind_at timestamptz not null,
  status text not null default 'open' check (status in ('open','snoozed','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  snoozed_until timestamptz,
  completed_at timestamptz,
  owner_person_id uuid constraint project_plan_reminders_owner_person_id_fkey references public.people(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_plan_reminders_project_due_v180_idx
  on public.project_plan_reminders(project_id, status, remind_at);
create index if not exists project_plan_reminders_owner_v180_idx
  on public.project_plan_reminders(project_id, owner_person_id, status) where owner_person_id is not null;
create index if not exists project_plan_reminders_entity_v180_idx
  on public.project_plan_reminders(project_id, entity_type, entity_id) where entity_id is not null;

drop trigger if exists project_plan_reminders_set_updated_at on public.project_plan_reminders;
create trigger project_plan_reminders_set_updated_at
before update on public.project_plan_reminders
for each row execute function public.set_updated_at();

create or replace function public.validate_project_plan_reminder_v180()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_title text;
begin
  if length(trim(coalesce(new.title, ''))) < 2 or length(trim(new.title)) > 180 then
    raise exception 'Plan reminder title must be 2-180 characters' using errcode='23514';
  end if;

  if new.entity_type = 'manual' then
    new.entity_id := null;
    new.entity_title := null;
  elsif new.entity_id is null then
    raise exception 'Plan reminder entity_id is required for linked reminders' using errcode='23514';
  elsif new.entity_type = 'stage' then
    select stage.name into v_title
    from public.project_stages stage
    where stage.id = new.entity_id and stage.project_id = new.project_id;
    if v_title is null then raise exception 'Reminder stage must belong to the same project' using errcode='23514'; end if;
    new.entity_title := v_title;
  elsif new.entity_type = 'milestone' then
    select milestone.title into v_title
    from public.project_milestones milestone
    where milestone.id = new.entity_id and milestone.project_id = new.project_id;
    if v_title is null then raise exception 'Reminder milestone must belong to the same project' using errcode='23514'; end if;
    new.entity_title := v_title;
  elsif new.entity_type = 'task' then
    select task.title into v_title
    from public.project_plan_tasks task
    where task.id = new.entity_id and task.project_id = new.project_id;
    if v_title is null then raise exception 'Reminder task must belong to the same project' using errcode='23514'; end if;
    new.entity_title := v_title;
  elsif new.entity_type = 'issue' then
    select format('ISSUE #%s — %s', coalesce(issue.issue_no::text, '—'), left(coalesce(issue.content, ''), 120)) into v_title
    from public.issues issue
    where issue.id = new.entity_id and issue.project_id = new.project_id and issue.archived_at is null;
    if v_title is null then raise exception 'Reminder issue must belong to the same project' using errcode='23514'; end if;
    new.entity_title := v_title;
  end if;

  if new.owner_person_id is not null and not exists (
    select 1 from public.people person
    where person.id = new.owner_person_id
      and person.project_id = new.project_id
      and person.person_type = 'asc'
      and person.is_active = true
  ) then
    raise exception 'Reminder owner must be an active ASC person in the same project' using errcode='23514';
  end if;

  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
    new.snoozed_until := null;
  else
    new.completed_at := null;
  end if;

  if new.status = 'snoozed' and new.snoozed_until is null then
    raise exception 'Snoozed reminder requires snoozed_until' using errcode='23514';
  end if;
  if new.status <> 'snoozed' then
    new.snoozed_until := null;
  end if;

  return new;
end;
$$;

drop trigger if exists project_plan_reminders_validate_v180 on public.project_plan_reminders;
create trigger project_plan_reminders_validate_v180
before insert or update on public.project_plan_reminders
for each row execute function public.validate_project_plan_reminder_v180();

alter table public.project_plan_reminders enable row level security;

drop policy if exists "project_plan_reminders_select_member_v180" on public.project_plan_reminders;
create policy "project_plan_reminders_select_member_v180"
on public.project_plan_reminders for select
using (public.is_project_member(project_id));

drop policy if exists "project_plan_reminders_write_pm_v180" on public.project_plan_reminders;
create policy "project_plan_reminders_write_pm_v180"
on public.project_plan_reminders for all
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

grant select, insert, update, delete on public.project_plan_reminders to authenticated;

create or replace function public.capture_plan_reminder_activity_v180()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_activity_id uuid;
  v_title text;
  v_target uuid;
  v_due date;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_title := case tg_op when 'INSERT' then 'Thêm Plan Reminder' when 'DELETE' then 'Xóa Plan Reminder' else 'Cập nhật Plan Reminder' end;

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, metadata)
  values (
    (v_row->>'project_id')::uuid,
    auth.uid(),
    'planning_reminder_' || lower(tg_op),
    'plan_reminder',
    (v_row->>'id')::uuid,
    v_title,
    v_row->>'title',
    '/plan',
    jsonb_build_object('operation', lower(tg_op), 'status', v_row->>'status', 'priority', v_row->>'priority')
  )
  returning id into v_activity_id;

  if tg_op <> 'DELETE' and new.status in ('open','snoozed') then
    v_due := coalesce(new.snoozed_until, new.remind_at)::date;
    if v_due <= current_date + 7 then
      for v_target in
        select person.user_id
        from public.people person
        where person.id = new.owner_person_id and person.user_id is not null
        union
        select pm.user_id
        from public.project_members pm
        where new.owner_person_id is null and pm.project_id = new.project_id and pm.role in ('admin','pm')
        union
        select profile.id
        from public.profiles profile
        where new.owner_person_id is null and profile.global_role = 'master' and profile.is_active = true
      loop
        perform public.push_notification_v110(
          new.project_id,
          v_target,
          v_activity_id,
          'due_reminder',
          'plan_reminder:' || new.id::text || ':' || v_due::text || ':' || new.status,
          case
            when v_due < current_date then 'Plan Reminder đã quá hạn'
            when v_due = current_date then 'Plan Reminder đến hạn hôm nay'
            else 'Plan Reminder sắp đến hạn'
          end,
          left(coalesce(new.entity_title, new.description, new.title), 180),
          '/plan'
        );
      end loop;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
exception when others then
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists project_plan_reminders_activity_v180 on public.project_plan_reminders;
create trigger project_plan_reminders_activity_v180
after insert or update or delete on public.project_plan_reminders
for each row execute function public.capture_plan_reminder_activity_v180();

comment on table public.project_plan_reminders is 'V1.8.0 smart reminders for Master Plan, stages, milestones, tasks and linked issues.';
