-- ASC WORKING V0.4.0 — PLHĐ Unified View
-- Project-scoped contract overview + detail tree.
-- Uses recursive contract ancestry so subsystem KPI includes descendant modules.

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

    union all

    select tree.ancestor_id, child.id as descendant_id
    from contract_tree tree
    join public.contract_items child
      on child.parent_id = tree.descendant_id
     and child.project_id = p_project_id
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
      'items', (select count(*) from public.contract_items ci where ci.project_id = p_project_id),
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
