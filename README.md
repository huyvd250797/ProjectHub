# ASC WORKING — V1.9.0

## V1.9.0 có gì mới?

- Module **Portfolio** mới tại `/portfolio` để quản lý nhiều project trong một màn hình.
- KPI tổng: số project, project At Risk/Late, open issues, reminders và tổng giá trị hợp đồng.
- **Project Ranking** xếp hạng project theo alert score để biết dự án nào cần xử lý trước.
- **Priority Board** liệt kê các project có overdue/blocker/reminder nổi bật.
- Danh mục **Phòng ban** và **Module** có checkbox từng dòng, check all theo danh sách đang lọc.
- Bulk delete là **hard delete**, không archive.
- Phòng ban đang được dùng bởi ISSUE, People hoặc Module owner sẽ không bị xóa.
- Module đang được dùng bởi ISSUE, Contract Detail hoặc Module con sẽ không bị xóa.
- API trả rõ số dòng đã xóa và số dòng bị chặn.

Chạy schema đến V1.8.0 trước. V1.9.0 không cần bảng mới; có note tại `supabase/migrations/202609040001_v190_portfolio_catalog_delete_notes.sql` và UAT theo `docs/UAT_V190_PORTFOLIO_CATALOG_DELETE_CHECKLIST.md`.

## V1.8.0 có gì mới?

- Module Plan có tab **Smart Alerts** để gom các việc cần chú ý ngay.
- Tự phát hiện stage quá hạn, milestone sắp hạn/quá hạn, task sắp hạn/quá hạn và task bị chặn.
- Thêm **Plan Reminders** cho Master Plan, Project Stage, Milestone, Execution Task hoặc ISSUE liên quan.
- Reminder có trạng thái `open`, `snoozed`, `done`, `cancelled`, mức ưu tiên và người phụ trách.
- Có thao tác nhanh **Done** và **Snooze** ngay trong màn Smart Alerts.
- Reminder đến hạn được ghi Activity Center và đẩy vào Notification Center theo người phụ trách.
- Dashboard Plan bổ sung số Smart Alerts, reminder mở, reminder hôm nay và reminder quá hạn.
- Export CSV bổ sung Smart Alerts và Plan Reminders.
- Demo Mode có dữ liệu reminder/cảnh báo mẫu.

Chạy các migration đến V1.7.0 trước, sau đó chạy `supabase/migrations/202609030004_v180_smart_reminders_alerts.sql` và UAT theo `docs/UAT_V180_SMART_REMINDERS_ALERTS_CHECKLIST.md`.

## V1.7.0 có gì mới?

- Module Plan chuyển từ lập lịch sang **theo dõi thực thi** với Execution Tasks theo từng stage.
- Task có deadline, trạng thái, ưu tiên, người phụ trách, mô tả và thao tác Done nhanh.
- Dashboard Plan có thêm Execution Progress, task sắp hạn, task quá hạn, task bị chặn và checklist nghiệm thu.
- Milestone có **checklist điều kiện hoàn thành**, tick/sửa/xóa từng dòng ngay trong màn Milestones.
- Health của kế hoạch tính thêm task bị chặn/quá hạn bên cạnh stage/milestone.
- Export CSV bổ sung Execution Tasks và Milestone Checklist.
- Demo Mode có dữ liệu task/checklist mẫu để kiểm UI ngay cả khi chưa kết nối Supabase.

Chạy migration V1.6.0, V1.6.1 trước, sau đó chạy `supabase/migrations/202609030003_v170_plan_execution_tracking.sql` và UAT theo `docs/UAT_V170_PLAN_EXECUTION_TRACKING_CHECKLIST.md`.

## V1.6.1 có gì mới?

- Form Project Stage cho phép chọn **Nhập Từ ngày – Đến ngày** hoặc **Tự động theo Master Plan**.
- Khi nhập ngày thủ công, **Số ngày** được tự tính theo chế độ ngày lịch/ngày làm việc của Master Plan.
- Khoảng ngày thủ công được khóa và không bị ghi đè khi đổi thứ tự stage, chỉnh Master Plan hoặc bấm **Tính lại lịch**.
- Các stage tự động phía sau tiếp tục được xếp lịch từ stage thủ công; Timeline, Forecast, tiến độ có trọng số và CSV dùng ngay khoảng ngày mới.
- Bảng Project Stages và Gantt hiển thị rõ stage **Nhập ngày** / **Tự động**.

Chạy migration V1.6.0 trước, sau đó chạy `supabase/migrations/202609030002_v161_stage_date_range.sql` và UAT theo `docs/UAT_V161_STAGE_DATE_RANGE_CHECKLIST.md`.

## V1.6.0 có gì mới?

- Module **Kế hoạch** mới tại `/plan`, tách dữ liệu theo Project và tuân thủ MASTER/Admin/PM/Member/Viewer.
- **Master Plan** gồm mục tiêu, ngày bắt đầu, target end date, cách tính ngày lịch/ngày làm việc, trạng thái và ghi chú điều hành.
- Danh mục **Project Stages** hoàn chỉnh: mã, tên, mô tả/đầu ra, số ngày, tiến độ, trạng thái, người phụ trách, màu và thứ tự.
- Tự động tính ngày bắt đầu/kết thúc tuần tự của các stage dựa trên ngày Master Plan, số ngày và thứ tự stage.
- **Gantt Timeline** có thanh tiến độ, vạch hôm nay, target date và milestone gắn với từng stage.
- **Milestones** theo dõi mốc phê duyệt/bàn giao, ngày hạn, trạng thái, stage và owner; có cảnh báo quá hạn.
- Schedule Health, forecast end date, lệch target, tiến độ có trọng số, current stage, next milestone và export CSV.
- Project Stage tiếp tục dùng chung với ISSUE, Dashboard và Excel Import; không tạo danh mục trùng lặp.
- Thay đổi Master Plan/Stage/Milestone được ghi vào Activity Center.

Chạy migration `supabase/migrations/202609030001_v160_master_plan_project_stages.sql`, sau đó UAT theo `docs/UAT_V160_MASTER_PLAN_CHECKLIST.md`.

## V1.5.0 có gì mới?

- Tùy chỉnh riêng màu **viền, nền và chữ** cho tag Trạng thái, Trạng thái KH, Ưu tiên và Phụ trách trong ISSUE.
- Kéo-thả trực tiếp tiêu đề cột ISSUE để thay đổi thứ tự hiển thị; vẫn hỗ trợ cấu hình cột chi tiết.
- Ẩn/hiện thanh bộ lọc ISSUE; mặc định bộ lọc được hiển thị.
- Sắp xếp vị trí các module ở navbar trái bằng kéo-thả hoặc nút mũi tên.
- Cấu hình ISSUE lưu theo tài khoản + Project; thứ tự navbar lưu theo tài khoản trên toàn workspace.

Chạy migration `supabase/migrations/202608270002_v150_issue_workspace_personalization.sql`, sau đó UAT theo `docs/UAT_V150_ISSUE_PERSONALIZATION_CHECKLIST.md`.

## V1.4.0 có gì mới?

- **Project Documents** tại `/documents`, dùng riêng theo từng Project.
- Upload trực tiếp từ trình duyệt lên **Google Drive** bằng resumable upload, có tiến độ và giới hạn 250 MB/file.
- Metadata, phân loại, liên kết nghiệp vụ, quyền truy cập và audit lưu trong Supabase; nội dung file không đi qua database.
- File Drive giữ private; xem trước/tải xuống qua API ứng dụng sau khi xác nhận Project role.
- MASTER/Admin/PM quản lý metadata và lưu trữ; Member được upload/xem; Viewer chỉ xem.
- Lưu trữ là soft archive metadata, không xóa file gốc khỏi Google Drive.

Triển khai theo `docs/GOOGLE_DRIVE_V140_SETUP.md`, chạy migration `supabase/migrations/202608270001_v140_google_drive_documents.sql`, sau đó UAT theo `docs/UAT_V140_PROJECT_DOCUMENTS_CHECKLIST.md`.

## V1.3.2 có gì mới?

- Import trực tiếp danh sách **Phòng ban**, **PLHĐ** và **PLHĐ chi tiết** từ Excel hiện có.
- Hỗ trợ file đơn giản 3 sheet, kể cả file không header/không key như `IMP-PLHD-PhongBan.xlsx`.
- Preview trước khi Apply: số dòng, cấu trúc tự nhận diện, cảnh báo mapping, số bản ghi Thêm/Cập nhật.
- Import Merge theo Project, chống trùng khi import lại và không xóa dữ liệu ngoài file.
- Nút Import nằm ngay tại Phòng ban, PLHĐ và modal Danh mục Project.
- Migration `202608260004_v132_bulk_master_data_import.sql` bổ sung import key + RPC preview/apply cho Direct Excel.

Xem `docs/V1.3.2-SCOPE.md`, `docs/V1.3.2-DIRECT-EXCEL-IMPORT.md` và `docs/UAT_V132_BULK_IMPORT_CHECKLIST.md`.

## V1.3.1 có gì mới?

- Project Master Data: khai báo **Phòng ban** và **Module PLHĐ** riêng theo từng Project.
- MASTER/Admin/PM được tạo/sửa; Member/Viewer chỉ xem.
- ISSUE/PLHĐ/Department Intelligence tự refresh sau khi danh mục thay đổi.
- Form nhập nhiều trường chuyển sang **wide modal**: ISSUE, Hồ sơ Project và Resource Vault.
- Không cần migration Supabase mới; database baseline vẫn đến V1.3.0.

Xem `docs/V1.3.1-SCOPE.md` và `docs/UAT_V131_PROJECT_MASTER_DATA_CHECKLIST.md`.

## V1.3.0 có gì mới?

- **Executive Report & Project Summary** tại `/reports`.
- Báo cáo theo Tuần / Tháng / 30 ngày / 90 ngày / Toàn bộ / khoảng ngày tùy chọn.
- Project Summary một màn hình: Health Score, schedule, ISSUE, bàn giao và top risk.
- PM Comment + Kế hoạch tiếp theo theo từng kỳ báo cáo.
- Snapshot để so sánh kỳ hiện tại với snapshot trước.
- Export CSV và In / Save as PDF từ trình duyệt.
- Dùng cùng preference ẩn/hiện Giá trị HĐ với Dashboard.
- ISSUE có **Full Screen**: phủ toàn workspace, bỏ sidebar/topbar và chỉ còn một vùng scroll của lưới ISSUE; `Esc` để thoát.

### Migration V1.3.0

Chạy sau V1.2.0:

```text
supabase/migrations/202608260003_v130_executive_reports.sql
```

Migration chỉ bổ sung `report_snapshots`, RLS và Activity trigger cho snapshot báo cáo. Không cần Environment Variable mới.

## V1.2.0 có gì mới?

- **Advanced Analytics & Project Health** theo Project.
- Project Health Score dựa trên tiến độ ISSUE, bàn giao, quá hạn, chất lượng dữ liệu và kế hoạch.
- Trend ISSUE, Backlog Aging, risk Module/Phòng ban/Member.
- Export CSV báo cáo Project Health.
- Dashboard cho phép ẩn/hiện Giá trị HĐ.
- ISSUE cho phép 50 / 100 / 500 / 1000 / ALL dòng.
- `ALL` tải theo chunk server-side để giảm rủi ro giới hạn PostgREST.

### Migration V1.2.0

Chạy trong Supabase SQL Editor:

```text
supabase/migrations/202608260002_v120_analytics_health.sql
```

Không cần Environment Variable mới.


**ISSUE Delete / CRUD Completion** — hoàn thiện CRUD ISSUE với xóa mềm an toàn và bulk delete.


## V1.1.3 có gì mới?

- Nút **Xóa ISSUE** hiển thị rõ trong drawer chi tiết.
- Chọn nhiều ISSUE → **Xóa** hàng loạt.
- User có quyền sửa ISSUE cũng được phép xóa; Viewer không được xóa.
- Xóa sử dụng `archived_at` (soft delete), không hard-delete record.
- Không cần migration Supabase mới.

## V1.1.2 có gì mới?

- Validation tạo ISSUE chi tiết theo field, không còn chỉ báo lỗi chung chung.
- Project Team cho phép thêm Họ tên + Role trước, email/login bổ sung sau.
- Nhân sự chưa có email vẫn có thể được giao ISSUE và thống kê workload.
- Tự liên kết Supabase login khi email tồn tại trong profiles.
- Tối ưu ISSUE summary thành 1 RPC aggregate; giảm query lookup và hủy stale request.
- Notification polling tạm dừng khi tab ẩn.

### Migration V1.1.2

Chạy sau migration V1.1.0:

```text
supabase/migrations/202608260001_v1111_team_validation_performance.sql
```


## V1.1.0 có gì mới?

- Bell Notification Center ngay trên Topbar, theo Project đang chọn.
- Badge số lượng chưa đọc, đánh dấu từng thông báo hoặc `Đọc tất cả`.
- Deep-link từ thông báo đến đúng ISSUE / Project / Import / Resource.
- Activity Center tại `/activity` với feed theo Project.
- Filter Activity theo ISSUE / Project / Import / Resource.
- Activity ghi nhận thay đổi ISSUE, Project Member, Excel Import và Resource Vault.
- Due Reminder cho ISSUE đang phụ trách: còn tối đa 3 ngày, đến hạn hôm nay hoặc quá hạn.
- Notification Preferences theo từng user + từng Project.
- Notification cho ISSUE được giao, ISSUE cập nhật, thay đổi Project Member, Import hoàn tất và security event quan trọng.
- Dark / Light Mode V1.0.1 được giữ nguyên.

## Production scope hiện tại

- Multi-project + Project Switcher.
- Master Plan + Project Stages + Gantt Timeline + Milestones.
- MASTER toàn hệ thống; Admin / PM / Member / Viewer theo Project.
- Project Profile + Project Team / ISSUE Assignee Sync.
- Dashboard dữ liệu thật theo Project.
- PLHĐ Unified View + virtualized detail tree.
- Department Intelligence.
- ISSUE Core + Productivity: CRUD, inline edit, bulk update, saved views, column preferences, export.
- Searchable combobox toàn hệ thống + sticky ISSUE grid header.
- Excel Import Production: tải template → fill → preview → transaction apply.
- Remote Server Security: AES-256-GCM, Reveal/Copy permission, audit.
- Notifications & Activity Center.
- Hardening & UAT Center.
- Dark / Light Mode.
- System Information.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
APP_URL=
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

`SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY` và toàn bộ Google Drive OAuth là **server-only**. Không dùng `NEXT_PUBLIC_` và không commit vào Git.

## Database migration V1.1.0

Nếu database hiện đã chạy đến V0.9.5, chạy thêm:

```text
supabase/migrations/202608250001_v110_notifications_activity.sql
```

Migration tạo:

- `activity_events`
- `notifications`
- `notification_preferences`
- ISSUE activity/notification trigger
- Project Member activity/notification trigger
- Resource Vault activity/security notification trigger
- Excel Import activity notification trigger
- lazy Due Reminder function
- backfill Activity trong 30 ngày gần nhất

## Database migration V1.1.2

Sau migration V1.1.0, chạy thêm:

```text
supabase/migrations/202608260001_v1111_team_validation_performance.sql
```

Migration bổ sung `people.is_active`, Project Team index, `get_issue_summary_v1111`, `get_issue_lookups_v1111` và trigram search indexes.

## Local

```bash
npm install
npm run preflight
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Vercel

- Framework: Next.js.
- Build Command: Default (`npm run build`).
- Output Directory: **Default / để trống**.
- Cấu hình environment variables rồi Redeploy.
- Chạy migration V1.1.0 trước khi test Notification Center.

## Test nhanh V1.1.0

1. Login và chọn Project.
2. Mở icon chuông trên Topbar.
3. Giao một ISSUE cho user khác → user đó nhận thông báo.
4. Đổi status/Due Date ISSUE → người phụ trách nhận update.
5. Tạo ISSUE Due Date ≤ 3 ngày → mở app bằng assignee để nhận Due Reminder.
6. Vào `Hoạt động` và kiểm tra Activity Feed.
7. Vào tab `Cài đặt`, tắt một loại thông báo và xác nhận loại đó không tạo notification mới.
8. Mark read / Mark all read và kiểm tra badge.

Xem thêm:
- `docs/NOTIFICATIONS_ACTIVITY_V110_SETUP.md`
- `docs/UAT_V110_NOTIFICATIONS_CHECKLIST.md`
- `docs/V1.1.0-SCOPE.md`

© 2026 HuyVo. All rights reserved.
