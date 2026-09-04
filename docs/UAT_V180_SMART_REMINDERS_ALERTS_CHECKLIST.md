# UAT V1.8.0 — Smart Reminders & Alerts

## Smoke Test

- [ ] `/api/health` trả `version: 1.8.0` và release `Smart Reminders & Alerts`.
- [ ] `/settings/uat` có check `Smart Reminders & Alerts` pass.
- [ ] `/plan` tải được Master Plan, stages, milestones, tasks, checklist và reminders.
- [ ] Tab `Smart Alerts` hiển thị cảnh báo tự động khi có task/stage/milestone quá hạn hoặc bị chặn.

## Reminder CRUD

- [ ] Tạo reminder thủ công.
- [ ] Tạo reminder liên kết Project Stage.
- [ ] Tạo reminder liên kết Milestone.
- [ ] Tạo reminder liên kết Execution Task.
- [ ] Sửa title, mô tả, thời điểm nhắc, priority và owner.
- [ ] Snooze reminder sang ngày kế tiếp.
- [ ] Đánh dấu Done.
- [ ] Xóa reminder.

## Notification & Activity

- [ ] Activity Center ghi log tạo/sửa/xóa reminder.
- [ ] Notification Center nhận due reminder khi reminder đến hạn trong 7 ngày.
- [ ] Reminder không có owner được gửi cho Admin/PM/MASTER.
- [ ] RLS không cho Viewer/Member ghi reminder.

## Export

- [ ] Export CSV có section `SMART ALERTS`.
- [ ] Export CSV có section `PLAN REMINDERS`.
