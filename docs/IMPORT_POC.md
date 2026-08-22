# Import POC — V0.2.0

Route: `/settings/import`

## What it does
The user selects the target project in ASC WORKING, uploads a `.xlsx` workbook, and runs a dry-run. The endpoint:
- parses the workbook in memory;
- validates expected project sheets;
- profiles row counts;
- maps sheets to PostgreSQL tables;
- detects missing Module / Department / Assignee;
- detects unmatched Module names and duplicate Jira links;
- compares workbook project code with the currently selected project;
- excludes password/token/secret columns from LinkRemoteServer.

## What it does NOT do
- Does not persist the uploaded workbook.
- Does not insert/update business records.
- Does not import credentials.
- Does not silently choose another project.

## Expected template sheets
- DASHBOARD
- PLHĐ
- PLHĐ - Chi tiết
- ISSUE
- Phòng ban
- Nhân sự trường
- Member
- TrangThai
- Version release
- LinkRemoteServer

## EPU template note
The current EPU template uses row 4 as the official ISSUE data boundary. If row 3 contains content, the POC emits a warning and excludes it from the primary count until PM confirmation.

## Parser choice
V0.2.0 uses `xlsx` (SheetJS) and passes the uploaded `ArrayBuffer` directly. This avoids the ExcelJS + newer Node Buffer generic type mismatch that can break Vercel type-checking.
