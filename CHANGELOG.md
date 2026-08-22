# Changelog

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
