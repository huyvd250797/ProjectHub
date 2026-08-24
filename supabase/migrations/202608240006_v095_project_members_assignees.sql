-- ASC WORKING V0.9.5 — Project Members as ISSUE Assignees
-- Makes project_members the authoritative source for ISSUE assignee choices.
-- Existing people rows remain for historical ISSUE references.

alter table public.people
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists people_project_user_idx
  on public.people(project_id, user_id)
  where user_id is not null;

-- Attach legacy ASC people to existing Project Members when email or display name matches.
with candidates as (
  select distinct on (pm.project_id, pm.user_id)
    pe.id as person_id,
    pm.user_id,
    pr.email,
    pr.display_name,
    pm.role
  from public.project_members pm
  join public.profiles pr on pr.id = pm.user_id
  join public.people pe
    on pe.project_id = pm.project_id
   and pe.person_type = 'asc'
   and pe.user_id is null
   and (
     (pe.email is not null and pr.email is not null and lower(trim(pe.email)) = lower(trim(pr.email)))
     or
     (
       coalesce(trim(pe.email), '') = ''
       and pr.display_name is not null
       and lower(trim(pe.full_name)) = lower(trim(pr.display_name))
     )
   )
  order by
    pm.project_id,
    pm.user_id,
    case
      when pe.email is not null and pr.email is not null and lower(trim(pe.email)) = lower(trim(pr.email)) then 0
      else 1
    end,
    pe.created_at
)
update public.people pe
set
  user_id = c.user_id,
  email = coalesce(nullif(trim(pe.email), ''), c.email),
  full_name = coalesce(nullif(trim(c.display_name), ''), pe.full_name),
  project_role = c.role,
  updated_at = now()
from candidates c
where pe.id = c.person_id;

-- Ensure every existing project member has exactly one linked ASC person record.
insert into public.people (
  project_id,
  user_id,
  person_type,
  full_name,
  project_role,
  email,
  created_at,
  updated_at
)
select
  pm.project_id,
  pm.user_id,
  'asc',
  coalesce(nullif(trim(pr.display_name), ''), split_part(pr.email, '@', 1), 'Project Member'),
  pm.role,
  pr.email,
  now(),
  now()
from public.project_members pm
join public.profiles pr on pr.id = pm.user_id
where not exists (
  select 1
  from public.people pe
  where pe.project_id = pm.project_id
    and pe.user_id = pm.user_id
    and pe.person_type = 'asc'
);

create unique index if not exists people_project_user_uq
  on public.people(project_id, user_id)
  where user_id is not null;

comment on column public.people.user_id is
  'V0.9.5: links an ASC person to the Supabase profile/project member used for login and ISSUE assignment.';

comment on index public.people_project_user_uq is
  'One login profile maps to at most one assignee person per project.';
