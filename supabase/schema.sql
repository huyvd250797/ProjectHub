-- ASC ProjectHub V0.5.1 Sheet-Inspired Working View
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

create table if not exists project_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  department text not null,
  subsystem text,
  module_name text not null,
  total_issues int not null default 0 check (total_issues >= 0),
  delivered_issues int not null default 0 check (delivered_issues >= 0),
  owner text,
  status text not null check (status in ('Đã khảo sát', 'Sẵn sàng tập huấn', 'Đã tập huấn', 'Sẵn sàng nghiệm thu', 'Đã nghiệm thu')),
  survey_done boolean not null default false,
  training_done boolean not null default false,
  acceptance_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_name text,
  department text,
  content text not null,
  status text not null check (status in ('Chờ khách hàng', 'Không xử lý', 'Chờ xử lý', 'Đang xử lý', 'Đã xử lý', 'Đã Release', 'Không khả thi')),
  customer_status text not null check (customer_status in ('Chưa bàn giao', 'Đã bàn giao')),
  priority text check (priority in ('A', 'B', 'C', 'D')),
  phase text,
  release_date date,
  due_date date,
  assignee text,
  jira_url text,
  customer_feedback text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists acceptance_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  department text not null,
  module_name text not null,
  step text not null check (step in ('Khảo sát', 'Đào tạo/Tập huấn', 'Xác nhận hoàn thành')),
  status text not null check (status in ('Chưa bắt đầu', 'Đang thực hiện', 'Hoàn tất')),
  owner text,
  evidence text,
  completed_at date,
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
alter table project_modules enable row level security;
alter table project_issues enable row level security;
alter table acceptance_records enable row level security;
alter table attachments enable row level security;
alter table activity_logs enable row level security;

-- V0.5.1 policy baseline.
-- Tighten these in V0.5.x after confirming the exact auth/member workflow.
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
