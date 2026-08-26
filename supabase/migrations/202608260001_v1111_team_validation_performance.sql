-- ASC WORKING V1.1.1 — Issue Validation / Flexible Project Team / Performance Tune

-- 1) Project Team members may exist before they have a login account.
alter table public.people
  add column if not exists is_active boolean not null default true;

update public.people set is_active = true where is_active is null;

create index if not exists people_project_team_active_idx
  on public.people(project_id, person_type, is_active, full_name);

create index if not exists people_project_active_user_idx
  on public.people(project_id, user_id)
  where is_active = true and user_id is not null;

comment on column public.people.is_active is
  'V1.1.1: Project Team member can be deactivated without deleting historical ISSUE assignee references.';

-- 2) Collapse multiple ISSUE summary count requests into one server-side aggregate scan.
create or replace function public.get_issue_summary_v1111(
  p_project_id uuid,
  p_person_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*)::int,
    'notHandedOver', count(*) filter (where coalesce(customer_status_code, 'not_handed_over') <> 'handed_over')::int,
    'mine', count(*) filter (where p_person_id is not null and assignee_person_id = p_person_id)::int,
    'overdue', count(*) filter (where due_date < current_date)::int,
    'waiting', count(*) filter (where status_code = 'waiting')::int,
    'missingAssignee', count(*) filter (where assignee_person_id is null)::int
  )
  from public.issues
  where project_id = p_project_id
    and archived_at is null;
$$;

grant execute on function public.get_issue_summary_v1111(uuid, uuid) to authenticated;

-- 3) Search indexes for frequently used ISSUE / Project Team keyword searches.
create extension if not exists pg_trgm;

create index if not exists issues_content_trgm_idx
  on public.issues using gin (content gin_trgm_ops)
  where archived_at is null;

create index if not exists issues_jira_trgm_idx
  on public.issues using gin (jira_url gin_trgm_ops)
  where archived_at is null and jira_url is not null;

create index if not exists people_full_name_trgm_idx
  on public.people using gin (full_name gin_trgm_ops)
  where is_active = true;

analyze public.issues;
analyze public.people;

-- 4) Collapse ISSUE lookup catalogs into one RPC instead of multiple PostgREST requests.
create or replace function public.get_issue_lookups_v1111(p_project_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with catalog_dedup as (
  select distinct on (category, code)
    category, code, label, sort_order
  from public.status_catalog
  where is_active = true
    and category in ('issue_status','customer_status','priority')
    and (project_id is null or project_id = p_project_id)
  order by category, code, (project_id is not null) desc, sort_order
)
select jsonb_build_object(
  'statuses', coalesce((
    select jsonb_agg(jsonb_build_object('value', code, 'label', label) order by sort_order, label)
    from catalog_dedup where category = 'issue_status'
  ), '[]'::jsonb),
  'customerStatuses', coalesce((
    select jsonb_agg(jsonb_build_object('value', code, 'label', label) order by sort_order, label)
    from catalog_dedup where category = 'customer_status'
  ), '[]'::jsonb),
  'priorities', coalesce((
    select jsonb_agg(jsonb_build_object('value', code, 'label', label) order by sort_order, label)
    from catalog_dedup where category = 'priority'
  ), '[]'::jsonb),
  'stages', coalesce((
    select jsonb_agg(jsonb_build_object('value', code, 'label', name, 'description', code) order by sort_order, name)
    from public.project_stages where project_id = p_project_id
  ), '[]'::jsonb),
  'modules', coalesce((
    select jsonb_agg(jsonb_build_object('value', id::text, 'label', name, 'description', code) order by sort_order, name)
    from public.contract_items where project_id = p_project_id and item_type = 'module'
  ), '[]'::jsonb),
  'departments', coalesce((
    select jsonb_agg(jsonb_build_object('value', id::text, 'label', name, 'description', code) order by name)
    from public.departments where project_id = p_project_id and is_active = true
  ), '[]'::jsonb),
  'assignees', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'value', id::text,
        'label', full_name,
        'description', concat_ws(' • ', nullif(email,''), upper(coalesce(project_role,'member')), case when user_id is null then 'Chưa có tài khoản' else 'Đã có tài khoản' end)
      ) order by full_name
    )
    from public.people where project_id = p_project_id and person_type = 'asc' and is_active = true
  ), '[]'::jsonb),
  'requesters', coalesce((
    select jsonb_agg(jsonb_build_object('value', id::text, 'label', full_name, 'description', title) order by full_name)
    from public.people where project_id = p_project_id and person_type = 'customer' and is_active = true
  ), '[]'::jsonb)
);
$$;

grant execute on function public.get_issue_lookups_v1111(uuid) to authenticated;
