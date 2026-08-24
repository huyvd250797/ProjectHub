-- ASC WORKING V0.9.0 - Hardening + UAT
-- Safe, additive performance indexes for the production candidate.

create index if not exists issues_project_active_updated_idx
  on public.issues(project_id, updated_at desc)
  where archived_at is null;

create index if not exists issues_project_active_status_updated_idx
  on public.issues(project_id, status_code, updated_at desc)
  where archived_at is null;

create index if not exists issues_project_active_customer_status_idx
  on public.issues(project_id, customer_status_code, updated_at desc)
  where archived_at is null;

create index if not exists issues_project_active_due_idx
  on public.issues(project_id, due_date)
  where archived_at is null and due_date is not null;

create index if not exists issues_project_active_department_status_idx
  on public.issues(project_id, department_id, status_code)
  where archived_at is null;

create index if not exists issues_project_active_module_status_idx
  on public.issues(project_id, module_id, status_code)
  where archived_at is null;

create index if not exists contract_detail_project_sort_idx
  on public.contract_detail_items(project_id, sort_order, id);

create index if not exists contract_items_project_sort_idx
  on public.contract_items(project_id, item_type, sort_order, id);

create index if not exists departments_project_active_name_idx
  on public.departments(project_id, is_active, name);

create index if not exists remote_resources_project_env_name_idx
  on public.remote_resources(project_id, environment, name);

create index if not exists remote_resource_access_logs_user_idx
  on public.remote_resource_access_logs(project_id, user_id, created_at desc);

analyze public.issues;
analyze public.contract_items;
analyze public.contract_detail_items;
analyze public.departments;
analyze public.remote_resources;
