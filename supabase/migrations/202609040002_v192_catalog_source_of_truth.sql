-- ASC WORKING V1.9.2 — Catalog Source of Truth
-- Fixes PLHĐ catalog consistency:
-- - contract_items is the source of truth for root/subsystem/module PLHĐ rows.
-- - contract_detail_items is the source of truth for PLHĐ detail rows.
-- - Legacy contract_items.item_type = 'other' rows are migrated into details.

with recursive ancestors as (
  select
    other.id as other_id,
    parent.id as ancestor_id,
    parent.parent_id,
    parent.item_type,
    1 as depth
  from public.contract_items other
  left join public.contract_items parent
    on parent.id = other.parent_id
   and parent.project_id = other.project_id
  where other.item_type = 'other'

  union all

  select
    ancestors.other_id,
    parent.id as ancestor_id,
    parent.parent_id,
    parent.item_type,
    ancestors.depth + 1 as depth
  from ancestors
  join public.contract_items parent
    on parent.id = ancestors.parent_id
  where ancestors.depth < 20
),
nearest_module as (
  select distinct on (other_id)
    other_id,
    ancestor_id as module_id
  from ancestors
  where item_type = 'module'
  order by other_id, depth
),
legacy_other as (
  select
    other.*,
    nearest_module.module_id
  from public.contract_items other
  left join nearest_module on nearest_module.other_id = other.id
  where other.item_type = 'other'
),
inserted_details as (
  insert into public.contract_detail_items(
    project_id,
    import_key,
    parent_id,
    contract_item_id,
    code,
    content,
    node_type,
    level,
    sort_order,
    source_row,
    note,
    created_at,
    updated_at
  )
  select
    project_id,
    import_key,
    null,
    module_id,
    code,
    name,
    'other',
    3,
    sort_order,
    source_row,
    classification,
    created_at,
    now()
  from legacy_other
  where not exists (
    select 1
    from public.contract_detail_items detail
    where detail.project_id = legacy_other.project_id
      and (
        detail.import_key = legacy_other.import_key
        or (
          coalesce(detail.code, '') = coalesce(legacy_other.code, '')
          and lower(btrim(detail.content)) = lower(btrim(legacy_other.name))
        )
      )
  )
  returning id
)
update public.contract_items child
set parent_id = parent.parent_id,
    updated_at = now()
from public.contract_items parent
where child.parent_id = parent.id
  and parent.item_type = 'other';

delete from public.contract_items
where item_type = 'other';

create or replace function public.get_project_contract(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_project_member(p_project_id) then
    raise exception 'Not authorized for project %', p_project_id using errcode = '42501';
  end if;

  with recursive contract_tree as (
    select ci.id as ancestor_id, ci.id as descendant_id
    from public.contract_items ci
    where ci.project_id = p_project_id
      and ci.item_type in ('root','subsystem','module')

    union all

    select tree.ancestor_id, child.id as descendant_id
    from contract_tree tree
    join public.contract_items child
      on child.parent_id = tree.descendant_id
     and child.project_id = p_project_id
     and child.item_type in ('root','subsystem','module')
  ),
  issue_stats as (
    select
      tree.ancestor_id,
      count(i.id)::int as issue_total,
      count(i.id) filter (where i.customer_status_code = 'handed_over')::int as handed_over,
      count(i.id) filter (where coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over')::int as remaining,
      case when count(i.id) = 0 then 0
        else round(100.0 * count(i.id) filter (where i.customer_status_code = 'handed_over') / count(i.id))::int
      end as progress
    from contract_tree tree
    left join public.issues i
      on i.project_id = p_project_id
     and i.module_id = tree.descendant_id
     and i.archived_at is null
    group by tree.ancestor_id
  ),
  detail_stats as (
    select tree.ancestor_id, count(cdi.id)::int as detail_count
    from contract_tree tree
    left join public.contract_detail_items cdi
      on cdi.project_id = p_project_id
     and cdi.contract_item_id = tree.descendant_id
    group by tree.ancestor_id
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'items', (select count(*) from public.contract_items ci where ci.project_id = p_project_id and ci.item_type in ('root','subsystem','module')),
      'modules', (select count(*) from public.contract_items ci where ci.project_id = p_project_id and ci.item_type = 'module'),
      'subsystems', (select count(*) from public.contract_items ci where ci.project_id = p_project_id and ci.item_type = 'subsystem'),
      'details', (select count(*) from public.contract_detail_items cdi where cdi.project_id = p_project_id),
      'issues', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null),
      'handedOver', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null and i.customer_status_code = 'handed_over'),
      'remaining', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null and coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over'),
      'handoverProgress', (
        select case when count(*) = 0 then 0
          else round(100.0 * count(*) filter (where i.customer_status_code = 'handed_over') / count(*))::int
        end
        from public.issues i
        where i.project_id = p_project_id and i.archived_at is null
      ),
      'unmappedDetails', (select count(*) from public.contract_detail_items cdi where cdi.project_id = p_project_id and cdi.contract_item_id is null)
    ),
    'overview', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'parentId', ci.parent_id,
          'code', coalesce(ci.code, ''),
          'name', ci.name,
          'itemType', ci.item_type,
          'ownerDepartmentId', ci.owner_department_id,
          'ownerDepartmentName', d.name,
          'moduleStatusCode', ci.module_status_code,
          'moduleStatusLabel', coalesce(status_label.label, ci.module_status_code),
          'classification', ci.classification,
          'sortOrder', ci.sort_order,
          'issueTotal', coalesce(stats.issue_total, 0),
          'handedOver', coalesce(stats.handed_over, 0),
          'remaining', coalesce(stats.remaining, 0),
          'progress', coalesce(stats.progress, 0),
          'detailCount', coalesce(ds.detail_count, 0)
        ) order by ci.sort_order, ci.code, ci.name
      )
      from public.contract_items ci
      left join public.departments d on d.id = ci.owner_department_id
      left join issue_stats stats on stats.ancestor_id = ci.id
      left join detail_stats ds on ds.ancestor_id = ci.id
      left join lateral (
        select sc.label
        from public.status_catalog sc
        where sc.category = 'module_status'
          and sc.code = ci.module_status_code
          and sc.is_active
          and (sc.project_id is null or sc.project_id = ci.project_id)
        order by (sc.project_id = ci.project_id) desc, sc.sort_order
        limit 1
      ) status_label on true
      where ci.project_id = p_project_id
        and ci.item_type in ('root','subsystem','module')
    ), '[]'::jsonb),
    'details', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cdi.id,
          'parentId', cdi.parent_id,
          'contractItemId', cdi.contract_item_id,
          'code', coalesce(cdi.code, ''),
          'content', cdi.content,
          'nodeType', cdi.node_type,
          'level', cdi.level,
          'sortOrder', cdi.sort_order,
          'note', cdi.note,
          'hasChildren', exists(
            select 1
            from public.contract_detail_items child
            where child.project_id = cdi.project_id
              and child.parent_id = cdi.id
          )
        )
        order by cdi.sort_order, cdi.source_row, cdi.code, cdi.id
      )
      from public.contract_detail_items cdi
      where cdi.project_id = p_project_id
    ), '[]'::jsonb),
    'filters', jsonb_build_object(
      'departments', coalesce((
        select jsonb_agg(jsonb_build_object('value', d.id, 'label', d.name) order by d.name)
        from public.departments d
        where d.project_id = p_project_id and d.is_active
      ), '[]'::jsonb),
      'moduleStatuses', coalesce((
        select jsonb_agg(jsonb_build_object('value', x.code, 'label', x.label) order by x.sort_order, x.label)
        from (
          select distinct on (sc.code)
            sc.code,
            sc.label,
            sc.sort_order,
            case when sc.project_id = p_project_id then 0 else 1 end as scope_order
          from public.status_catalog sc
          where sc.category = 'module_status'
            and sc.is_active
            and (sc.project_id is null or sc.project_id = p_project_id)
          order by sc.code, scope_order, sc.sort_order
        ) x
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_project_contract(uuid) from public;
grant execute on function public.get_project_contract(uuid) to authenticated;

comment on function public.get_project_contract(uuid) is
  'V1.9.2 keeps PLHD overview sourced from contract_items root/subsystem/module only; details live in contract_detail_items.';
