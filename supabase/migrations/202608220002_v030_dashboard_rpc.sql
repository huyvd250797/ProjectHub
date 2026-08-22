-- ASC WORKING V0.3.0 — Dashboard / Real Project Data
-- One server-side aggregate per selected project. The function checks membership
-- before reading project-scoped data and returns only dashboard-safe fields.

create or replace function public.get_project_dashboard(p_project_id uuid)
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

  select jsonb_build_object(
    'project', jsonb_build_object(
      'id', p.id,
      'code', p.code,
      'slug', p.slug,
      'name', p.name,
      'organizationName', coalesce(p.organization_name, ''),
      'contractNo', p.contract_no,
      'contractValue', p.contract_value,
      'contractDate', p.contract_date,
      'startDate', p.start_date,
      'dueDate', p.due_date,
      'status', p.status
    ),
    'summary', jsonb_build_object(
      'totalIssues', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null),
      'modules', (select count(*) from public.contract_items ci where ci.project_id = p.id and ci.item_type = 'module'),
      'subsystems', (select count(*) from public.contract_items ci where ci.project_id = p.id and ci.item_type = 'subsystem'),
      'departments', (select count(*) from public.departments d where d.project_id = p.id and d.is_active),
      'contractDetails', (select count(*) from public.contract_detail_items cdi where cdi.project_id = p.id)
    ),
    'issueKpis', jsonb_build_object(
      'waitingCustomer', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.status_code = 'waiting_customer'),
      'waiting', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.status_code = 'waiting'),
      'processing', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.status_code = 'processing'),
      'resolved', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.status_code = 'resolved'),
      'released', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.status_code = 'released'),
      'handedOver', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.customer_status_code = 'handed_over'),
      'notHandedOver', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over'),
      'overdue', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.due_date < current_date and coalesce(i.status_code, '') not in ('resolved','released','no_action'))
    ),
    'attention', jsonb_build_object(
      'overdue', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.due_date < current_date and coalesce(i.status_code, '') not in ('resolved','released','no_action')),
      'missingAssignee', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.assignee_person_id is null),
      'missingModule', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.module_id is null),
      'missingDepartment', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.department_id is null),
      'nearDue', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.due_date between current_date and current_date + 7 and coalesce(i.status_code, '') not in ('resolved','released','no_action'))
    ),
    'contract', jsonb_build_object(
      'handedOver', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and i.customer_status_code = 'handed_over'),
      'remaining', (select count(*) from public.issues i where i.project_id = p.id and i.archived_at is null and coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over'),
      'handoverProgress', (
        select case when count(*) = 0 then 0
          else round(100.0 * count(*) filter (where i.customer_status_code = 'handed_over') / count(*))::int
        end
        from public.issues i where i.project_id = p.id and i.archived_at is null
      )
    ),
    'schedule', jsonb_build_object(
      'durationDays', case when p.start_date is null or p.due_date is null then null else greatest((p.due_date - p.start_date) + 1, 1) end,
      'elapsedDays', case when p.start_date is null or p.due_date is null then null else greatest(least((current_date - p.start_date) + 1, (p.due_date - p.start_date) + 1), 0) end,
      'remainingDays', case when p.due_date is null then null else greatest(p.due_date - current_date, 0) end,
      'timeProgress', case
        when p.start_date is null or p.due_date is null then null
        when current_date <= p.start_date then 0
        when current_date >= p.due_date then 100
        else round(100.0 * (current_date - p.start_date) / greatest(p.due_date - p.start_date, 1))::int
      end,
      'health', case
        when p.due_date is null then 'not_scheduled'
        when current_date > p.due_date and p.status not in ('completed','archived') then 'overdue'
        when current_date >= p.due_date - 14 and p.status not in ('completed','archived') then 'near_deadline'
        else 'on_track'
      end
    ),
    'stages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'code', s.code,
          'name', s.name,
          'startDate', s.start_date,
          'endDate', s.end_date,
          'status', s.status,
          'progress', case
            when lower(coalesce(s.status, '')) in ('completed','done','hoàn tất','hoan tat') then 100
            when s.start_date is null or s.end_date is null then 0
            when current_date <= s.start_date then 0
            when current_date >= s.end_date then 100
            else round(100.0 * (current_date - s.start_date) / greatest(s.end_date - s.start_date, 1))::int
          end
        ) order by s.sort_order, s.code
      )
      from public.project_stages s where s.project_id = p.id
    ), '[]'::jsonb),
    'departments', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.total desc, x.name)
      from (
        select
          d.id,
          d.name,
          count(i.id)::int as total,
          count(i.id) filter (where i.status_code in ('resolved','released'))::int as done,
          count(i.id) filter (where i.customer_status_code = 'handed_over')::int as "handedOver",
          count(i.id) filter (where coalesce(i.customer_status_code, 'not_handed_over') <> 'handed_over')::int as remaining,
          case when count(i.id) = 0 then 0 else round(100.0 * count(i.id) filter (where i.customer_status_code = 'handed_over') / count(i.id))::int end as progress
        from public.departments d
        left join public.issues i on i.project_id = d.project_id and i.department_id = d.id and i.archived_at is null
        where d.project_id = p.id and d.is_active
        group by d.id, d.name
        order by count(i.id) desc, d.name
        limit 6
      ) x
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.assigned desc, x.name)
      from (
        select
          pe.id,
          pe.full_name as name,
          count(i.id)::int as assigned,
          count(i.id) filter (where i.status_code in ('resolved','released'))::int as completed,
          count(i.id) filter (where coalesce(i.status_code, '') not in ('resolved','released','no_action'))::int as remaining,
          case when count(i.id) = 0 then 0 else round(100.0 * count(i.id) filter (where i.status_code in ('resolved','released')) / count(i.id))::int end as progress
        from public.people pe
        left join public.issues i on i.project_id = pe.project_id and i.assignee_person_id = pe.id and i.archived_at is null
        where pe.project_id = p.id and pe.person_type = 'asc'
        group by pe.id, pe.full_name
        order by count(i.id) desc, pe.full_name
        limit 6
      ) x
    ), '[]'::jsonb)
  ) into v_result
  from public.projects p
  where p.id = p_project_id;

  if v_result is null then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_project_dashboard(uuid) from public;
grant execute on function public.get_project_dashboard(uuid) to authenticated;
