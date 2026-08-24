# Changelog

## V0.9.3 — Project Profile / Project Management

### Added
- Editable Project Profile inside Master Project Console.
- Unified Project drawer with `Hồ sơ dự án` and `Thành viên` tabs.
- School/organization fields: name, code and address.
- Project description and operational notes.
- Contract value/date and project schedule editing.
- Primary customer contact: name, title, email and phone.
- Project Profile readiness check.
- V0.9.3 migration extending `public.projects`.

### Changed
- `Quản lý thành viên` action renamed to `Quản lý Project`.
- Project creation opens the Project drawer immediately for completing the profile.
- Project search also matches organization code and primary contact.
- Project Switcher/server layout refresh after profile save.

### Compatibility
- V0.9.2 Excel Import Production remains unchanged and continues using Template version 0.9.2.
- Existing projects keep all current data; new profile columns are nullable.

## V0.9.2 — Excel Import Production / Template Round-trip

- Project-specific Excel template download.
- Dry-run/database preview and transactional Apply Import.
- Merge/Insert Only modes with stable import keys.
- RESOURCE metadata import excludes password/token/secret.
