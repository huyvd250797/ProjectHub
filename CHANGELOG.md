# Changelog

## V0.9.1 — Master Account / Multi-Project Access

### Added
- Global `profiles.global_role` with `user | master`.
- RLS helper `public.is_master()` and MASTER-aware `is_project_member()` / `has_project_role()`.
- Master Project Console for creating projects, changing lifecycle status and managing project members.
- MASTER bootstrap flow when no Project exists yet.
- Master badge in workspace UI and Project Switcher.
- Readiness/UAT check for global MASTER access.
- `supabase/promote-master.sql` bootstrap script.

### Security
- MASTER is mapped to effective project `admin` in ISSUE and Remote Resource server APIs.
- Normal users remain project-scoped through `project_members`.
- Profile trigger blocks non-MASTER users from self-promoting `global_role`.
- Existing RLS policies inherit MASTER access through upgraded helper functions instead of duplicating policies across every business table.

### Preserved
- V0.9.0 Hardening + UAT.
- V0.8.0 Remote Server Security and encrypted credential vault.
- Dashboard, PLHĐ, Department Intelligence and ISSUE Core/Productivity.

## V0.9.0 — Hardening + UAT

### Added
- Production Readiness API and Hardening/UAT Center.
- Automated checks for Auth, Project membership/RLS, schema/RPC, Remote Security environment and quick data quality.
- Per-project manual regression checklist with copyable UAT report.
- Workspace route loading skeleton, error boundary and themed 404.
- Security response headers.
- V0.9.0 additive performance-index migration.
- `npm run preflight` release validation.

### Hardened
- Supabase-configured workspaces no longer silently fall back to the EPU demo project when no accessible Project exists.
- Resource Vault permission access is loaded in one batch instead of an N+1 query per resource.
- `*.tsbuildinfo` remains excluded from Git/source packages.

## V0.8.0 — Remote Server Security

- Real project-scoped Resource Vault.
- AES-256-GCM server-only encryption for credentials.
- Reveal/Copy authorization and no-store responses.
- Resource security audit logs.
- PM/Admin CRUD and Member per-resource grant foundation.
- Search/filter + secure resource drawer.
- Server-only Supabase service client.

## V0.7.0 — ISSUE Productivity

### Added
- Multi-row selection and bulk update for ISSUE fields.
- Per-user/per-project Saved Views.
- Per-user/per-project column visibility, order, width, pinning and page-size preferences.
- Quick Add ISSUE.
- Duplicate selected ISSUE.
- Server-side filtered CSV export.
- Sticky pinned columns and configurable grid layout.
- V0.7.0 API routes for bulk, views, preferences and export.
- Supabase migration `202608220006_v070_issue_productivity.sql`.

### Preserved
- ISSUE Core CRUD and audit history from V0.6.0.
- Dashboard, PLHĐ Unified View, Department Intelligence and multi-project context.

## V0.6.0 — Deploy type fix

- Unified `ThemedSelectOption` with the shared ISSUE `SelectOption` contract.
- `description` now correctly accepts `string | null | undefined`, matching Supabase lookup data.
- Fixes Vercel TypeScript error TS2322 in `components/issues/issue-workspace.tsx`.

## V0.6.0 — ISSUE Core

### Added
- Real Supabase ISSUE list scoped by selected project.
- Server-side search, filtering and pagination.
- ISSUE create/update/archive API.
- Inline edit for high-frequency fields.
- Professional detail drawer with Jira, dates, response and notes.
- Automatic per-project `issue_no`.
- Automatic `issue_history` trigger.
- History UI with actor and old/new values.
- Role-aware edit/archive behavior.
- Deep-link support from Dashboard, PLHĐ and Department Intelligence.
- Missing Module/Department/Assignee and Due Date attention filters.

### Changed
- App version updated to V0.6.0.
- Settings/System Foundation reflects ISSUE Core.
- ISSUE screen no longer uses `lib/mock-data.ts` in normal Supabase mode.

### Preserved
- Dashboard V0.3.0.
- PLHĐ Unified View V0.4.0.
- Department Intelligence V0.5.0.
- Project Switcher, logo, theme and Supabase Auth configuration.

### Security
- Uses authenticated Supabase session and existing RLS.
- Viewer is read-only.
- Member/PM/Admin may update ISSUE.
- Archive is restricted to PM/Admin in API.
- No service-role key is exposed to the browser.

### Deploy fix
- Fixed TypeScript control-flow narrowing in `components/issues/issue-workspace.tsx`: nested `renderCell()` now uses a stable non-null `currentData` reference instead of nullable React state `data`.
- Ignore/remove `*.tsbuildinfo` so local incremental TypeScript cache is not packaged or committed.
