-- ASC WORKING V0.9.3 — Project Profile / Project Management
-- Run after V0.9.2 migrations.
-- Extends projects with editable organization/contact/profile information.

alter table public.projects
  add column if not exists description text,
  add column if not exists organization_code text,
  add column if not exists organization_address text,
  add column if not exists contact_name text,
  add column if not exists contact_title text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists notes text;

create index if not exists projects_organization_code_idx
  on public.projects(lower(organization_code))
  where organization_code is not null;

create index if not exists projects_organization_name_idx
  on public.projects(lower(organization_name))
  where organization_name is not null;

comment on column public.projects.description is 'V0.9.3 project scope/description managed from Master Project Console.';
comment on column public.projects.organization_code is 'Customer/school/organization code.';
comment on column public.projects.organization_address is 'Customer/school/organization address.';
comment on column public.projects.contact_name is 'Primary customer contact name.';
comment on column public.projects.contact_title is 'Primary customer contact title.';
comment on column public.projects.contact_email is 'Primary customer contact email.';
comment on column public.projects.contact_phone is 'Primary customer contact phone.';
comment on column public.projects.notes is 'Project-level operational notes.';

analyze public.projects;
