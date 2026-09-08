-- ASC WORKING V3.2.1 - Finance Forecast / Actual Flow Fix
-- Store forecast and actual as monetary amounts; percent fields remain derived indicators.

alter table public.project_financial_months
  add column if not exists forecast_amount numeric(18,2) not null default 0,
  add column if not exists actual_amount numeric(18,2) not null default 0;

update public.project_financial_months
set
  forecast_amount = case
    when revenue_amount > 0 then revenue_amount
    else round((coalesce(forecast_percent, 0) * coalesce(p.contract_value, 0)) / 100, 2)
  end,
  actual_amount = case
    when revenue_amount > 0 then revenue_amount
    else round((coalesce(actual_percent, 0) * coalesce(p.contract_value, 0)) / 100, 2)
  end
from public.projects p
where project_financial_months.project_id = p.id
  and (project_financial_months.forecast_amount = 0 or project_financial_months.actual_amount = 0);

alter table public.project_financial_months
  drop constraint if exists project_financial_months_amounts_v321_check,
  add constraint project_financial_months_amounts_v321_check check (
    forecast_amount >= 0 and actual_amount >= 0
  );

comment on column public.project_financial_months.forecast_amount is 'Forecasted revenue amount for the financial month.';
comment on column public.project_financial_months.actual_amount is 'Actual/closed amount for the financial month.';
comment on column public.project_financial_months.forecast_percent is 'Derived forecast ratio against project contract value.';
comment on column public.project_financial_months.actual_percent is 'Derived actual ratio against project contract value.';
