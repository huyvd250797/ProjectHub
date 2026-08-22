# Changelog

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
