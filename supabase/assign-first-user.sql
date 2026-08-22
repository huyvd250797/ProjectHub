-- OPTIONAL helper for a Supabase project that currently has one main Auth user.
-- Run AFTER migration + seed. Review the selected email before executing the INSERT.

select id, email, created_at
from auth.users
order by created_at asc;

-- Assign the earliest-created Auth user as admin of the first EPU project.
insert into public.project_members (project_id, user_id, role)
select
  19f952c2-5061-40e0-8dcb-78f5f1b1c3ec::uuid,
  u.id,
  'admin'
from auth.users u
order by u.created_at asc
limit 1
on conflict (project_id, user_id) do update set role = excluded.role;
