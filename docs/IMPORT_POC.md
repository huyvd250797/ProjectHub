# Import POC — behavior

Route: `/settings/import`
API: `POST /api/import/dry-run`

## Expected source sheets
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

## Current mapping
| Sheet | Target |
| --- | --- |
| DASHBOARD | projects + project_stages |
| PLHĐ | contract_items |
| PLHĐ - Chi tiết | contract_detail_items |
| ISSUE | issues |
| Phòng ban | derived view from issues/departments |
| Nhân sự trường | departments + people(customer) |
| Member | people(asc) |
| TrangThai | status_catalog |
| Version release | release_versions |
| LinkRemoteServer | remote_resources metadata only |

## Security
The dry-run deliberately does **not** return/import:
- Pass remote
- Password máy
- password
- password SQL

The file is parsed in memory for the request and is not persisted by the endpoint.

## Why dry-run first?
The workbook has formulas and cross-sheet text mappings. A dry-run creates a repeatable validation boundary before any transaction writes production data.
