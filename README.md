# Project Hub — V0.2.0

**Project Workspace • Data Model + Import POC**

Project Hub is the application/workspace. **EPU is only the first/current project**. Future projects reuse the same UI and database tables; data is isolated by `project_id` + Supabase RLS.

## Version history
- ✅ V0.1.0 — Foundation / Deployable Skeleton
- ✅ **V0.2.0 — Data Model + Import POC**
- ⏭️ V0.3.0 — Dashboard connected to database

## V0.2.0 highlights
- Exact HV image supplied by the user is now the main app logo and browser/app icon.
- Project selector foundation in the topbar.
- Multi-project PostgreSQL schema.
- Supabase profiles + project memberships + role foundation.
- EPU seed as project #1.
- Import Dry-run at `/settings/import`.
- Workbook sheet mapping and data-quality report.
- Remote password/token/secret exclusion.
- Demo Mode remains available when Supabase env is absent.

## Tech
- Next.js 16.3 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR/Auth/PostgreSQL/RLS
- SheetJS `xlsx` for V0.2.0 workbook dry-run
- Vercel

## Run local

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Without Supabase variables, `/login` provides Demo Workspace access.

## Supabase
See `docs/SUPABASE_SETUP.md`.

Core files:
- `supabase/migrations/202608220001_v020_core_schema.sql`
- `supabase/seed.sql`
- `supabase/assign-first-user.sql`

## Import POC
1. Select target project in the topbar.
2. Open **Thiết lập → Data Import POC**.
3. Upload the project `.xlsx` workbook.
4. Run **Chạy kiểm tra dữ liệu**.
5. Review sheet mapping, counts and warnings.

V0.2.0 is dry-run only. It does not write workbook rows to business tables.

## Vercel deploy
1. Push this folder to GitHub.
2. Vercel → Add New → Project → import repository.
3. Framework Preset: Next.js.
4. Build Command: Default.
5. Install Command: Default.
6. **Output Directory: Default/blank — do not set `out`.**
7. Add Supabase environment variables.
8. Deploy.

## Security
- Do not commit `.env.local`.
- Import POC does not return Remote Server passwords/tokens/secrets.
- `remote_resource_secrets` is separated from metadata and has no normal browser select policy.
- Encryption/reveal/copy/audit will be completed in the security roadmap version.

## Project architecture

```text
Project Hub (workspace)
└─ projects
   ├─ EPU (current project)
   ├─ Future Project B
   └─ Future Project C

Each project
├─ project_members
├─ project_stages
├─ departments
├─ people
├─ contract_items
│  └─ contract_detail_items
├─ issues
├─ release_versions
└─ remote_resources
```

© 2026 HuyVo. All rights reserved.
