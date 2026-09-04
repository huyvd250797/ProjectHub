# Changelog

## V2.0.0 — Project Command Center

### Added

- Module `/command-center` mới cho màn điều hành trung tâm theo project đang chọn.
- API `/api/command-center` tổng hợp Project, ISSUE, PLHĐ, Master Plan, Execution Task, Milestone và Smart Reminder.
- Health Score, Action Board, Risk Radar, Delivery Timeline và Command Links.
- Navbar double-click reload để tải lại giao diện và dữ liệu module.
- Navbar Modules Manager có cột **Tên gốc** không sửa và **Tên hiển thị** có thể chỉnh.

### Database

- Không có migration mới.
- Tên hiển thị navbar lưu trong JSONB preference hiện có, tương thích dữ liệu cũ dạng array.

## V1.9.2 — Catalog Source of Truth

### Added

- Tab **Chi tiết PLHĐ** trong Project Master Data để xem, sửa, thêm và xóa `contract_detail_items`.
- Nút mở nhanh **Danh mục chi tiết PLHĐ** tại trang PLHĐ.
- Migration data-fix `202609040002_v192_catalog_source_of_truth.sql`.

### Fixed

- Lưới PLHĐ bên ngoài không còn hiển thị dòng `other` như một dòng PLHĐ.
- Danh mục PLHĐ và lưới PLHĐ dùng cùng nguồn `contract_items` cho `root/subsystem/module`.
- Import `other` được đưa vào Chi tiết PLHĐ để danh mục và lưới ngoài đồng bộ.

### Database

- Chuyển dữ liệu cũ `contract_items.item_type = 'other'` sang `contract_detail_items`.
- Cập nhật `get_project_contract` để overview chỉ trả `root/subsystem/module`.

## V1.9.0 — Cross-Project Portfolio Dashboard

### Added

- Module `/portfolio` mới cho Cross-Project Portfolio Dashboard.
- API `/api/portfolio` tổng hợp project, issues, stages, milestones, tasks và reminders.
- Project Ranking theo alert score.
- Priority Board cho danh sách project cần xử lý trước.
- KPI tổng nhiều project: active, at risk, late, open issues, reminders và contract value.
- Demo Mode cho Portfolio Dashboard.

### Changed

- Danh mục Phòng ban và Module bổ sung checkbox từng dòng và check all theo dữ liệu đang hiển thị.
- Bổ sung bulk hard delete cho Project Catalog.
- Import PLHĐ giữ đầy đủ cây `subsystem → module → other`; dòng `other` trong sheet PLHĐ được tách sang chi tiết PLHĐ, không ghi nhầm vào Danh mục Module.
- Health endpoint thêm feature `portfolio-dashboard`, `catalog-hard-delete`, `catalog-bulk-delete`.

### Safety

- Phòng ban đang được dùng bởi ISSUE, People hoặc Module owner không bị xóa.
- Module đang được dùng bởi ISSUE, Contract Detail hoặc Module con không bị xóa.
- Xóa catalog là hard delete, không archive.

## V1.8.0 — Smart Reminders & Alerts

### Added

- Tab Smart Alerts trong module Plan để gom cảnh báo và reminder cần xử lý.
- Tự phát hiện stage quá hạn, milestone sắp hạn/quá hạn, task sắp hạn/quá hạn và task bị chặn.
- Plan Reminders cho `manual`, `stage`, `milestone`, `task`, `issue`.
- API CRUD mới cho `/api/plan/reminders`.
- Thao tác nhanh Done và Snooze cho reminder.
- Dashboard metrics mới: Smart Alerts, reminder mở, nhắc hôm nay, reminder quá hạn.
- Export CSV bổ sung Smart Alerts và Plan Reminders.
- Demo Mode có dữ liệu reminder mẫu.

### Database

- Migration mới: `202609030004_v180_smart_reminders_alerts.sql`.
- Bảng mới: `project_plan_reminders`.
- RLS theo Project member; ghi dữ liệu dành cho MASTER/Admin/PM.
- Trigger validate entity cùng Project, tự quản lý `completed_at`, `snoozed_until`, Activity Center và Notification Center.

## V1.7.0 — Plan Execution & Tracking

### Added

- Execution Tasks cho module Plan, gắn vào Project Stage hoặc để độc lập.
- Trạng thái task: `todo`, `doing`, `blocked`, `done`; ưu tiên: `low`, `medium`, `high`, `critical`.
- Milestone Checklist để chia nhỏ điều kiện nghiệm thu theo từng milestone.
- Execution Dashboard: tiến độ thực thi, task done, task sắp hạn, task quá hạn/bị chặn và checklist completion.
- API CRUD mới cho `/api/plan/tasks` và `/api/plan/checklist`.
- Export CSV bổ sung phần Execution Tasks và Milestone Checklist.

### Database

- Migration mới: `202609030003_v170_plan_execution_tracking.sql`.
- Bảng mới: `project_plan_tasks`, `project_milestone_checklist_items`.
- RLS theo Project member, ghi dữ liệu chỉ dành cho MASTER/Admin/PM.
- Trigger validate stage/milestone/owner cùng Project, tự quản lý `completed_at` và Activity Center.

## V1.6.1 — Editable Stage Date Ranges

### Added

- Nhập/chỉnh trực tiếp Từ ngày và Đến ngày cho từng Project Stage.
- Chế độ lịch `manual` và `auto` theo từng stage.
- Tự tính số ngày inclusive theo calendar days hoặc business days của Master Plan.
- Nhãn cách lập lịch trên danh sách, roadmap, Gantt và cột CSV export.

### Scheduling safety

- Stage thủ công giữ nguyên khoảng ngày khi đổi thứ tự, đổi cấu hình Master Plan hoặc tính lại timeline.
- Stage tự động tiếp tục nối lịch sau stage thủ công mà không kéo con trỏ lịch lùi lại khi có overlap.
- Validation đồng nhất ở UI, API và database: đủ hai ngày, Đến ngày không trước Từ ngày, tối đa 3.650 ngày.
- RPC V1.6.0 được chuyển tiếp sang scheduler V1.6.1 để client cũ không ghi đè ngày thủ công.

### Database

- Migration mới: `202609030002_v161_stage_date_range.sql`.

## V1.6.0 — Master Plan & Project Stages

### Added

- Module Kế hoạch tại `/plan` với Tổng quan, Gantt Timeline, Project Stages và Milestones.
- Master Plan theo Project: mục tiêu, start/target date, calendar/business days, trạng thái và ghi chú.
- CRUD Project Stages: thời lượng, tiến độ, owner, màu, thứ tự và tự động tính lịch tuần tự.
- CRUD Milestones: due date, status, stage, owner, quick complete và cảnh báo quá hạn.
- Forecast end, variance so với target, weighted progress, Schedule Health và export CSV.
- Activity events cho thay đổi Master Plan, Stage và Milestone.

### Compatibility & Security

- Mở rộng bảng `project_stages` hiện hữu để giữ nguyên liên kết ISSUE/Dashboard/Import.
- MASTER/Admin/PM được chỉnh sửa; Member/Viewer chỉ xem; mọi truy vấn tuân thủ Project RLS.
- Master Plan dates đồng bộ sang `projects.start_date/due_date` cho Dashboard và Analytics.
- Migration mới: `202609030001_v160_master_plan_project_stages.sql`.

## V1.5.0 — ISSUE Visual Customization & Workspace Layout

- Thêm trình cấu hình màu viền, background và chữ cho từng giá trị tag Trạng thái, Trạng thái KH, Ưu tiên và Phụ trách.
- Tiêu đề cột ISSUE hỗ trợ HTML5 drag-and-drop để đổi vị trí hiển thị trực tiếp.
- Thêm nút Ẩn lọc/Hiện lọc; trạng thái mặc định là hiện và được lưu trong ISSUE preference.
- Thêm trình sắp xếp module navbar trái bằng kéo-thả hoặc mũi tên.
- ISSUE preference lưu theo user + Project; workspace navigation preference lưu toàn cục theo user.
- Migration mới: `202608270002_v150_issue_workspace_personalization.sql`.

## V1.4.0 — Attachment & Project Documents / Google Drive

- Thêm workspace `Tài liệu` theo từng Project với thống kê, tìm kiếm và bộ lọc.
- Upload Google Drive kiểu resumable trực tiếp từ trình duyệt, hiển thị tiến độ, tối đa 250 MB/file.
- Tạo tự động thư mục gốc `ASC-WORKING` và thư mục riêng cho từng Project; hỗ trợ thư mục gốc cấu hình sẵn.
- Supabase lưu metadata, upload verification session và liên kết nghiệp vụ; Drive giữ binary private.
- Xem trước/tải file qua proxy có kiểm tra đăng nhập và quyền Project.
- Quyền: Member upload/xem; Viewer xem; MASTER/Admin/PM sửa metadata và soft archive.
- Chặn file thực thi/script phổ biến; upload session có one-time token hash và thời hạn một giờ.
- Migration mới: `202608270001_v140_google_drive_documents.sql`.

## V1.3.2 — Bulk Master Data Import / Direct Excel

- Import trực tiếp Excel cho Phòng ban, PLHĐ và PLHĐ chi tiết theo từng Project.
- Hỗ trợ file 3 sheet đơn giản hiện có; không bắt buộc header, `__META`, key hay template chuẩn.
- Tự suy luận cấu trúc Nhóm / Phân hệ / Module từ sheet PLHĐ một cột.
- Tự dựng cây PLHĐ chi tiết từ mã A / I / 1 / 1.1 / 1,1... và cố gắng mapping Module theo tên.
- Preview số dòng + Insert/Update + cảnh báo trước Apply.
- Merge transaction, không xóa dữ liệu ngoài file.
- Chống duplicate khi import lại nhờ import_key + business identity + reference Project hiện có.
- Import nhanh có sẵn tại Phòng ban, PLHĐ và Danh mục Project; phạm vi mặc định theo màn hình.
- **Tải mẫu Excel chuẩn trước khi Import**; template có HƯỚNG DẪN + 3 sheet dữ liệu và được đóng gói sẵn trong `public/templates`.
- Backfill + tự sinh import_key cho dữ liệu master tạo thủ công.
- RPC mới: `preview_quick_master_import_v132` và `apply_quick_master_import_v132`.

## V1.3.1 — Project Master Data & Wide Modal UX

- Bổ sung danh mục Phòng ban theo từng Project.
- Bổ sung danh mục Module PLHĐ theo từng Project.
- Thêm API `/api/project-catalog` với project-scope + role guard MASTER/Admin/PM.
- Tự refresh ISSUE/PLHĐ/Department Intelligence sau thay đổi danh mục.
- Chuyển ISSUE create/edit, Project Profile và Resource Vault sang wide modal.
- Sửa lỗi cú pháp `finally` bị lặp trong `issue-drawer.tsx` của source V1.3.0 đóng gói.
- Không có migration database mới.

## V1.3.0 — Executive Report & Project Summary

### Added
- Executive Report theo Project với kỳ tuần/tháng/30d/90d/all/custom.
- Project Summary cho quản lý: Health Score, schedule, ISSUE, handover, risk Module/Phòng ban/Member.
- PM Comment và Kế hoạch tiếp theo.
- Report Snapshot + so sánh snapshot trước.
- Export CSV và print/PDF layout.
- ISSUE Full Screen với một vùng scroll lưới duy nhất và phím `Esc` để thoát.

### Database
- `report_snapshots` + RLS theo Project.
- MASTER/Admin/PM được lưu/cập nhật/xóa snapshot; Member/Viewer chỉ xem.
- Activity Center ghi nhận thao tác lưu/cập nhật snapshot.

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

## V1.2.0 DeployFix
- Fix TypeScript TS18047 in `app/api/issues/route.ts` by using a stable non-null Supabase client inside the nested ISSUE row query builder.
- Preserve corrected PostgreSQL `FILTER` syntax in `202608260002_v120_analytics_health.sql`.
