-- ASC WORKING V3.5.0 - Due Date Notification Automation
-- Creates due-date notifications for the current user across ISSUE, Plan Task
-- and Milestone when due date is 3 days away, 1 day away, today, or overdue.

create or replace function public.sync_due_date_notifications_v350(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_inserted integer := 0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.is_project_member(p_project_id) then raise exception 'Project access denied'; end if;
  if not public.notification_enabled_v110(v_user, p_project_id, 'due_reminder') then return 0; end if;

  with due_items as (
    select
      i.project_id,
      pe.user_id,
      'issue'::text as entity_type,
      i.id as entity_id,
      i.due_date,
      format('ISSUE #%s', coalesce(i.issue_no::text, '—')) as entity_label,
      left(coalesce(i.content, ''), 180) as summary,
      '/issues?issueId=' || i.id::text as href
    from public.issues i
    join public.people pe on pe.id = i.assignee_person_id and pe.user_id = v_user
    where i.project_id = p_project_id
      and i.archived_at is null
      and i.due_date is not null
      and coalesce(i.status_code, '') not in ('resolved','released','no_action','not_feasible')

    union all

    select
      task.project_id,
      pe.user_id,
      'plan_task'::text as entity_type,
      task.id as entity_id,
      task.due_date,
      'Task'::text as entity_label,
      left(coalesce(task.title, ''), 180) as summary,
      '/plan?taskId=' || task.id::text as href
    from public.project_plan_tasks task
    join public.people pe on pe.id = task.owner_person_id and pe.user_id = v_user
    where task.project_id = p_project_id
      and task.due_date is not null
      and coalesce(task.status, '') <> 'done'

    union all

    select
      milestone.project_id,
      pe.user_id,
      'milestone'::text as entity_type,
      milestone.id as entity_id,
      milestone.due_date,
      'Milestone'::text as entity_label,
      left(coalesce(milestone.title, ''), 180) as summary,
      '/plan?milestoneId=' || milestone.id::text as href
    from public.project_milestones milestone
    join public.people pe on pe.id = milestone.owner_person_id and pe.user_id = v_user
    where milestone.project_id = p_project_id
      and milestone.due_date is not null
      and coalesce(milestone.status, '') <> 'completed'
  ),
  due_alerts as (
    select
      item.*,
      case
        when item.due_date < current_date then 'overdue'
        when item.due_date = current_date then 'today'
        when item.due_date = current_date + 1 then '1d'
        when item.due_date = current_date + 3 then '3d'
        else null
      end as alert_window,
      case
        when item.due_date < current_date then item.entity_label || ' đã quá hạn'
        when item.due_date = current_date then item.entity_label || ' đến hạn hôm nay'
        when item.due_date = current_date + 1 then item.entity_label || ' sẽ đến hạn ngày mai'
        when item.due_date = current_date + 3 then item.entity_label || ' còn 3 ngày đến hạn'
        else item.entity_label || ' sắp đến hạn'
      end as alert_title
    from due_items item
    where item.due_date < current_date
       or item.due_date in (current_date, current_date + 1, current_date + 3)
  )
  insert into public.notifications(project_id, user_id, category, notification_key, title, summary, href, created_at)
  select
    alert.project_id,
    v_user,
    'due_reminder',
    'due-v350:' || alert.entity_type || ':' || alert.entity_id::text || ':' || alert.alert_window || ':' || alert.due_date::text,
    alert.alert_title,
    alert.summary,
    alert.href,
    now()
  from due_alerts alert
  where alert.alert_window is not null
  on conflict (user_id, notification_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Keep the legacy RPC name used by older UI/API code, but route it through V3.5.0.
create or replace function public.sync_issue_due_notifications_v110(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.sync_due_date_notifications_v350(p_project_id);
end;
$$;

comment on function public.sync_due_date_notifications_v350(uuid)
is 'V3.5.0 due-date notification sync for current user across ISSUE, Plan Task and Milestone at 3d/1d/today/overdue windows.';
