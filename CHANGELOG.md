# Changelog

## V1.2.0 — Advanced Analytics & Project Health

### Added
- Advanced Analytics theo Project với Project Health Score 0–100.
- Trend ISSUE tạo mới / xử lý theo thời gian.
- Backlog Aging và phân bổ trạng thái / ưu tiên.
- Risk Ranking cho Module, Phòng ban và Thành viên.
- Export CSV Project Health.
- Sidebar Analytics.
- Ẩn/hiện Giá trị hợp đồng trên Dashboard, lưu preference ở browser.
- ISSUE page size 50 / 100 / 500 / 1000 / ALL.
- ALL được tải theo chunk server-side thay vì một response không giới hạn.

### Database
- RPC `get_project_analytics_v120`.
- Index analytics cho ISSUE / history.
- Mở rộng constraint `issue_user_preferences.page_size`.

## V1.1.3 — ISSUE Delete / CRUD Completion

### Added
- Hiển thị rõ nút `Xóa ISSUE` trong drawer chi tiết.
- Xóa nhiều ISSUE trực tiếp từ thanh thao tác hàng loạt.
- User có quyền chỉnh sửa ISSUE cũng có quyền xóa; Viewer vẫn chỉ đọc.

### Safety
- Xóa là soft-delete qua `archived_at`, không hard-delete dữ liệu nghiệp vụ.
- ISSUE đã xóa biến khỏi danh sách hoạt động nhưng lịch sử/audit vẫn được giữ.
- Có confirm trước khi xóa một hoặc nhiều ISSUE.
- Không yêu cầu migration Supabase mới vì `archived_at` đã có từ ISSUE Core.

## V1.1.2 — Project UUID Compatibility Hotfix

- Fix ISSUE create validation rejecting the legacy EPU project UUID.
- UUID validation now matches PostgreSQL canonical UUID syntax instead of requiring RFC version/variant nibbles.
- No database migration required.

# Changelog

## V1.1.1 — Issue Validation / Flexible Project Team / Performance Tune

### Added
- ISSUE create validation now reports exact missing/invalid fields in the drawer.
- Project Team members can be created with name + role only; email/login can be linked later.
- Active Project Team members are the assignee source even when they do not have a Supabase account yet.
- Single-RPC ISSUE summary aggregation with fallback for pre-migration environments.

### Improved
- Reduced ISSUE lookup requests by removing unnecessary profile/membership joins for assignee choices.
- Cancels stale ISSUE list requests during rapid filter/search changes.
- Notification polling pauses while the browser tab is hidden.
- Added trigram indexes for ISSUE and team search.

## V1.1.0 — Notifications & Activity Center

### Added
- Bell Notification Center với unread badge, mark read và mark all read.
- Activity Center theo Project với filter ISSUE / Project / Import / Resource.
- ISSUE assignment/update notifications và lazy Due Reminder.
- Project Member, Import và Resource Vault activity events.
- Per-user/per-project notification preferences.
- 30-day Activity backfill cho ISSUE và Resource Vault.

### Security
- Notification inbox chỉ đọc/cập nhật bởi chính user.
- Activity Feed tuân theo Project RLS / MASTER access.
- Resource security events không chứa plaintext credential.

### Database
- `202608250001_v110_notifications_activity.sql`

## V1.0.1 — Dark Mode Contrast & Visual Polish

### Changed
- Nâng nền dark navy lên một cấp để giảm cảm giác đen đặc.
- Tăng tương phản toàn bộ thang chữ slate, đặc biệt metadata/placeholder/label phụ.
- Tăng độ rõ border, panel, input, combobox và theme toggle trong Dark Mode.
- Giữ nguyên Light Mode và toàn bộ nghiệp vụ/database của V1.0.0.
- Không yêu cầu migration Supabase mới.

## V1.0.0 — Production Release

### Added
- Dark / Light Mode toggle bằng icon Sun/Moon ở Topbar và Login.
- Theme preference lưu trong `localStorage`, fallback theo OS theme.
- Light theme cho app shell, panel, grid, form, dropdown và common typography.
- `Thiết lập → System Information` để kiểm tra runtime production mà không expose secret.
- Production release/checklist, backup/restore/rollback và final UAT docs.

### Production hardening
- Chuẩn hóa version runtime / health / readiness thành V1.0.0.
- Giữ nguyên schema baseline đến migration V0.9.5; không tạo migration không cần thiết chỉ để đổi version.
- Preflight mở rộng cho theme + System Information + production docs.

## V0.9.5 — Project Team / ISSUE Assignee Sync

### Added
- Họ tên + email đăng nhập + role trong Project Member form.
- `people.user_id` liên kết profile/project member với nhân sự ASC.
- Project Members trở thành nguồn duy nhất của combobox Phụ trách ISSUE.
- Hiển thị email + role trong option Phụ trách.
- Nút sửa member và trạng thái đồng bộ Phụ trách.
- Legacy assignee display cho ISSUE lịch sử.

### Changed
- MASTER access vẫn toàn cục, nhưng muốn xuất hiện trong Phụ trách thì thêm MASTER vào Project Member.
- API ISSUE từ chối assignee không còn thuộc Project.
- Gỡ member khỏi Project không xóa dữ liệu lịch sử assignee.

### Database
- `202608240006_v095_project_members_assignees.sql`

## V0.9.5 Deploy Fix — ISSUE assignee SelectOption typing

### Fixed
- Fixed Vercel TypeScript `TS2677` in `lib/issues/server.ts`.
- Explicitly typed the assignee mapping callback as `SelectOption | null` before filtering null values.
- Preserves optional/nullable `description` semantics from the shared `SelectOption` type without unsafe casts.
- No database migration required.

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
