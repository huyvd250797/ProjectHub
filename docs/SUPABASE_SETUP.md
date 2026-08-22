# Supabase setup — V0.2.0

## 1. Create Supabase project
Create a project, then copy:
- Project URL
- Publishable/anon key

## 2. Configure `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_KEY
```

## 3. Apply migration
Open Supabase SQL Editor and run:

`supabase/migrations/202608220001_v020_core_schema.sql`

Then run:

`supabase/seed.sql`

## 4. Create first Auth user
Supabase → Authentication → Users → Add user.

After creating the user, copy its UUID and edit:

`supabase/assign-first-user.sql`

Replace `YOUR_USER_UUID`, then run it.

The user becomes `admin` of project EPU.

## 5. Important multi-project rule
Do not duplicate tables per project.

Correct:
- `issues.project_id`
- `contract_items.project_id`
- `departments.project_id`

Incorrect:
- `issues_epu`
- `issues_project_b`

The same UI and tables serve every project; RLS isolates records through `project_members`.

## 6. Deploy Vercel
Set the same public Supabase variables in Vercel Environment Variables.

Keep server-only variables secret:
```env
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
```

They are reserved for later versions and MUST NOT use `NEXT_PUBLIC_`.
