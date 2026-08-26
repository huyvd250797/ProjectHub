# ASC WORKING — V1.1.3

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
```

`SUPABASE_SERVICE_ROLE_KEY` và `APP_ENCRYPTION_KEY` là **server-only**. Không dùng `NEXT_PUBLIC_` và không commit vào Git.

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
