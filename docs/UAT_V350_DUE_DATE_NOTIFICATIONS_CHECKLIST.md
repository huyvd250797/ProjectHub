# UAT V3.5.0 - Due Date Notification Automation

## Chuẩn bị

- Đã chạy migration `202609110001_v350_due_date_notification_automation.sql`.
- User test đã là thành viên project.
- User test có bản ghi nhân sự `people.user_id` trỏ đúng tài khoản đăng nhập.
- Notification preference `due_reminders` đang bật hoặc chưa cấu hình.

## Test ISSUE

- Tạo hoặc sửa ISSUE có người phụ trách là user test.
- Set `due_date = hôm nay + 3 ngày`.
- Mở Notification Center.
- Kỳ vọng có thông báo ISSUE còn 3 ngày đến hạn.
- Đổi `due_date = hôm nay + 1 ngày`.
- Kỳ vọng có thông báo ISSUE sẽ đến hạn ngày mai.

## Test Plan Task

- Tạo Plan Task có owner là user test.
- Set `due_date = hôm nay + 3 ngày`.
- Mở Notification Center.
- Kỳ vọng có thông báo Task còn 3 ngày đến hạn.
- Set task status = `done`, mở lại Notification Center.
- Kỳ vọng không tạo thêm cảnh báo mới cho task đã done.

## Test Milestone

- Tạo Milestone có owner là user test.
- Set `due_date = hôm nay + 1 ngày`.
- Mở Notification Center.
- Kỳ vọng có thông báo Milestone sẽ đến hạn ngày mai.
- Set milestone status = `completed`, mở lại Notification Center.
- Kỳ vọng không tạo thêm cảnh báo mới cho milestone đã completed.

## Test chống trùng

- Mở Notification Center nhiều lần liên tiếp.
- Kỳ vọng cùng một mốc due date không bị tạo nhiều notification trùng.

## Test quyền và cá nhân hóa

- Tạo ISSUE/Task/Milestone giao cho người khác.
- Đăng nhập bằng user test và mở Notification Center.
- Kỳ vọng user test không nhận cảnh báo của người khác.
- Tắt Due Reminder trong cài đặt thông báo.
- Mở Notification Center.
- Kỳ vọng không tạo cảnh báo due date mới.

