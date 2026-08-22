# Changelog

## V0.4.0 — PLHĐ Unified View

### Added
- Real project-scoped PLHĐ API using `get_project_contract`.
- Unified overview/detail contract screen.
- Virtualized detail tree for 5,000+ nodes.
- Contract search, filters, focus-by-module, expand/collapse.
- Module issue/handover aggregates and drill-down links.
- Detail drawer and mapping state.
- Professional custom themed select/combobox.

### Fixed
- App logo now reloads current page when clicked.
- Login spinner remains active until successful redirect unmounts the login page.
- Project selector no longer uses the browser-native unthemed dropdown.

### Database
- Added `202608220003_v040_contract_rpc.sql`.

## V0.3.0 — Dashboard / Real Project Data

### Branding
- Rename application from PROJECT HUB / Project Hub to **ASC WORKING**.
- Keep `Project Workspace` as the product/workspace description.
- EPU remains a project, never the workspace identity.
- Keep the exact HV logo/image already supplied by the user for app logo and browser icon.

### Dashboard
- Replaced Dashboard seed/mock flow with project-scoped API loading when Supabase is configured.
- Added `/api/dashboard?projectId=`.
- Added `get_project_dashboard(uuid)` Supabase RPC for server-side aggregation.
- Project Overview, Master Plan health, Stage progress.
- ISSUE status and customer handover KPI.
- Needs Attention panel.
- Contract Pulse.
- Department ranking and ASC member workload.
- Project switch immediately reloads Dashboard for the selected project.
- Added loading, empty-data and migration-required states.

### Multi-project
- Dashboard queries are isolated by `project_id`.
- Updated localStorage key to `asc-working:selected-project-id` with one-time migration from the old Project Hub key.
- Removed hard-coded ISSUE count from Sidebar because it was EPU-specific.

### Database
- Added `supabase/migrations/202608220002_v030_dashboard_rpc.sql`.

## V0.2.0 — Data Model + Import POC
- Multi-project schema and RLS foundation.
- Import dry-run POC.

## V0.1.0 — Foundation / Deployable Skeleton
- Initial deployable Next.js foundation.
