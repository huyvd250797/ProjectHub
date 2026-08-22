-- ASC WORKING V0.5.0 — Department Intelligence / Phòng ban
-- Server-side project aggregate. Includes a synthetic "Chưa xác định phòng ban"
-- bucket so project totals never hide ISSUE that have not been mapped yet.

create or replace function public.get_project_departments(p_project_id uuid)
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

  with department_stats as (
    select
      d.id,
      d.code,
      d.name,
      false as is_unassigned,
      d.is_active,
      count(i.id)::int as total,
      count(i.id) filter (where i.status_code = 'resolved')::int as resolved,
      count(i.id) filter (where i.status_code = 'released')::int as released,
      count(i.id) filter (where i.customer_status_code = 'handed_over')::int as handed_over,
      count(i.id) filter (where coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over')::int as not_handed_over,
      count(i.id) filter (
        where i.due_date < current_date
          and coalesce(i.status_code, '') not in ('resolved','released','no_action')
      )::int as overdue,
      count(i.id) filter (
        where i.due_date between current_date and current_date + 7
          and coalesce(i.status_code, '') not in ('resolved','released','no_action')
      )::int as near_due,
      count(i.id) filter (where i.assignee_person_id is null)::int as missing_assignee
    from public.departments d
    left join public.issues i
      on i.project_id = d.project_id
      and i.department_id = d.id
      and i.archived_at is null
    where d.project_id = p_project_id
      and d.is_active
    group by d.id, d.code, d.name, d.is_active

    union all

    select
      null::uuid as id,
      null::text as code,
      'Chưa xác định phòng ban'::text as name,
      true as is_unassigned,
      true as is_active,
      count(i.id)::int as total,
      count(i.id) filter (where i.status_code = 'resolved')::int as resolved,
      count(i.id) filter (where i.status_code = 'released')::int as released,
      count(i.id) filter (where i.customer_status_code = 'handed_over')::int as handed_over,
      count(i.id) filter (where coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over')::int as not_handed_over,
      count(i.id) filter (
        where i.due_date < current_date
          and coalesce(i.status_code, '') not in ('resolved','released','no_action')
      )::int as overdue,
      count(i.id) filter (
        where i.due_date between current_date and current_date + 7
          and coalesce(i.status_code, '') not in ('resolved','released','no_action')
      )::int as near_due,
      count(i.id) filter (where i.assignee_person_id is null)::int as missing_assignee
    from public.issues i
    where i.project_id = p_project_id
      and i.archived_at is null
      and i.department_id is null
    having count(i.id) > 0
  ),
  department_rows as (
    select
      ds.*,
      case
        when ds.total = 0 then 0
        else round(100.0 * ds.handed_over / ds.total)::int
      end as handover_progress,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', pe.id,
            'fullName', pe.full_name,
            'title', pe.title,
            'email', pe.email,
            'zalo', pe.zalo
          ) order by pe.full_name
        )
        from public.people pe
        where ds.id is not null
          and pe.project_id = p_project_id
          and pe.department_id = ds.id
          and pe.person_type = 'customer'
      ), '[]'::jsonb) as contacts,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'code', x.code,
            'name', x.name,
            'statusCode', x.module_status_code
          ) order by x.sort_order, x.name
        )
        from (
          select ci.id, ci.code, ci.name, ci.module_status_code, ci.sort_order
          from public.contract_items ci
          where ds.id is not null
            and ci.project_id = p_project_id
            and ci.item_type = 'module'
            and ci.owner_department_id = ds.id
          order by ci.sort_order, ci.name
          limit 30
        ) x
      ), '[]'::jsonb) as modules,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'content', x.content,
            'statusCode', x.status_code,
            'dueDate', x.due_date,
            'moduleName', x.module_name,
            'assigneeName', x.assignee_name,
            'isOverdue', x.is_overdue,
            'isNearDue', x.is_near_due
          ) order by x.sort_rank, x.due_date nulls last, x.id
        )
        from (
          select
            i.id,
            i.content,
            i.status_code,
            i.due_date,
            coalesce(ci.name, i.module_name_raw) as module_name,
            coalesce(pe.full_name, i.assignee_name_raw) as assignee_name,
            (i.due_date < current_date and coalesce(i.status_code, '') not in ('resolved','released','no_action')) as is_overdue,
            (i.due_date between current_date and current_date + 7 and coalesce(i.status_code, '') not in ('resolved','released','no_action')) as is_near_due,
            case
              when i.due_date < current_date and coalesce(i.status_code, '') not in ('resolved','released','no_action') then 1
              when i.due_date between current_date and current_date + 7 and coalesce(i.status_code, '') not in ('resolved','released','no_action') then 2
              when i.assignee_person_id is null then 3
              else 4
            end as sort_rank
          from public.issues i
          left join public.contract_items ci on ci.id = i.module_id
          left join public.people pe on pe.id = i.assignee_person_id
          where i.project_id = p_project_id
            and i.archived_at is null
            and (
              (ds.is_unassigned and i.department_id is null)
              or (not ds.is_unassigned and i.department_id = ds.id)
            )
            and (
              (i.due_date <= current_date + 7 and coalesce(i.status_code, '') not in ('resolved','released','no_action'))
              or i.assignee_person_id is null
            )
          order by sort_rank, i.due_date nulls last
          limit 8
        ) x
      ), '[]'::jsonb) as attention_issues
    from department_stats ds
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'departments', (select count(*) from public.departments d where d.project_id = p_project_id and d.is_active),
      'totalIssues', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null),
      'linkedIssues', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null and i.department_id is not null),
      'unassignedIssues', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null and i.department_id is null),
      'handedOver', (select count(*) from public.issues i where i.project_id = p_project_id and i.archived_at is null and i.customer_status_code = 'handed_over'),
      'overdue', (
        select count(*) from public.issues i
        where i.project_id = p_project_id
          and i.archived_at is null
          and i.due_date < current_date
          and coalesce(i.status_code, '') not in ('resolved','released','no_action')
      ),
      'contacts', (select count(*) from public.people pe where pe.project_id = p_project_id and pe.person_type = 'customer'),
      'modules', (select count(*) from public.contract_items ci where ci.project_id = p_project_id and ci.item_type = 'module')
    ),
    'departments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', case when dr.is_unassigned then '__unassigned__' else dr.id::text end,
          'code', dr.code,
          'name', dr.name,
          'isUnassigned', dr.is_unassigned,
          'isActive', dr.is_active,
          'total', dr.total,
          'resolved', dr.resolved,
          'released', dr.released,
          'handedOver', dr.handed_over,
          'notHandedOver', dr.not_handed_over,
          'overdue', dr.overdue,
          'nearDue', dr.near_due,
          'missingAssignee', dr.missing_assignee,
          'handoverProgress', dr.handover_progress,
          'contacts', dr.contacts,
          'modules', dr.modules,
          'attentionIssues', dr.attention_issues
        )
        order by dr.is_unassigned desc, dr.total desc, dr.name
      )
      from department_rows dr
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_project_departments(uuid) from public;
grant execute on function public.get_project_departments(uuid) to authenticated;
