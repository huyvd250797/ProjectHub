-- ASC WORKING V3.7.1 — Search / Modal / Deadline Fix
-- Adds actual project completion date so Dashboard can calculate on-time vs late completion.

alter table public.projects
  add column if not exists completed_date date;

create index if not exists projects_completed_date_idx
  on public.projects(completed_date)
  where completed_date is not null;

comment on column public.projects.completed_date is 'V3.7.1 actual completion date. Required when project status is completed; used for late/on-time project reporting.';

analyze public.projects;
