-- ASC WORKING V0.9.1 — Promote the primary account to MASTER.
-- Change the email below if your master account uses another address.

insert into public.profiles (id, display_name, email, is_active)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  true
from auth.users u
where lower(u.email) = lower('huywork257@gmail.com')
on conflict (id) do update
set email = excluded.email,
    is_active = true,
    updated_at = now();

update public.profiles
set global_role = 'master',
    is_active = true,
    updated_at = now()
where lower(email) = lower('huywork257@gmail.com');

-- Verify: expected global_role = master.
select id, email, display_name, global_role, is_active
from public.profiles
where lower(email) = lower('huywork257@gmail.com');
