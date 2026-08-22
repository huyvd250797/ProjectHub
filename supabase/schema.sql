-- ASC ProjectHub V0.8.0 Customer Collaboration
-- Run this in Supabase SQL Editor when moving from local-first mode to real database mode.

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('Admin', 'PM', 'Member', 'Viewer')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  type text,
  province text,
  contact text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  code text not null,
  name text not null,
  pm text not null,
  status text not null check (status in ('Planning', 'In Progress', 'At Risk', 'Blocked', 'Acceptance', 'Closed')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  start_date date,
  end_date date,
  health_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  phase text not null,
  owner text,
  planned_date date,
  actual_date date,
  status text not null check (status in ('On Track', 'Risk', 'Late', 'Done')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  title text not null,
  owner text,
  due_date date,
  status text not null check (status in ('Todo', 'Doing', 'Waiting', 'Done')),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_surveys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_name text not null,
  department text,
  owner text,
  scheduled_date date,
  status text not null check (status in ('Draft', 'Sent', 'Customer Review', 'Confirmed', 'Rework')),
  summary text,
  decisions text,
  next_actions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  topic text not null,
  department text,
  trainer text,
  scheduled_date date,
  participants int not null default 0,
  status text not null check (status in ('Planned', 'Invited', 'Completed', 'Need Follow-up')),
  evidence text,
  feedback_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists uat_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_name text,
  title text not null,
  owner text,
  due_date date,
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  status text not null check (status in ('Not Started', 'Testing', 'Failed', 'Passed', 'Accepted')),
  customer_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists acceptance_signoffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_name text,
  department text,
  document_name text not null,
  status text not null check (status in ('Preparing', 'Sent', 'Waiting Customer', 'Signed', 'Rework')),
  sent_date date,
  signed_date date,
  confirmed_by text,
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  channel text not null check (channel in ('Zalo', 'Email', 'Meeting', 'Portal')),
  owner text,
  due_date date,
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  status text not null check (status in ('New', 'In Progress', 'Waiting Customer', 'Resolved')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module text not null,
  entity_id uuid,
  file_name text not null,
  bucket_path text not null,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_label text,
  action text not null,
  entity text not null,
  detail text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table customers enable row level security;
alter table projects enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table customer_surveys enable row level security;
alter table training_sessions enable row level security;
alter table uat_cases enable row level security;
alter table acceptance_signoffs enable row level security;
alter table support_requests enable row level security;
alter table attachments enable row level security;
alter table activity_logs enable row level security;

-- V0.8.0 policy baseline.
-- Tighten these in V1.0 after confirming the exact auth/member/customer portal workflow.
create policy "members can read organization projects"
on projects for select
using (
  exists (
    select 1 from memberships
    where memberships.organization_id = projects.organization_id
    and memberships.user_id = auth.uid()
    and memberships.status = 'active'
  )
);

create policy "pm and admin can write organization projects"
on projects for all
using (
  exists (
    select 1 from memberships
    where memberships.organization_id = projects.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('Admin', 'PM')
    and memberships.status = 'active'
  )
)
with check (
  exists (
    select 1 from memberships
    where memberships.organization_id = projects.organization_id
    and memberships.user_id = auth.uid()
    and memberships.role in ('Admin', 'PM')
    and memberships.status = 'active'
  )
);
