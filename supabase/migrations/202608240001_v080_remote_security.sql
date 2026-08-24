-- ASC WORKING V0.8.0 — Remote Server Security
-- Run after V0.7.0 migrations.

alter table public.remote_resources
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create table if not exists public.remote_resource_permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_id uuid not null references public.remote_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_reveal boolean not null default false,
  can_copy boolean not null default false,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_id, user_id)
);
create index if not exists remote_resource_permissions_project_idx on public.remote_resource_permissions(project_id, user_id);

create table if not exists public.remote_resource_access_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_id uuid references public.remote_resources(id) on delete set null,
  resource_name text not null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('reveal','copy','open_link','create','update','delete','secret_update','secret_clear','permission_update')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists remote_resource_access_logs_project_idx on public.remote_resource_access_logs(project_id, created_at desc);
create index if not exists remote_resource_access_logs_resource_idx on public.remote_resource_access_logs(resource_id, created_at desc);

alter table public.remote_resource_permissions enable row level security;
alter table public.remote_resource_access_logs enable row level security;

-- Users can see only their own grants. PM/Admin can inspect/manage all grants in the project.
drop policy if exists "remote_permissions_select" on public.remote_resource_permissions;
create policy "remote_permissions_select" on public.remote_resource_permissions
for select using (
  user_id = auth.uid() or public.has_project_role(project_id, array['admin','pm'])
);

drop policy if exists "remote_permissions_manage_pm" on public.remote_resource_permissions;
create policy "remote_permissions_manage_pm" on public.remote_resource_permissions
for all using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

-- Audit trail is intentionally read-only from the browser and visible to PM/Admin.
-- Inserts are performed only by the server service-role endpoint.
drop policy if exists "remote_logs_select_pm" on public.remote_resource_access_logs;
create policy "remote_logs_select_pm" on public.remote_resource_access_logs
for select using (public.has_project_role(project_id, array['admin','pm']));

comment on table public.remote_resource_permissions is 'V0.8.0 per-resource reveal/copy grants for project members.';
comment on table public.remote_resource_access_logs is 'V0.8.0 immutable security audit trail. Never stores plaintext secrets.';
comment on table public.remote_resource_secrets is 'Server-only encrypted secret payload. No authenticated-browser RLS policy by design.';
