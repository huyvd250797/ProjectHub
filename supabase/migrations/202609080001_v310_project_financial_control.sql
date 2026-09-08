-- ASC WORKING V3.1.0 - Project Financial Control
-- Monthly forecast, actual revenue and cost control by project.

create table if not exists public.project_financial_months (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  month_date date not null,
  forecast_percent numeric(5,2) not null default 0,
  actual_percent numeric(5,2) not null default 0,
  revenue_amount numeric(18,2) not null default 0,
  staff_cost_amount numeric(18,2) not null default 0,
  other_cost_amount numeric(18,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_financial_months_unique unique(project_id, month_date),
  constraint project_financial_months_month_start_check check (date_trunc('month', month_date)::date = month_date),
  constraint project_financial_months_forecast_check check (forecast_percent >= 0 and forecast_percent <= 100),
  constraint project_financial_months_actual_check check (actual_percent >= 0 and actual_percent <= 100),
  constraint project_financial_months_money_check check (
    revenue_amount >= 0 and staff_cost_amount >= 0 and other_cost_amount >= 0
  )
);

drop trigger if exists project_financial_months_set_updated_at on public.project_financial_months;
create trigger project_financial_months_set_updated_at
before update on public.project_financial_months
for each row execute function public.set_updated_at();

create index if not exists project_financial_months_project_month_v310_idx
  on public.project_financial_months(project_id, month_date);

alter table public.project_financial_months enable row level security;

drop policy if exists project_financial_months_select_member_v310 on public.project_financial_months;
create policy project_financial_months_select_member_v310 on public.project_financial_months
for select using (public.is_project_member(project_id));

drop policy if exists project_financial_months_write_pm_v310 on public.project_financial_months;
create policy project_financial_months_write_pm_v310 on public.project_financial_months
for all
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

comment on table public.project_financial_months is 'ASC WORKING V3.1.0 monthly project financial control.';
comment on column public.project_financial_months.forecast_percent is 'Forecast completion/revenue percent for this month.';
comment on column public.project_financial_months.actual_percent is 'Actual completion/revenue percent for this month.';
comment on column public.project_financial_months.revenue_amount is 'Revenue recognized or expected for this month.';
comment on column public.project_financial_months.staff_cost_amount is 'Monthly staff cost for project profit planning.';
comment on column public.project_financial_months.other_cost_amount is 'Other monthly project costs.';
