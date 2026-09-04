# Smart Reminders & Alerts V1.8.0 — Setup

## Migration Order

Chạy lần lượt các migration hiện có đến V1.7.0, sau đó chạy:

```sql
supabase/migrations/202609030004_v180_smart_reminders_alerts.sql
```

## What It Adds

- `project_plan_reminders`: lưu nhắc việc theo Project.
- Trigger validate liên kết reminder cùng Project.
- Trigger Activity Center cho tạo/sửa/xóa reminder.
- Notification Center sync cho reminder mở hoặc snoozed đến hạn trong 7 ngày.

## UAT Flow

1. Vào `/plan`.
2. Mở tab `Smart Alerts`.
3. Tạo reminder thủ công với thời điểm hôm nay.
4. Tạo reminder liên kết với Stage, Milestone hoặc Execution Task.
5. Bấm `Snooze`, kiểm tra reminder chuyển sang trạng thái tạm hoãn.
6. Bấm `Done`, kiểm tra reminder biến khỏi danh sách đang mở.
7. Kiểm tra `/activity` có log Plan Reminder.
8. Kiểm tra Notification Center có thông báo reminder đến hạn nếu owner có tài khoản đăng nhập.

## Notes

Smart Alerts tự động không cần bảng riêng. Các cảnh báo được tính từ dữ liệu hiện có mỗi lần tải Plan để tránh lệch trạng thái.
