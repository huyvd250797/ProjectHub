# EPU workbook — Import Dry-run baseline

Source used to design V0.2.0: `[EPU] _ ASC-Working.xlsx`.

This file intentionally records **counts only**. No remote/server password or secret is copied here.

## Primary business counts

| Dataset | Baseline |
| --- | ---: |
| ISSUE primary range (row 4+) | 313 |
| PLHĐ Module | 90 |
| PLHĐ Phân hệ | 12 |
| PLHĐ detail content rows | 5,677 |
| Departments from `Nhân sự trường` | 9 |
| Customer people | 32 |
| ASC members | 5 |
| Release dates | 24 |
| Remote resource metadata rows | 18 |

## Data-quality baseline

| Check | Count |
| --- | ---: |
| ISSUE missing Module | 23 |
| ISSUE missing Department | 14 |
| ISSUE missing Assignee | 22 |
| Unique ISSUE Module names not exact-matched to PLHĐ Module | 7 |
| Duplicate Jira occurrences beyond first | 7 |

## Important boundary finding

`ISSUE!B3` contains content, but the workbook's operational formulas used by Dashboard / PLHĐ / Phòng ban start their main ISSUE range at row 4. Therefore V0.2.0:

1. counts row 4+ as the **313 primary ISSUE records**;
2. raises `ISSUE_PRE_RANGE_ROW` for row 3;
3. does not silently apply/import row 3 until a PM confirms how that row should be treated.

## Secret handling

The following `LinkRemoteServer` columns are excluded from the dry-run payload and from future normal metadata import:

- Pass remote
- Password máy
- password
- password SQL

Credential storage is separated architecturally into a server-only secret table with no authenticated-browser RLS policy.
