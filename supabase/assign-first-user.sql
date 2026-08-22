-- Run this AFTER creating your first Supabase Auth user.
-- Replace YOUR_USER_UUID with Authentication > Users > user UUID.

insert into public.project_members (project_id, user_id, role)
values (
  '00000000-0000-0000-0000-0000000000e1',
  19f952c2-5061-40e0-8dcb-78f5f1b1c3ec::uuid,
  'admin'
)
on conflict (project_id, user_id) do update set role = excluded.role;
