# Supabase setup — ASC WORKING V0.2.0

## 1. Keep your existing Auth user
This migration does not delete or recreate `auth.users`. Existing Supabase Auth users are backfilled into `public.profiles`.

## 2. Run migration
Supabase Dashboard → SQL Editor → run:

`supabase/migrations/202608220001_v020_core_schema.sql`

This creates the multi-project schema and RLS foundation.

## 3. Seed first project
Run:

`supabase/seed.sql`

This creates EPU as project #1 and shared status catalogs.

## 4. Assign your Auth user to EPU
If the Supabase project currently has one main user, review then run:

`supabase/assign-first-user.sql`

It assigns the earliest-created Auth user as `admin` for EPU. If you have multiple users, manually use the correct `auth.users.id` instead.

## 5. Environment variables
Local `.env.local` and Vercel Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Server-only values are reserved for later versions:

```env
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
APP_URL=
```

Do not commit `.env.local`.

## 6. Verify
- Sign in.
- Header should show **Project Workspace**.
- Project selector should show EPU.
- `/settings/import` should accept the EPU workbook for dry-run.
- `/api/health` should return version `0.2.0`.

## Multi-project rule
Never create separate tables such as `issues_epu` or `issues_project_b`. Add a new row to `projects`, assign users in `project_members`, and store all business rows with that project's `project_id`.
