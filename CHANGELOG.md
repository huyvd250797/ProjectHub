# Changelog

## V0.2.0 — Data Model + Import POC

### Product identity
- Project Hub is a **Project Workspace**, not an EPU workspace.
- EPU is the first/current project only.
- Added project context and project switcher foundation for future projects.
- Replaced the old generated ASC mark with the exact HV logo supplied by the user.
- The same supplied image is used as the app/browser icon.

### Data model
- Added multi-project PostgreSQL schema with `project_id` on business data.
- Added `projects`, `project_members`, `profiles`, `departments`, `people`, `project_stages`, `status_catalog`, `contract_items`, `contract_detail_items`, `release_versions`, `issues`, `issue_history`, `remote_resources`, `remote_resource_secrets`, `import_batches`, and `import_messages`.
- Added Supabase RLS membership/role foundation.
- Added EPU seed as project #1.

### Import POC
- Added `/settings/import`.
- Added server-side `.xlsx` dry-run using SheetJS (`xlsx`) and `ArrayBuffer` directly.
- Checks required sheets, counts, mapping, missing fields, module mismatches, duplicate Jira links, and selected-project mismatch.
- Password/token/secret columns from LinkRemoteServer are explicitly excluded from the import payload.
- V0.2.0 does not Apply Import to business tables yet.

### Deployability
- Keeps Demo Mode when Supabase is not configured.
- Does not use `output: "export"` and does not require an `out` directory.
- Avoids the ExcelJS/Node generic Buffer type issue by not using ExcelJS in the POC parser.

## V0.1.0 — Foundation / Deployable Skeleton
- Initial professional technology UI and deployable Next.js foundation.
