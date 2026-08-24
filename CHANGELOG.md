# Changelog

## V0.9.2 — Excel Import Production / Template Round-trip

### Added
- Project-specific Excel template download from `Thiết lập → Excel Import Production`.
- Canonical Template V0.9.2 with hidden Project metadata to prevent cross-project import mistakes.
- Template sheets: PROJECT, GIAI ĐOẠN, PHÒNG BAN, NHÂN SỰ, PLHĐ, PLHĐ CHI TIẾT, ISSUE, RELEASE, RESOURCE and DANH MỤC.
- Database Preview showing incoming / insert / update counts before Apply Import.
- Production Apply Import with two modes: Merge and Insert Only.
- Transactional PostgreSQL RPC: failed import rolls back the whole batch.
- Stable `import_key` support for repeatable imports.
- `import_batches` record for every successful Apply Import.
- Template version validation and Project ID/code validation.

### Security
- Apply Import restricted to MASTER / Admin / PM.
- RESOURCE template intentionally has no password/token/secret fields.
- Remote Resource encrypted secrets are never overwritten by Excel metadata import.
- Uploaded XLSX is parsed in memory and is not persisted on the app server.

### Compatibility
- Legacy `[EPU] _ ASC-Working.xlsx` remains available for Dry-run analysis only.
- Production Apply requires the ASC WORKING V0.9.2 template.
