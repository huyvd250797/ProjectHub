# EPU workbook — V0.2.0 dry-run baseline

Source template used for the first Project Hub project: `[EPU] _ ASC-Working.xlsx`.

This document records counts only. It contains no remote/server passwords or secrets.

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

Known data-quality baseline from the original POC analysis:
- ISSUE missing Module: 23
- ISSUE missing Department: 14
- ISSUE missing Assignee: 22
- Unique ISSUE Module names not exact-matched to PLHĐ: 7
- Duplicate Jira occurrences beyond first: 7

`ISSUE!B3` contains content while the operational primary range starts at row 4. The V0.2.0 dry-run emits `ISSUE_PRE_RANGE_ROW` instead of silently importing that row.

Remote credential columns are excluded from dry-run payloads and normal metadata import.
