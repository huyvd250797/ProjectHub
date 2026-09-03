# UAT V1.7.0 — Plan Execution Tracking

## Migration

- [ ] Đã chạy `202609030003_v170_plan_execution_tracking.sql` sau V1.6.1.
- [ ] `/api/health` trả `version: 1.7.0`.
- [ ] `/settings/uat` có check `Plan Execution & Tracking` pass.

## Execution Tasks

- [ ] Tab `Execution Tasks` hiển thị trong `/plan`.
- [ ] Thêm task mới thành công với stage, deadline, priority và owner.
- [ ] Sửa task đổi trạng thái/priority/deadline thành công.
- [ ] Bấm `Done` task cập nhật trạng thái hoàn tất.
- [ ] Xóa task có confirm và dữ liệu biến khỏi danh sách.
- [ ] Task quá hạn hoặc bị chặn làm dashboard hiển thị cảnh báo.

## Milestone Checklist

- [ ] Mỗi milestone hiển thị block `Checklist nghiệm thu`.
- [ ] Thêm checklist item cho milestone thành công.
- [ ] Tick checklist item cập nhật trạng thái hoàn tất.
- [ ] Sửa nội dung checklist item thành công.
- [ ] Xóa checklist item có confirm.

## Dashboard & Export

- [ ] Overview có metric Execution, Task Done, Task Rủi ro và Checklist.
- [ ] Task tiếp theo lấy đúng task mở có deadline gần nhất.
- [ ] Execution Queue hiển thị task chưa done.
- [ ] CSV Export có phần `EXECUTION TASKS`.
- [ ] CSV Export có phần `MILESTONE CHECKLIST`.

## Quyền

- [ ] Admin/PM thao tác được task/checklist.
- [ ] Member/Viewer chỉ xem, không thấy hoặc không dùng được thao tác ghi.
