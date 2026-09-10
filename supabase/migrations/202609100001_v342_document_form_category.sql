-- ASC WORKING V3.4.2 - Document form category
-- Adds the lightweight "form" document category for project document links.

alter table public.project_documents
  drop constraint if exists project_documents_drive_file_id_key;

alter table public.project_document_upload_sessions
  drop constraint if exists project_document_upload_sessions_category_check;

alter table public.project_document_upload_sessions
  add constraint project_document_upload_sessions_category_check
  check (category in ('minutes','contract','form','guide','requirement','report','other'));

alter table public.project_documents
  drop constraint if exists project_documents_category_check;

alter table public.project_documents
  add constraint project_documents_category_check
  check (category in ('minutes','contract','form','guide','requirement','report','other'));
