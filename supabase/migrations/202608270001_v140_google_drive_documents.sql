-- ASC WORKING V1.4.0 — Attachment & Project Documents / Google Drive
-- Run after 202608260004_v132_bulk_master_data_import.sql.
-- Binary content remains in Google Drive; Supabase stores project-scoped metadata,
-- resumable-upload verification state and activity references only.

create table if not exists public.project_document_folders (
  project_id uuid primary key references public.projects(id) on delete cascade,
  drive_folder_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_document_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  upload_token_hash text not null,
  drive_folder_id text not null,
  original_file_name text not null,
  title text not null,
  category text not null default 'other'
    check (category in ('minutes','contract','guide','requirement','report','other')),
  description text,
  linked_entity_type text not null default 'project'
    check (linked_entity_type in ('project','issue','contract_item','department','resource','other')),
  linked_entity_id uuid,
  linked_entity_label text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 262144000),
  status text not null default 'pending' check (status in ('pending','completed','expired','cancelled')),
  drive_file_id text,
  document_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  upload_session_id uuid unique references public.project_document_upload_sessions(id) on delete set null,
  title text not null,
  original_file_name text not null,
  category text not null default 'other'
    check (category in ('minutes','contract','guide','requirement','report','other')),
  description text,
  linked_entity_type text not null default 'project'
    check (linked_entity_type in ('project','issue','contract_item','department','resource','other')),
  linked_entity_id uuid,
  linked_entity_label text,
  storage_provider text not null default 'google_drive' check (storage_provider = 'google_drive'),
  drive_file_id text not null unique,
  drive_folder_id text not null,
  drive_md5_checksum text,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  version_no integer not null default 1 check (version_no > 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_document_upload_sessions
  drop constraint if exists project_document_upload_sessions_document_id_fkey;
alter table public.project_document_upload_sessions
  add constraint project_document_upload_sessions_document_id_fkey
  foreign key (document_id) references public.project_documents(id) on delete set null;

create index if not exists project_documents_project_created_idx
  on public.project_documents(project_id, created_at desc)
  where archived_at is null;
create index if not exists project_documents_project_category_idx
  on public.project_documents(project_id, category, created_at desc)
  where archived_at is null;
create index if not exists project_documents_project_link_idx
  on public.project_documents(project_id, linked_entity_type, linked_entity_id)
  where archived_at is null;
create index if not exists project_document_upload_sessions_expiry_idx
  on public.project_document_upload_sessions(expires_at)
  where status = 'pending';

drop trigger if exists project_document_folders_set_updated_at on public.project_document_folders;
create trigger project_document_folders_set_updated_at
before update on public.project_document_folders
for each row execute function public.set_updated_at();

drop trigger if exists project_documents_set_updated_at on public.project_documents;
create trigger project_documents_set_updated_at
before update on public.project_documents
for each row execute function public.set_updated_at();

alter table public.project_document_folders enable row level security;
alter table public.project_document_upload_sessions enable row level security;
alter table public.project_documents enable row level security;

-- Folder IDs are implementation metadata. Project members may inspect their own
-- mapping, while mutations are performed only by server-side service role.
drop policy if exists "document_folders_select_member_v140" on public.project_document_folders;
create policy "document_folders_select_member_v140"
on public.project_document_folders for select
using (public.is_project_member(project_id));

-- Upload session contains a one-time token hash and never needs direct browser DB access.
-- RLS intentionally has no authenticated-user policy; only service role can access it.

drop policy if exists "documents_select_member_v140" on public.project_documents;
create policy "documents_select_member_v140"
on public.project_documents for select
using (public.is_project_member(project_id));

drop policy if exists "documents_insert_member_v140" on public.project_documents;
create policy "documents_insert_member_v140"
on public.project_documents for insert
with check (
  uploaded_by = auth.uid()
  and public.has_project_role(project_id, array['admin','pm','member'])
);

drop policy if exists "documents_update_pm_v140" on public.project_documents;
create policy "documents_update_pm_v140"
on public.project_documents for update
using (public.has_project_role(project_id, array['admin','pm']))
with check (public.has_project_role(project_id, array['admin','pm']));

drop policy if exists "documents_delete_admin_v140" on public.project_documents;
create policy "documents_delete_admin_v140"
on public.project_documents for delete
using (public.has_project_role(project_id, array['admin']));

comment on table public.project_documents is 'V1.4.0 project document metadata; binary content is private in Google Drive.';
comment on table public.project_document_upload_sessions is 'V1.4.0 server-only resumable upload verification sessions.';
comment on column public.project_documents.drive_file_id is 'Opaque Google Drive file ID; never expose OAuth credentials.';
