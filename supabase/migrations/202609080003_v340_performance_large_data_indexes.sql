-- ASC WORKING V3.4.0 — Performance & Large Data Optimization
-- Safe, additive indexes only. No data is changed or deleted.

create index if not exists issues_project_active_issue_no_idx
  on public.issues (project_id, issue_no desc)
  where archived_at is null;

create index if not exists issues_project_active_updated_idx
  on public.issues (project_id, updated_at desc)
  where archived_at is null;

create index if not exists issues_project_active_assignee_idx
  on public.issues (project_id, assignee_person_id)
  where archived_at is null;

create index if not exists issues_project_active_module_idx
  on public.issues (project_id, module_id)
  where archived_at is null;

create index if not exists issues_project_active_department_idx
  on public.issues (project_id, department_id)
  where archived_at is null;

create index if not exists issues_project_active_due_date_idx
  on public.issues (project_id, due_date)
  where archived_at is null;

create index if not exists contract_items_project_tree_idx
  on public.contract_items (project_id, parent_id, item_type, sort_order);

create index if not exists contract_items_project_module_idx
  on public.contract_items (project_id, item_type, owner_department_id)
  where item_type = 'module';

create index if not exists contract_detail_items_project_tree_idx
  on public.contract_detail_items (project_id, contract_item_id, parent_id, sort_order);

create index if not exists people_project_active_lookup_idx
  on public.people (project_id, person_type, is_active, full_name);

create index if not exists project_stages_project_range_idx
  on public.project_stages (project_id, start_date, end_date);

create index if not exists project_plan_tasks_project_stage_due_idx
  on public.project_plan_tasks (project_id, stage_id, due_date);

create index if not exists project_plan_tasks_project_owner_idx
  on public.project_plan_tasks (project_id, owner_person_id);

create index if not exists project_milestones_project_stage_due_idx
  on public.project_milestones (project_id, stage_id, due_date);

create index if not exists project_financial_months_project_month_idx
  on public.project_financial_months (project_id, month_date);

create index if not exists resource_assignment_events_project_item_idx
  on public.resource_assignment_events (project_id, item_type, item_id, changed_at desc);
