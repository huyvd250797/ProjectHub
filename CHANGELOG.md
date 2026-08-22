# Changelog

## V0.2.0 — Data Model + Import POC

### Changed
- Product identity corrected to **Project Workspace**.
- EPU is treated as the first/current project, not the name of the workspace.
- Added project switcher foundation for future projects.
- Updated footer/version to V0.2.0.
- Replaced generated ASC mark with the user-provided HV logo throughout the app and as app icon.

### Added
- Multi-project Supabase/PostgreSQL schema with `project_id` on business data.
- Core tables: projects, members, departments, people, stages, status catalog, PLHĐ, PLHĐ detail, issues, history, releases, remote resources, import batches/messages.
- RLS membership/role foundation.
- Seed for EPU as project #1.
- Import Dry-run API using ExcelJS.
- `/settings/import` UI with workbook structure, counts, mapping and data-quality warnings.
- Remote secret columns are excluded from import payload.
- `/api/health`.

### Carried from V0.1.0
- Next.js deployable skeleton.
- Supabase SSR/Auth foundation.
- Professional dark-tech UI.
- Dashboard / PLHĐ / Phòng ban / ISSUE / Remote Server routes.

## V0.1.0 — Foundation / Deployable Skeleton
- Initial deployable application shell and UX foundation.
