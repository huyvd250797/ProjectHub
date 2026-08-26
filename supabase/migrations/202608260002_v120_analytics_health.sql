-- ASC WORKING V1.2.0 — Advanced Analytics & Project Health
-- Database-side project analytics plus expanded ISSUE page-size preferences.

-- V1.2.0 ISSUE grid sizes: 50 / 100 / 500 / 1000 / ALL (stored as 0).
update public.issue_user_preferences
set page_size = 50
where page_size not in (50,100,500,1000,0);

alter table public.issue_user_preferences
  drop constraint if exists issue_user_preferences_page_size_check;

alter table public.issue_user_preferences
  add constraint issue_user_preferences_page_size_check
  check (page_size in (0,50,100,500,1000));

create index if not exists issues_project_created_active_idx
  on public.issues(project_id, created_at desc)
  where archived_at is null;

create index if not exists issue_history_project_status_changed_idx
  on public.issue_history(project_id, field_name, changed_at desc)
  where field_name = 'status_code';

create or replace function public.get_project_analytics_v120(
  p_project_id uuid,
  p_from date default null,
  p_to date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from date;
  v_to date := coalesce(p_to, current_date);
  v_bucket text;
  v_step interval;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  if p_from is null then
    select coalesce(min(i.created_at::date), v_to - 89)
      into v_from
    from public.issues i
    where i.project_id = p_project_id
      and i.archived_at is null;
  else
    v_from := p_from;
  end if;

  if v_from > v_to then
    v_from := v_to;
  end if;

  if (v_to - v_from) > 180 then
    v_bucket := 'month';
    v_step := interval '1 month';
  else
    v_bucket := 'week';
    v_step := interval '1 week';
  end if;

  return (
    with
    project_row as (
      select p.id, p.code, p.start_date, p.due_date, p.status
      from public.projects p
      where p.id = p_project_id
    ),
    base as (
      select
        i.id, i.created_at, i.updated_at, i.status_code, i.customer_status_code,
        i.priority_code, i.due_date, i.module_id, i.department_id, i.assignee_person_id
      from public.issues i
      where i.project_id = p_project_id
        and i.archived_at is null
    ),
    resolution as (
      select
        i.id,
        i.created_at::date as created_date,
        coalesce(
          (min(h.changed_at) filter (
            where h.field_name = 'status_code'
              and h.new_value in ('resolved','released')
          ))::date,
          case when i.status_code in ('resolved','released') then i.updated_at::date end
        ) as resolved_date
      from base i
      left join public.issue_history h
        on h.issue_id = i.id
       and h.project_id = p_project_id
      group by i.id, i.created_at, i.updated_at, i.status_code
    ),
    metrics as (
      select
        count(*)::int as total,
        count(*) filter (where coalesce(status_code,'') not in ('resolved','released'))::int as open_count,
        count(*) filter (where status_code = 'resolved')::int as resolved_count,
        count(*) filter (where status_code = 'released')::int as released_count,
        count(*) filter (where customer_status_code = 'handed_over')::int as handed_over,
        count(*) filter (
          where due_date < current_date
            and coalesce(status_code,'') not in ('resolved','released')
        )::int as overdue,
        count(*) filter (
          where priority_code in ('A','B')
            and coalesce(status_code,'') not in ('resolved','released')
        )::int as high_priority_open,
        count(*) filter (where module_id is null)::int as missing_module,
        count(*) filter (where department_id is null)::int as missing_department,
        count(*) filter (where assignee_person_id is null)::int as missing_assignee,
        count(*) filter (
          where due_date between current_date and current_date + 7
            and coalesce(status_code,'') not in ('resolved','released')
        )::int as near_due,
        count(*) filter (where created_at::date between v_from and v_to)::int as created_in_range,
        coalesce(round(avg(greatest(current_date - created_at::date, 0)) filter (
          where coalesce(status_code,'') not in ('resolved','released')
        )),0)::int as avg_age_days
      from base
    ),
    resolution_metrics as (
      select
        count(*) filter (where resolved_date between v_from and v_to)::int as resolved_in_range,
        coalesce(round(avg(greatest(resolved_date - created_date, 0)) filter (where resolved_date is not null)),0)::int as avg_resolution_days
      from resolution
    ),
    score_parts as (
      select
        m.*,
        rm.resolved_in_range,
        rm.avg_resolution_days,
        case when m.total = 0 then 0 else round(100.0 * (m.resolved_count + m.released_count) / m.total)::int end as issue_score,
        case when m.total = 0 then 0 else round(100.0 * m.handed_over / m.total)::int end as delivery_score,
        case when m.open_count = 0 then 100 else greatest(0, round(100.0 - (100.0 * m.overdue / m.open_count)))::int end as overdue_score,
        case when m.total = 0 then 100 else greatest(0, round(100.0 - (100.0 * (m.missing_module + m.missing_department + m.missing_assignee) / (m.total * 3.0))))::int end as data_quality_score
      from metrics m
      cross join resolution_metrics rm
    ),
    scores as (
      select
        s.*,
        case
          when s.total = 0 then 0
          when p.start_date is null or p.due_date is null or p.due_date <= p.start_date then 70
          when current_date > p.due_date and p.status = 'active' then 20
          else greatest(0, least(100,
            round(100.0 - greatest(
              0,
              least(100.0, greatest(0.0, 100.0 * (current_date - p.start_date) / nullif((p.due_date - p.start_date)::numeric,0)))
              - s.issue_score
            ))
          ))::int
        end as schedule_score
      from score_parts s
      cross join project_row p
    ),
    final_score as (
      select
        s.*,
        case when s.total = 0 then 0 else round(
          s.issue_score * 0.25
          + s.delivery_score * 0.25
          + s.overdue_score * 0.20
          + s.data_quality_score * 0.10
          + s.schedule_score * 0.20
        )::int end as health_score
      from scores s
    ),
    aging as (
      select code, label, value,
        case when m.open_count = 0 then 0 else round(100.0 * value / m.open_count)::int end as percent
      from metrics m
      cross join lateral (
        values
          ('lt7','< 7 ngày', (select count(*)::int from base where coalesce(status_code,'') not in ('resolved','released') and current_date - created_at::date < 7)),
          ('7_14','7–14 ngày', (select count(*)::int from base where coalesce(status_code,'') not in ('resolved','released') and current_date - created_at::date between 7 and 14)),
          ('15_30','15–30 ngày', (select count(*)::int from base where coalesce(status_code,'') not in ('resolved','released') and current_date - created_at::date between 15 and 30)),
          ('gt30','> 30 ngày', (select count(*)::int from base where coalesce(status_code,'') not in ('resolved','released') and current_date - created_at::date > 30))
      ) as v(code,label,value)
    ),
    status_distribution as (
      select
        coalesce(b.status_code,'unassigned') as code,
        coalesce(sc.label, case when b.status_code is null then 'Chưa trạng thái' else b.status_code end) as label,
        count(*)::int as value,
        case when m.total = 0 then 0 else round(100.0 * count(*) / m.total)::int end as percent
      from base b
      cross join metrics m
      left join lateral (
        select label
        from public.status_catalog c
        where c.category = 'issue_status'
          and c.code = b.status_code
          and (c.project_id = p_project_id or c.project_id is null)
          and c.is_active = true
        order by (c.project_id = p_project_id) desc
        limit 1
      ) sc on true
      group by b.status_code, sc.label, m.total
      order by value desc
    ),
    priority_distribution as (
      select
        coalesce(b.priority_code,'unassigned') as code,
        coalesce(sc.label, case when b.priority_code is null then 'Chưa ưu tiên' else b.priority_code end) as label,
        count(*)::int as value,
        case when m.total = 0 then 0 else round(100.0 * count(*) / m.total)::int end as percent
      from base b
      cross join metrics m
      left join lateral (
        select label
        from public.status_catalog c
        where c.category = 'priority'
          and c.code = b.priority_code
          and (c.project_id = p_project_id or c.project_id is null)
          and c.is_active = true
        order by (c.project_id = p_project_id) desc
        limit 1
      ) sc on true
      group by b.priority_code, sc.label, m.total
      order by value desc
    ),
    buckets as (
      select gs::date as bucket_start
      from generate_series(
        date_trunc(v_bucket, v_from::timestamp),
        date_trunc(v_bucket, v_to::timestamp),
        v_step
      ) gs
    ),
    trend as (
      select
        b.bucket_start,
        case when v_bucket = 'month' then to_char(b.bucket_start,'MM/YYYY') else to_char(b.bucket_start,'DD/MM') end as label,
        (select count(*)::int from base i where date_trunc(v_bucket, i.created_at)::date = b.bucket_start) as created,
        (select count(*)::int from resolution r where r.resolved_date is not null and date_trunc(v_bucket, r.resolved_date::timestamp)::date = b.bucket_start) as resolved
      from buckets b
      order by b.bucket_start
    ),
    module_stats as (
      select
        ci.id, ci.name,
        count(b.id)::int as total,
        count(b.id) filter (where coalesce(b.status_code,'') not in ('resolved','released'))::int as open_count,
        count(b.id) filter (where b.due_date < current_date and coalesce(b.status_code,'') not in ('resolved','released'))::int as overdue,
        count(b.id) filter (where b.priority_code in ('A','B') and coalesce(b.status_code,'') not in ('resolved','released'))::int as high_priority,
        case when count(b.id) = 0 then 0 else round(100.0 * (count(b.id) filter (where b.status_code in ('resolved','released'))) / count(b.id))::int end as progress,
        case when count(b.id) = 0 then 0 else least(100, round(
          50.0 * (count(b.id) filter (where b.due_date < current_date and coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
          + 30.0 * (count(b.id) filter (where coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
          + 20.0 * (count(b.id) filter (where b.priority_code in ('A','B') and coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
        ))::int end as risk_score
      from public.contract_items ci
      left join base b on b.module_id = ci.id
      where ci.project_id = p_project_id and ci.item_type = 'module'
      group by ci.id, ci.name
      having count(b.id) > 0
      order by risk_score desc, overdue desc, open_count desc
      limit 10
    ),
    department_stats as (
      select
        d.id, d.name,
        count(b.id)::int as total,
        count(b.id) filter (where coalesce(b.status_code,'') not in ('resolved','released'))::int as open_count,
        count(b.id) filter (where b.due_date < current_date and coalesce(b.status_code,'') not in ('resolved','released'))::int as overdue,
        count(b.id) filter (where b.priority_code in ('A','B') and coalesce(b.status_code,'') not in ('resolved','released'))::int as high_priority,
        case when count(b.id) = 0 then 0 else round(100.0 * (count(b.id) filter (where b.status_code in ('resolved','released'))) / count(b.id))::int end as progress,
        case when count(b.id) = 0 then 0 else least(100, round(
          50.0 * (count(b.id) filter (where b.due_date < current_date and coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
          + 30.0 * (count(b.id) filter (where coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
          + 20.0 * (count(b.id) filter (where b.priority_code in ('A','B') and coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
        ))::int end as risk_score
      from public.departments d
      left join base b on b.department_id = d.id
      where d.project_id = p_project_id and d.is_active = true
      group by d.id, d.name
      having count(b.id) > 0
      order by risk_score desc, overdue desc, open_count desc
      limit 10
    ),
    member_stats as (
      select
        p.id, p.full_name as name, p.email,
        count(b.id)::int as total,
        count(b.id) filter (where coalesce(b.status_code,'') not in ('resolved','released'))::int as open_count,
        count(b.id) filter (where b.due_date < current_date and coalesce(b.status_code,'') not in ('resolved','released'))::int as overdue,
        count(b.id) filter (where b.priority_code in ('A','B') and coalesce(b.status_code,'') not in ('resolved','released'))::int as high_priority,
        case when count(b.id) = 0 then 0 else round(100.0 * (count(b.id) filter (where b.status_code in ('resolved','released'))) / count(b.id))::int end as progress,
        case when count(b.id) = 0 then 0 else least(100, round(
          45.0 * (count(b.id) filter (where b.due_date < current_date and coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
          + 35.0 * (count(b.id) filter (where coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
          + 20.0 * (count(b.id) filter (where b.priority_code in ('A','B') and coalesce(b.status_code,'') not in ('resolved','released'))) / count(b.id)
        ))::int end as risk_score
      from public.people p
      left join base b on b.assignee_person_id = p.id
      where p.project_id = p_project_id
        and p.person_type = 'asc'
        and coalesce(p.is_active,true) = true
      group by p.id, p.full_name, p.email
      having count(b.id) > 0
      order by open_count desc, overdue desc, total desc
      limit 12
    ),
    f as (select * from final_score)
    select jsonb_build_object(
      'generatedAt', now(),
      'projectId', pr.id,
      'projectCode', pr.code,
      'range', jsonb_build_object('from', v_from, 'to', v_to, 'days', (v_to - v_from + 1)),
      'health', jsonb_build_object(
        'score', f.health_score,
        'status', case when f.total = 0 then 'no_data' when f.health_score >= 80 then 'healthy' when f.health_score >= 60 then 'watch' else 'critical' end,
        'issueScore', f.issue_score,
        'deliveryScore', f.delivery_score,
        'overdueScore', f.overdue_score,
        'dataQualityScore', f.data_quality_score,
        'scheduleScore', f.schedule_score
      ),
      'summary', jsonb_build_object(
        'total', f.total,
        'open', f.open_count,
        'resolved', f.resolved_count,
        'released', f.released_count,
        'handedOver', f.handed_over,
        'overdue', f.overdue,
        'highPriorityOpen', f.high_priority_open,
        'createdInRange', f.created_in_range,
        'resolvedInRange', f.resolved_in_range,
        'avgAgeDays', f.avg_age_days,
        'avgResolutionDays', f.avg_resolution_days
      ),
      'attention', jsonb_build_object(
        'missingModule', f.missing_module,
        'missingDepartment', f.missing_department,
        'missingAssignee', f.missing_assignee,
        'nearDue', f.near_due
      ),
      'backlogAging', coalesce((select jsonb_agg(jsonb_build_object('code',code,'label',label,'value',value,'percent',percent) order by case code when 'lt7' then 1 when '7_14' then 2 when '15_30' then 3 else 4 end) from aging), '[]'::jsonb),
      'statusDistribution', coalesce((select jsonb_agg(jsonb_build_object('code',code,'label',label,'value',value,'percent',percent)) from status_distribution), '[]'::jsonb),
      'priorityDistribution', coalesce((select jsonb_agg(jsonb_build_object('code',code,'label',label,'value',value,'percent',percent)) from priority_distribution), '[]'::jsonb),
      'trend', coalesce((select jsonb_agg(jsonb_build_object('period',bucket_start,'label',label,'created',created,'resolved',resolved) order by bucket_start) from trend), '[]'::jsonb),
      'topModules', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'total',total,'open',open_count,'overdue',overdue,'highPriority',high_priority,'progress',progress,'riskScore',risk_score)) from module_stats), '[]'::jsonb),
      'topDepartments', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'total',total,'open',open_count,'overdue',overdue,'highPriority',high_priority,'progress',progress,'riskScore',risk_score)) from department_stats), '[]'::jsonb),
      'members', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'total',total,'open',open_count,'overdue',overdue,'highPriority',high_priority,'progress',progress,'riskScore',risk_score)) from member_stats), '[]'::jsonb)
    )
    from project_row pr
    cross join f
  );
end;
$$;

grant execute on function public.get_project_analytics_v120(uuid,date,date) to authenticated;

comment on function public.get_project_analytics_v120(uuid,date,date)
is 'V1.2.0 project health, trends, backlog aging and risk analytics aggregated server-side.';
