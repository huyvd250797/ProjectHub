-- ASC WORKING V0.6.0 — ISSUE Core
-- Adds stable per-project ISSUE numbering, authorship metadata, richer profile visibility
-- for shared projects, and automatic ISSUE history tracking.

alter table public.issues add column if not exists issue_no integer;
alter table public.issues add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.issues add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- Backfill a stable issue number for existing records. This is idempotent: only rows
-- without an issue_no are assigned a number after the current per-project maximum.
with project_base as (
  select project_id, coalesce(max(issue_no), 0) as base_no
  from public.issues
  group by project_id
), ranked as (
  select
    i.id,
    i.project_id,
    row_number() over (
      partition by i.project_id
      order by coalesce(i.source_row, 2147483647), i.created_at, i.id
    ) as rn
  from public.issues i
  where i.issue_no is null
)
update public.issues i
set issue_no = pb.base_no + r.rn
from ranked r
join project_base pb on pb.project_id = r.project_id
where i.id = r.id;

create unique index if not exists issues_project_issue_no_uq
  on public.issues(project_id, issue_no)
  where issue_no is not null;

create index if not exists issues_project_priority_idx on public.issues(project_id, priority_code);
create index if not exists issues_project_stage_idx on public.issues(project_id, stage_code);
create index if not exists issues_project_archived_idx on public.issues(project_id, archived_at);

create or replace function public.set_issue_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_no integer;
begin
  if tg_op = 'INSERT' then
    if new.issue_no is null then
      -- Serialize numbering inside each project to avoid duplicate MAX()+1 races.
      perform pg_advisory_xact_lock(hashtext(new.project_id::text));
      select coalesce(max(i.issue_no), 0) + 1
      into next_no
      from public.issues i
      where i.project_id = new.project_id;
      new.issue_no := next_no;
    end if;

    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    if new.updated_by is null then
      new.updated_by := auth.uid();
    end if;
  else
    if new.project_id is distinct from old.project_id then
      raise exception 'Moving an ISSUE between projects is not allowed';
    end if;
    new.issue_no := old.issue_no;
    new.created_by := old.created_by;
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists issues_audit_fields on public.issues;
create trigger issues_audit_fields
before insert or update on public.issues
for each row execute function public.set_issue_audit_fields();

create or replace function public.log_issue_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  archive_old text;
  archive_new text;
begin
  if tg_op = 'INSERT' then
    insert into public.issue_history(project_id, issue_id, changed_by, field_name, old_value, new_value)
    values (new.project_id, new.id, actor, 'created', null, 'ISSUE created');
    return new;
  end if;

  if new.content is distinct from old.content then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'content', old.content, new.content, now());
  end if;
  if new.status_code is distinct from old.status_code then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'status_code', old.status_code, new.status_code, now());
  end if;
  if new.customer_status_code is distinct from old.customer_status_code then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'customer_status_code', old.customer_status_code, new.customer_status_code, now());
  end if;
  if new.priority_code is distinct from old.priority_code then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'priority_code', old.priority_code, new.priority_code, now());
  end if;
  if new.stage_code is distinct from old.stage_code then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'stage_code', old.stage_code, new.stage_code, now());
  end if;
  if new.jira_url is distinct from old.jira_url then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'jira_url', old.jira_url, new.jira_url, now());
  end if;
  if new.release_date is distinct from old.release_date then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'release_date', old.release_date::text, new.release_date::text, now());
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'due_date', old.due_date::text, new.due_date::text, now());
  end if;
  if new.module_id is distinct from old.module_id then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'module_id', old.module_id::text, new.module_id::text, now());
  end if;
  if new.response is distinct from old.response then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'response', old.response, new.response, now());
  end if;
  if new.department_id is distinct from old.department_id then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'department_id', old.department_id::text, new.department_id::text, now());
  end if;
  if new.requester_person_id is distinct from old.requester_person_id then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'requester_person_id', old.requester_person_id::text, new.requester_person_id::text, now());
  end if;
  if new.assignee_person_id is distinct from old.assignee_person_id then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'assignee_person_id', old.assignee_person_id::text, new.assignee_person_id::text, now());
  end if;
  if new.notes is distinct from old.notes then
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'notes', old.notes, new.notes, now());
  end if;
  if new.archived_at is distinct from old.archived_at then
    archive_old := case when old.archived_at is null then 'active' else 'archived' end;
    archive_new := case when new.archived_at is null then 'active' else 'archived' end;
    insert into public.issue_history values (gen_random_uuid(), new.project_id, new.id, actor, 'lifecycle', archive_old, archive_new, now());
  end if;

  return new;
end;
$$;

drop trigger if exists issue_history_tracker on public.issues;
create trigger issue_history_tracker
after insert or update on public.issues
for each row execute function public.log_issue_history();

-- Project members can see basic profile information for teammates in the same project,
-- allowing history to display who changed an ISSUE. Existing self policy remains valid.
create or replace function public.shares_project_with_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members me
    join public.project_members them on them.project_id = me.project_id
    where me.user_id = auth.uid()
      and them.user_id = p_profile_id
  );
$$;

drop policy if exists "profiles_select_shared_project" on public.profiles;
create policy "profiles_select_shared_project"
on public.profiles for select
using (public.shares_project_with_profile(id));

-- Ensure issue history inserts performed by the trigger remain valid for project workers.
-- The existing policy is retained; this statement is only documentation for V0.6.0.

comment on column public.issues.issue_no is 'Human-friendly sequential number scoped to each project.';
comment on function public.log_issue_history() is 'Tracks V0.6.0 ISSUE Core field changes using auth.uid() as actor.';
