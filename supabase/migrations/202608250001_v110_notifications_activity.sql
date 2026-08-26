-- ASC WORKING V1.1.0 — Notifications & Activity Center
-- Run after V0.9.5 migration. Adds project activity, per-user notifications,
-- read state, preferences and lazy ISSUE due reminders.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  summary text,
  href text,
  source_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists activity_events_source_key_uq on public.activity_events(source_key) where source_key is not null;
create index if not exists activity_events_project_created_idx on public.activity_events(project_id, created_at desc);
create index if not exists activity_events_project_type_idx on public.activity_events(project_id, event_type, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.activity_events(id) on delete set null,
  category text not null check (category in ('issue_assignment','issue_update','due_reminder','project_membership','import_update','security_event')),
  notification_key text not null,
  title text not null,
  summary text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, notification_key)
);
create index if not exists notifications_user_project_created_idx on public.notifications(user_id, project_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, project_id, read_at, created_at desc);

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_assignment boolean not null default true,
  issue_updates boolean not null default true,
  due_reminders boolean not null default true,
  project_membership boolean not null default true,
  import_updates boolean not null default true,
  security_events boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(user_id, project_id)
);

alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "activity_select_project_member" on public.activity_events;
create policy "activity_select_project_member"
on public.activity_events for select
using (public.is_project_member(project_id));

create or replace function public.can_view_activity_actor_v110(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.activity_events ae
    where ae.actor_id = p_profile_id
      and public.is_project_member(ae.project_id)
  );
$$;

drop policy if exists "profiles_select_activity_actor_v110" on public.profiles;
create policy "profiles_select_activity_actor_v110"
on public.profiles for select
using (public.can_view_activity_actor_v110(id));

drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self"
on public.notifications for select
using (user_id = auth.uid());

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self"
on public.notifications for delete
using (user_id = auth.uid());

drop policy if exists "notification_preferences_select_self" on public.notification_preferences;
create policy "notification_preferences_select_self"
on public.notification_preferences for select
using (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "notification_preferences_insert_self" on public.notification_preferences;
create policy "notification_preferences_insert_self"
on public.notification_preferences for insert
with check (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "notification_preferences_update_self" on public.notification_preferences;
create policy "notification_preferences_update_self"
on public.notification_preferences for update
using (user_id = auth.uid() and public.is_project_member(project_id))
with check (user_id = auth.uid() and public.is_project_member(project_id));

create or replace function public.notification_enabled_v110(
  p_user_id uuid,
  p_project_id uuid,
  p_category text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_category
    when 'issue_assignment' then coalesce((select issue_assignment from public.notification_preferences where user_id=p_user_id and project_id=p_project_id), true)
    when 'issue_update' then coalesce((select issue_updates from public.notification_preferences where user_id=p_user_id and project_id=p_project_id), true)
    when 'due_reminder' then coalesce((select due_reminders from public.notification_preferences where user_id=p_user_id and project_id=p_project_id), true)
    when 'project_membership' then coalesce((select project_membership from public.notification_preferences where user_id=p_user_id and project_id=p_project_id), true)
    when 'import_update' then coalesce((select import_updates from public.notification_preferences where user_id=p_user_id and project_id=p_project_id), true)
    when 'security_event' then coalesce((select security_events from public.notification_preferences where user_id=p_user_id and project_id=p_project_id), true)
    else true
  end;
$$;

create or replace function public.push_notification_v110(
  p_project_id uuid,
  p_user_id uuid,
  p_activity_id uuid,
  p_category text,
  p_key text,
  p_title text,
  p_summary text,
  p_href text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or not public.notification_enabled_v110(p_user_id, p_project_id, p_category) then
    return;
  end if;

  insert into public.notifications(project_id, user_id, activity_id, category, notification_key, title, summary, href)
  values (p_project_id, p_user_id, p_activity_id, p_category, p_key, p_title, p_summary, p_href)
  on conflict (user_id, notification_key) do nothing;
end;
$$;

create or replace function public.capture_issue_activity_v110()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue record;
  v_assignee_user uuid;
  v_activity_id uuid;
  v_title text;
  v_summary text;
  v_category text;
  v_actor uuid := new.changed_by;
begin
  select i.id, i.issue_no, i.content, i.assignee_person_id, pe.user_id
  into v_issue
  from public.issues i
  left join public.people pe on pe.id = i.assignee_person_id
  where i.id = new.issue_id;

  if v_issue.id is null then return new; end if;
  v_assignee_user := v_issue.user_id;
  v_summary := left(coalesce(v_issue.content, ''), 180);

  v_title := case new.field_name
    when 'created' then format('ISSUE #%s được tạo', coalesce(v_issue.issue_no::text, '—'))
    when 'assignee_person_id' then format('ISSUE #%s đổi người phụ trách', coalesce(v_issue.issue_no::text, '—'))
    when 'status_code' then format('ISSUE #%s cập nhật trạng thái', coalesce(v_issue.issue_no::text, '—'))
    when 'customer_status_code' then format('ISSUE #%s cập nhật bàn giao', coalesce(v_issue.issue_no::text, '—'))
    when 'due_date' then format('ISSUE #%s cập nhật Due Date', coalesce(v_issue.issue_no::text, '—'))
    when 'priority_code' then format('ISSUE #%s cập nhật ưu tiên', coalesce(v_issue.issue_no::text, '—'))
    when 'response' then format('ISSUE #%s có phản hồi mới', coalesce(v_issue.issue_no::text, '—'))
    when 'lifecycle' then format('ISSUE #%s cập nhật vòng đời', coalesce(v_issue.issue_no::text, '—'))
    else format('ISSUE #%s được cập nhật', coalesce(v_issue.issue_no::text, '—'))
  end;

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, source_key, metadata, created_at)
  values (
    new.project_id,
    v_actor,
    'issue_' || new.field_name,
    'issue',
    new.issue_id,
    v_title,
    v_summary,
    '/issues?issueId=' || new.issue_id::text,
    'issue_history:' || new.id::text,
    jsonb_build_object('field', new.field_name, 'oldValue', new.old_value, 'newValue', new.new_value),
    new.changed_at
  )
  on conflict (source_key) where source_key is not null do update set title=excluded.title
  returning id into v_activity_id;

  if v_assignee_user is not null and v_assignee_user is distinct from v_actor then
    if new.field_name in ('created','assignee_person_id') then
      v_category := 'issue_assignment';
      perform public.push_notification_v110(
        new.project_id, v_assignee_user, v_activity_id, v_category,
        'activity:' || new.id::text || ':assignment',
        case when new.field_name='created' then 'Bạn được giao ISSUE mới' else 'ISSUE được giao cho bạn' end,
        v_summary,
        '/issues?issueId=' || new.issue_id::text
      );
    elsif new.field_name in ('status_code','customer_status_code','due_date','priority_code','response','lifecycle') then
      perform public.push_notification_v110(
        new.project_id, v_assignee_user, v_activity_id, 'issue_update',
        'activity:' || new.id::text || ':update',
        v_title,
        v_summary,
        '/issues?issueId=' || new.issue_id::text
      );
    end if;
  end if;

  return new;
exception when others then
  -- Activity must never block ISSUE business operations.
  return new;
end;
$$;

drop trigger if exists issue_activity_v110 on public.issue_history;
create trigger issue_activity_v110
after insert on public.issue_history
for each row execute function public.capture_issue_activity_v110();

create or replace function public.capture_project_member_activity_v110()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_user_id uuid;
  v_role text;
  v_project record;
  v_profile record;
  v_activity_id uuid;
  v_title text;
  v_event text;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    v_project_id := old.project_id;
    v_user_id := old.user_id;
    v_role := old.role;
  else
    v_project_id := new.project_id;
    v_user_id := new.user_id;
    v_role := new.role;
  end if;

  select code, name into v_project from public.projects where id=v_project_id;
  select display_name, email into v_profile from public.profiles where id=v_user_id;

  if tg_op='INSERT' then
    v_event := 'project_member_added';
    v_title := format('%s được thêm vào Project %s', coalesce(v_profile.display_name, v_profile.email, 'Thành viên'), coalesce(v_project.code, ''));
  elsif tg_op='UPDATE' then
    if new.role is not distinct from old.role then return new; end if;
    v_event := 'project_member_role';
    v_title := format('%s đổi role %s → %s', coalesce(v_profile.display_name, v_profile.email, 'Thành viên'), old.role, new.role);
  else
    v_event := 'project_member_removed';
    v_title := format('%s được gỡ khỏi Project %s', coalesce(v_profile.display_name, v_profile.email, 'Thành viên'), coalesce(v_project.code, ''));
  end if;

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, metadata)
  values (v_project_id, v_actor, v_event, 'project_member', v_user_id, v_title, v_profile.email, '/settings/projects', jsonb_build_object('role', v_role))
  returning id into v_activity_id;

  if tg_op <> 'DELETE' and v_user_id is distinct from v_actor then
    perform public.push_notification_v110(
      v_project_id, v_user_id, v_activity_id, 'project_membership',
      'project_member:' || v_project_id::text || ':' || v_user_id::text || ':' || tg_op || ':' || extract(epoch from now())::bigint::text,
      case when tg_op='INSERT' then 'Bạn được thêm vào Project ' || coalesce(v_project.code, '') else 'Quyền Project của bạn đã thay đổi' end,
      case when tg_op='INSERT' then 'Role: ' || new.role else 'Role mới: ' || new.role end,
      '/dashboard'
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
exception when others then
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists project_member_activity_v110 on public.project_members;
create trigger project_member_activity_v110
after insert or update or delete on public.project_members
for each row execute function public.capture_project_member_activity_v110();

create or replace function public.capture_resource_activity_v110()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
  v_title text;
  v_target uuid;
begin
  v_title := case new.action
    when 'reveal' then 'Reveal credential: ' || new.resource_name
    when 'copy' then 'Copy credential: ' || new.resource_name
    when 'open_link' then 'Mở resource: ' || new.resource_name
    when 'create' then 'Tạo resource: ' || new.resource_name
    when 'update' then 'Cập nhật resource: ' || new.resource_name
    when 'delete' then 'Xóa resource: ' || new.resource_name
    when 'secret_update' then 'Cập nhật secret: ' || new.resource_name
    when 'secret_clear' then 'Xóa secret: ' || new.resource_name
    when 'permission_update' then 'Cập nhật quyền resource: ' || new.resource_name
    else 'Resource activity: ' || new.resource_name
  end;

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, source_key, metadata, created_at)
  values (new.project_id, new.user_id, 'resource_' || new.action, 'resource', new.resource_id, v_title, null, '/resources', 'resource_log:' || new.id::text, new.metadata, new.created_at)
  on conflict (source_key) where source_key is not null do update set title=excluded.title
  returning id into v_activity_id;

  if new.action in ('secret_update','secret_clear','permission_update') then
    for v_target in
      select pm.user_id from public.project_members pm
      where pm.project_id=new.project_id and pm.role in ('admin','pm')
      union
      select p.id from public.profiles p where p.global_role='master' and p.is_active=true
    loop
      if v_target is distinct from new.user_id then
        perform public.push_notification_v110(
          new.project_id, v_target, v_activity_id, 'security_event',
          'security:' || new.id::text || ':' || v_target::text,
          v_title,
          'Resource Vault security activity',
          '/resources'
        );
      end if;
    end loop;
  end if;

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists resource_activity_v110 on public.remote_resource_access_logs;
create trigger resource_activity_v110
after insert on public.remote_resource_access_logs
for each row execute function public.capture_resource_activity_v110();

create or replace function public.capture_import_activity_v110()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_id uuid;
  v_target uuid;
begin
  if new.mode <> 'apply' or new.status <> 'imported' then return new; end if;

  insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, source_key, metadata, created_at)
  values (
    new.project_id,
    new.created_by,
    'import_completed',
    'import',
    new.id,
    'Excel Import hoàn tất',
    new.source_file_name,
    '/settings/import',
    'import_batch:' || new.id::text,
    new.summary,
    new.created_at
  )
  on conflict (source_key) where source_key is not null do update set title=excluded.title
  returning id into v_activity_id;

  for v_target in
    select pm.user_id from public.project_members pm
    where pm.project_id=new.project_id and pm.role in ('admin','pm')
    union
    select p.id from public.profiles p where p.global_role='master' and p.is_active=true
  loop
    if v_target is distinct from new.created_by then
      perform public.push_notification_v110(
        new.project_id, v_target, v_activity_id, 'import_update',
        'import:' || new.id::text || ':' || v_target::text,
        'Excel Import hoàn tất',
        new.source_file_name,
        '/settings/import'
      );
    end if;
  end loop;

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists import_activity_v110 on public.import_batches;
create trigger import_activity_v110
after insert or update on public.import_batches
for each row execute function public.capture_import_activity_v110();

create or replace function public.sync_issue_due_notifications_v110(p_project_id uuid)
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

  insert into public.notifications(project_id, user_id, category, notification_key, title, summary, href, created_at)
  select
    i.project_id,
    v_user,
    'due_reminder',
    'due:' || case when i.due_date < current_date then 'overdue:' else 'soon:' end || i.id::text || ':' || i.due_date::text,
    case
      when i.due_date < current_date then format('ISSUE #%s đã quá hạn', coalesce(i.issue_no::text, '—'))
      when i.due_date = current_date then format('ISSUE #%s đến hạn hôm nay', coalesce(i.issue_no::text, '—'))
      else format('ISSUE #%s sắp đến hạn', coalesce(i.issue_no::text, '—'))
    end,
    left(i.content, 180),
    '/issues?issueId=' || i.id::text,
    now()
  from public.issues i
  join public.people pe on pe.id=i.assignee_person_id and pe.user_id=v_user
  where i.project_id=p_project_id
    and i.archived_at is null
    and i.due_date is not null
    and i.due_date <= current_date + 3
    and coalesce(i.status_code,'') not in ('resolved','released','no_action','not_feasible')
  on conflict (user_id, notification_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Backfill recent ISSUE and resource activity so the Activity Center is useful immediately.
insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, source_key, metadata, created_at)
select
  h.project_id,
  h.changed_by,
  'issue_' || h.field_name,
  'issue',
  h.issue_id,
  case h.field_name
    when 'created' then format('ISSUE #%s được tạo', coalesce(i.issue_no::text,'—'))
    when 'status_code' then format('ISSUE #%s cập nhật trạng thái', coalesce(i.issue_no::text,'—'))
    when 'assignee_person_id' then format('ISSUE #%s đổi người phụ trách', coalesce(i.issue_no::text,'—'))
    else format('ISSUE #%s được cập nhật', coalesce(i.issue_no::text,'—'))
  end,
  left(i.content,180),
  '/issues?issueId=' || h.issue_id::text,
  'issue_history:' || h.id::text,
  jsonb_build_object('field',h.field_name,'oldValue',h.old_value,'newValue',h.new_value),
  h.changed_at
from public.issue_history h
join public.issues i on i.id=h.issue_id
where h.changed_at >= now() - interval '30 days'
on conflict (source_key) where source_key is not null do nothing;

insert into public.activity_events(project_id, actor_id, event_type, entity_type, entity_id, title, summary, href, source_key, metadata, created_at)
select
  l.project_id,
  l.user_id,
  'resource_' || l.action,
  'resource',
  l.resource_id,
  case l.action
    when 'reveal' then 'Reveal credential: ' || l.resource_name
    when 'copy' then 'Copy credential: ' || l.resource_name
    when 'open_link' then 'Mở resource: ' || l.resource_name
    else 'Resource activity: ' || l.resource_name
  end,
  null,
  '/resources',
  'resource_log:' || l.id::text,
  l.metadata,
  l.created_at
from public.remote_resource_access_logs l
where l.created_at >= now() - interval '30 days'
on conflict (source_key) where source_key is not null do nothing;

comment on table public.activity_events is 'V1.1.0 project activity feed generated from ISSUE, membership, import and Resource Vault events.';
comment on table public.notifications is 'V1.1.0 user notification inbox with read state and deep links.';
comment on table public.notification_preferences is 'V1.1.0 per-user/per-project notification preferences.';
