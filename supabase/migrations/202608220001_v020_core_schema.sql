-- ASC WORKING V0.2.0 — Data Model + Import POC
-- Multi-project first: every business entity is scoped by project_id.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  slug text not null,
  name text not null,
  organization_name text,
  contract_no text,
  contract_value numeric(18,2),
  contract_date date,
  start_date date,
  due_date date,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists projects_code_uq on public.projects (lower(code));
create unique index if not exists projects_slug_uq on public.projects (lower(slug));

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','pm','member','viewer')),
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text,
  name text not null,
  normalized_name text not null,
  is_active boolean not null default true,
  source_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, normalized_name)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  person_type text not null check (person_type in ('asc','customer')),
  full_name text not null,
  title text,
  project_role text,
  email text,
  zalo text,
  module_notes text,
  source_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists people_project_name_idx on public.people(project_id, full_name);

create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  name text not null,
  start_date date,
  end_date date,
  status text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create table if not exists public.status_catalog (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  category text not null check (category in ('issue_status','customer_status','module_status','priority','stage')),
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists status_catalog_scope_uq
  on public.status_catalog(coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), category, code);

create table if not exists public.contract_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.contract_items(id) on delete set null,
  code text,
  external_key text,
  name text not null,
  item_type text not null default 'module' check (item_type in ('root','subsystem','module','other')),
  owner_department_id uuid references public.departments(id) on delete set null,
  module_status_code text,
  classification text,
  sort_order integer not null default 0,
  source_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contract_items_project_type_idx on public.contract_items(project_id, item_type);
create index if not exists contract_items_project_name_idx on public.contract_items(project_id, name);

create table if not exists public.contract_detail_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.contract_detail_items(id) on delete cascade,
  contract_item_id uuid references public.contract_items(id) on delete set null,
  code text,
  content text not null,
  node_type text,
  level integer not null default 0,
  sort_order integer not null default 0,
  source_row integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contract_detail_project_parent_idx on public.contract_detail_items(project_id, parent_id);
create index if not exists contract_detail_project_contract_idx on public.contract_detail_items(project_id, contract_item_id);

create table if not exists public.release_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sequence_no integer,
  release_date date not null,
  label text,
  source_row integer,
  created_at timestamptz not null default now(),
  unique(project_id, release_date)
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_row integer,
  content text not null,
  status_code text,
  customer_status_code text,
  priority_code text,
  stage_code text,
  jira_url text,
  release_date date,
  due_date date,
  module_id uuid references public.contract_items(id) on delete set null,
  module_name_raw text,
  response text,
  department_id uuid references public.departments(id) on delete set null,
  department_name_raw text,
  requester_person_id uuid references public.people(id) on delete set null,
  requester_name_raw text,
  assignee_person_id uuid references public.people(id) on delete set null,
  assignee_name_raw text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists issues_project_status_idx on public.issues(project_id, status_code);
create index if not exists issues_project_customer_status_idx on public.issues(project_id, customer_status_code);
create index if not exists issues_project_module_idx on public.issues(project_id, module_id);
create index if not exists issues_project_department_idx on public.issues(project_id, department_id);
create index if not exists issues_project_due_date_idx on public.issues(project_id, due_date);
create index if not exists issues_project_assignee_idx on public.issues(project_id, assignee_person_id);

create table if not exists public.issue_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_id uuid not null references public.issues(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);
create index if not exists issue_history_issue_idx on public.issue_history(issue_id, changed_at desc);

create table if not exists public.remote_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  resource_type text not null default 'other',
  environment text,
  url_or_host text,
  remote_address text,
  username text,
  has_secret boolean not null default false,
  notes text,
  is_sensitive boolean not null default false,
  source_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists remote_resources_project_idx on public.remote_resources(project_id, resource_type);

-- Secret material is intentionally separated from remote_resources.
-- Authenticated browser clients receive NO policy on this table; later server-only
-- endpoints may access it with the Supabase service role after role checks.
create table if not exists public.remote_resource_secrets (
  resource_id uuid primary key references public.remote_resources(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  secret_ciphertext text not null,
  secret_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists remote_resource_secrets_project_idx on public.remote_resource_secrets(project_id);


create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  source_file_name text not null,
  source_hash text,
  mode text not null default 'dry_run' check (mode in ('dry_run','apply')),
  status text not null default 'created' check (status in ('created','validated','imported','failed')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.import_messages (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  severity text not null check (severity in ('info','warning','error')),
  sheet_name text,
  source_row integer,
  code text not null,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists import_messages_batch_idx on public.import_messages(batch_id, severity);

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','profiles','departments','people','project_stages','contract_items','contract_detail_items','issues','remote_resources','remote_resource_secrets']
  LOOP
    EXECUTE format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    EXECUTE format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- Create a profile automatically for newly created Supabase users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill profiles for Auth users that existed before this migration.
insert into public.profiles (id, display_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.email
from auth.users u
on conflict (id) do update set email = excluded.email;

-- Security-definer helpers avoid recursive RLS lookups.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

create or replace function public.has_project_role(p_project_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = any(p_roles)
  );
$$;

-- RLS
alter table public.projects enable row level security;
alter table public.profiles enable row level security;
alter table public.project_members enable row level security;
alter table public.departments enable row level security;
alter table public.people enable row level security;
alter table public.project_stages enable row level security;
alter table public.status_catalog enable row level security;
alter table public.contract_items enable row level security;
alter table public.contract_detail_items enable row level security;
alter table public.release_versions enable row level security;
alter table public.issues enable row level security;
alter table public.issue_history enable row level security;
alter table public.remote_resources enable row level security;
alter table public.remote_resource_secrets enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_messages enable row level security;

-- Profiles
create policy "profiles_select_self" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Project-scoped reads
create policy "projects_select_member" on public.projects for select using (public.is_project_member(id));
create policy "project_members_select_member" on public.project_members for select using (public.is_project_member(project_id));
create policy "departments_select_member" on public.departments for select using (public.is_project_member(project_id));
create policy "people_select_member" on public.people for select using (public.is_project_member(project_id));
create policy "stages_select_member" on public.project_stages for select using (public.is_project_member(project_id));
create policy "catalog_select_global_or_member" on public.status_catalog for select using (project_id is null or public.is_project_member(project_id));
create policy "contract_select_member" on public.contract_items for select using (public.is_project_member(project_id));
create policy "contract_detail_select_member" on public.contract_detail_items for select using (public.is_project_member(project_id));
create policy "release_select_member" on public.release_versions for select using (public.is_project_member(project_id));
create policy "issues_select_member" on public.issues for select using (public.is_project_member(project_id));
create policy "issue_history_select_member" on public.issue_history for select using (public.is_project_member(project_id));
create policy "remote_select_member" on public.remote_resources for select using (public.is_project_member(project_id));
create policy "import_batches_select_member" on public.import_batches for select using (project_id is null or public.is_project_member(project_id));
create policy "import_messages_select_member" on public.import_messages for select using (
  exists (select 1 from public.import_batches b where b.id = batch_id and (b.project_id is null or public.is_project_member(b.project_id)))
);

-- PM/Admin can manage project structure.
create policy "projects_update_pm" on public.projects for update using (public.has_project_role(id, array['admin','pm'])) with check (public.has_project_role(id, array['admin','pm']));
create policy "project_members_write_pm" on public.project_members for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "departments_write_pm" on public.departments for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "people_write_pm" on public.people for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "stages_write_pm" on public.project_stages for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "contract_write_pm" on public.contract_items for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "contract_detail_write_pm" on public.contract_detail_items for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "release_write_pm" on public.release_versions for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "remote_write_pm" on public.remote_resources for all using (public.has_project_role(project_id, array['admin','pm'])) with check (public.has_project_role(project_id, array['admin','pm']));
create policy "catalog_write_pm" on public.status_catalog for all using (project_id is not null and public.has_project_role(project_id, array['admin','pm'])) with check (project_id is not null and public.has_project_role(project_id, array['admin','pm']));

-- Members can work with ISSUE; viewers cannot.
create policy "issues_insert_member" on public.issues for insert with check (public.has_project_role(project_id, array['admin','pm','member']));
create policy "issues_update_member" on public.issues for update using (public.has_project_role(project_id, array['admin','pm','member'])) with check (public.has_project_role(project_id, array['admin','pm','member']));
create policy "issues_delete_pm" on public.issues for delete using (public.has_project_role(project_id, array['admin','pm']));
create policy "issue_history_insert_member" on public.issue_history for insert with check (public.has_project_role(project_id, array['admin','pm','member']));

-- Import application is restricted to PM/Admin. Dry-run endpoint does not write database.
create policy "import_batches_write_pm" on public.import_batches for all using (project_id is null or public.has_project_role(project_id, array['admin','pm'])) with check (project_id is null or public.has_project_role(project_id, array['admin','pm']));
create policy "import_messages_write_pm" on public.import_messages for all using (
  exists (select 1 from public.import_batches b where b.id = batch_id and (b.project_id is null or public.has_project_role(b.project_id, array['admin','pm'])))
) with check (
  exists (select 1 from public.import_batches b where b.id = batch_id and (b.project_id is null or public.has_project_role(b.project_id, array['admin','pm'])))
);
