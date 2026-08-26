# V1.1.0 — Notifications & Activity Center Setup

## 1. Migration
Trong Supabase SQL Editor chạy:

`supabase/migrations/202608250001_v110_notifications_activity.sql`

Không cần thay đổi Environment Variables.

## 2. Notification Center
Icon chuông nằm ở Topbar, sau Theme Toggle và trước User Menu.

Thông báo được scope theo Project đang chọn.

## 3. Nguồn Activity
- ISSUE: dựa trên `issue_history`.
- Project Team: trigger `project_members`.
- Resource Vault: `remote_resource_access_logs`.
- Excel Import: `import_batches` trạng thái imported.

## 4. Due Reminder
`GET /api/notifications` gọi `sync_issue_due_notifications_v110()` để tạo reminder cho ISSUE:
- đang gán cho user hiện tại;
- Due Date <= 3 ngày;
- chưa archive;
- chưa ở trạng thái hoàn tất/không xử lý.

Cơ chế lazy này không cần Cron và tránh tạo background job ở V1.1.0.

## 5. Preferences
Mỗi user có cấu hình riêng theo từng Project trong `notification_preferences`.
Mặc định mọi nhóm notification đều bật khi chưa có bản ghi preference.

## 6. Security
- User chỉ SELECT/UPDATE notification của chính mình.
- Activity chỉ SELECT khi có quyền Project hoặc MASTER.
- Trigger notification dùng security-definer nhưng không expose API insert từ browser.
- Resource security notification không chứa plaintext secret.
