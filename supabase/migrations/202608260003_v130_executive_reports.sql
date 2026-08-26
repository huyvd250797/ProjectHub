-- ASC WORKING V1.3.0 — Executive Report & Project Summary
-- Run after V1.2.0 migration.
-- Adds project-scoped report snapshots / PM notes. Live metrics continue to use
-- the existing Dashboard + Analytics RPCs so one source of truth is preserved.

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  report_key text not null,
  period_type text not null default 'custom'
    check (period_type in ('week','month','custom','30d','90d','all')),
  period_start date,
  period_end date not null,
  title text,
  pm_comment text,
  next_plan text,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, report_key)
);

create index if not exists report_snapshots_project_period_idx
  on public.report_snapshots(project_id, period_end desc, created_at desc);

alter table public.report_snapshots enable row level security;

drop policy if exists "report_snapshots_select_project_member" on public.report_snapshots;
create policy "report_snapshots_select_project_member"
on public.report_snapshots for select
using (public.is_project_member(project_id));

drop policy if exists "report_snapshots_insert_pm" on public.report_snapshots;
create policy "report_snapshots_insert_pm"
on public.report_snapshots for insert
with check (
  public.has_project_role(project_id, array['admin','pm'])
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "report_snapshots_update_pm" on public.report_snapshots;
create policy "report_snapshots_update_pm"
on public.report_snapshots for update
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

drop policy if exists "report_snapshots_delete_pm" on public.report_snapshots;
create policy "report_snapshots_delete_pm"
on public.report_snapshots for delete
using (public.has_project_role(project_id, array['admin','pm']));

-- Keep updated_at consistent with the rest of ASC WORKING.
drop trigger if exists report_snapshots_set_updated_at on public.report_snapshots;
create trigger report_snapshots_set_updated_at
before update on public.report_snapshots
for each row execute function public.set_updated_at();

-- Surface report creation/updates in Activity Center without exposing snapshot
-- payload content. This trigger only stores safe summary metadata.
create or replace function public.capture_report_snapshot_activity_v130()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_source_key text;
begin
  v_action := case when tg_op = 'INSERT' then 'Đã lưu snapshot báo cáo' else 'Đã cập nhật snapshot báo cáo' end;
  v_source_key := 'report_snapshot:' || new.id::text || ':' || extract(epoch from new.updated_at)::bigint::text;

  if to_regclass('public.activity_events') is not null then
    insert into public.activity_events(
      project_id, actor_id, event_type, entity_type, entity_id,
      title, summary, href, source_key, metadata, created_at
    ) values (
      new.project_id,
      auth.uid(),
      'report_snapshot',
      'report',
      new.id,
      v_action,
      coalesce(new.title, new.report_key),
      '/reports',
      v_source_key,
      jsonb_build_object(
        'periodType', new.period_type,
        'periodStart', new.period_start,
        'periodEnd', new.period_end
      ),
      now()
    )
    on conflict (source_key) where source_key is not null do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists report_snapshot_activity_v130 on public.report_snapshots;
create trigger report_snapshot_activity_v130
after insert or update on public.report_snapshots
for each row execute function public.capture_report_snapshot_activity_v130();

comment on table public.report_snapshots is 'V1.3.0 executive report snapshots, PM comments and next-plan notes by project/period.';
comment on column public.report_snapshots.snapshot is 'Compact executive metrics captured at save time for week-over-week/month-over-month comparison.';

analyze public.report_snapshots;
