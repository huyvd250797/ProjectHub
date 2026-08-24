# Changelog

## V0.9.4 — Searchable Combobox & Sticky Grid UX

### Added
- Search box inside every shared themed combobox.
- Accent-insensitive Vietnamese option filtering by label, description and value.
- Searchable inline ISSUE cell comboboxes through `FloatingSelect`.
- Clear-search action and no-result state for dropdowns.
- Sticky ISSUE table header inside a dedicated scroll viewport.

### Changed
- Opening a combobox automatically focuses the search input.
- `ThemedSelect` keyboard navigation now operates on filtered options.
- ISSUE grid supports simultaneous vertical sticky header and horizontally pinned columns.
- Grid viewport uses internal scrolling so the header remains visible through long ISSUE lists.

### Compatibility
- No database migration required.
- V0.9.3 Project Profile schema remains unchanged.
- V0.9.2 Excel Import template remains unchanged.

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

## V0.9.3 Deploy Fix — Master Project Supabase typing

### Fixed
- Fixed Vercel TypeScript `TS2352` errors in Master Project API routes.
- Changed `MASTER_PROJECT_SELECT` from runtime `Array.join()` to a compile-time literal `as const`, preserving Supabase/PostgREST select inference.
- Removed unsafe `GenericStringError -> Record<string, unknown>` casts from Project GET/POST/PATCH flows.
- Hardened Master Project/Member normalizers to accept `unknown` and normalize object records safely.
