# ASC-Working — V0.2.0

**Project Workspace — Data Model + Import POC**

> ASC-Working is a **multi-project workspace**. EPU is the first project currently shown in the UI; it is not the name of the workspace.

## Branding
The app uses the supplied HV gold logo as:
- main sidebar logo
- login branding
- Next.js app/browser icon

## Version history
- ✅ V0.1.0 — Foundation / Deployable Skeleton
- ✅ **V0.2.0 — Data Model + Import POC**
- ⏭️ Next: V0.3.0 — Dashboard connected to database

## V0.2.0 additions
- Multi-project database model (`project_id` everywhere it matters).
- Project membership + role foundation.
- EPU seed as project #1.
- Project selector in topbar.
- Import POC at `/settings/import`.
- Server-side `.xlsx` parsing with ExcelJS.
- Dry-run sheet mapping + data-quality report.
- Remote password/secret columns explicitly excluded.
- Supabase SQL migration + seed scripts.
- `/api/health`.

## Run local
```bash
npm install
npm run dev
```
Open:
```text
http://localhost:3000
```

Without Supabase variables, choose **Vào Demo Workspace** at `/login`.

## Import POC
1. Open `/settings/import`.
2. Choose the ASC-Working `.xlsx` workbook.
3. Click **Chạy kiểm tra dữ liệu**.
4. Review:
   - required sheets
   - record counts
   - mapping targets
   - missing module/department/assignee
   - Jira duplicates
   - secret exclusion

The dry-run does **not** persist uploaded files and does **not** write business rows into DB.

## Supabase
See:
- `docs/SUPABASE_SETUP.md`
- `supabase/migrations/202608220001_v020_core_schema.sql`
- `supabase/seed.sql`
- `supabase/assign-first-user.sql`

### `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Reserved server-only variables:
```env
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
APP_URL=
```
Never commit `.env.local`.

## Deploy Vercel
1. Push this folder to GitHub.
2. Vercel → Add New → Project → import repo.
3. Framework: Next.js.
4. Build/Install: Default.
5. **Output Directory: leave Default/blank. Do not set `out`.**
6. Add Supabase env vars if using real Auth/DB.
7. Deploy.

## Multi-project architecture
Do not create separate tables for EPU or future customers.

All project data uses shared tables:
```text
projects
  ├─ project_members
  ├─ project_stages
  ├─ departments
  ├─ people
  ├─ contract_items
  │    └─ contract_detail_items
  ├─ issues
  ├─ release_versions
  └─ remote_resources
```

Rows are isolated by `project_id` + Supabase RLS.

## Important security note
The original workbook contains remote/server credentials. V0.2.0 does not copy these values into source or dry-run JSON.

Later secure resource version will use:
- server-only encryption
- role authorization
- reveal/copy endpoints
- audit logs
- credential rotation guidance

© 2026 HuyVo. All rights reserved.
