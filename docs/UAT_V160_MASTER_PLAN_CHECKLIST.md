# UAT V1.6.0 — Master Plan & Project Stages

## A. Migration & quyền

- [ ] Migration V1.6.0 chạy thành công sau V1.5.0.
- [ ] Stage cũ vẫn xuất hiện trong ISSUE lookup và Dashboard.
- [ ] MASTER/Admin/PM tạo và sửa được kế hoạch.
- [ ] Member/Viewer xem được nhưng không có nút ghi dữ liệu.
- [ ] User không truy cập được kế hoạch của Project ngoài quyền.

## B. Master Plan

- [ ] Tạo Master Plan với ngày bắt đầu, target, status và ghi chú.
- [ ] Không cho target date trước start date.
- [ ] Chuyển giữa ngày lịch và ngày làm việc cho kết quả đúng.
- [ ] Ngày Master Plan đồng bộ sang Dashboard/Project Profile.

## C. Project Stages

- [ ] Thêm/sửa stage với mã duy nhất, số ngày, progress, owner và màu.
- [ ] Không cho số ngày dưới 1 hoặc progress ngoài 0–100%.
- [ ] Progress 100% tự chuyển trạng thái Hoàn tất.
- [ ] Mã stage bị khóa sau khi tạo để giữ liên kết ISSUE.
- [ ] Đổi thứ tự stage cập nhật lại start/end date.
- [ ] Stage đang được ISSUE tham chiếu không thể xóa.
- [ ] Xóa stage không có ISSUE tham chiếu không xóa milestone; milestone chỉ mất liên kết stage.

## D. Timeline

- [ ] Stage được nối tuần tự, không chồng lịch.
- [ ] Business days bỏ qua thứ Bảy/Chủ nhật.
- [ ] Thanh stage, progress, today line và target line hiển thị đúng.
- [ ] Timeline cuộn ngang được trên kế hoạch dài và không vỡ mobile.
- [ ] Milestone gắn stage và milestone độc lập hiển thị đúng lane.

## E. Milestones & cảnh báo

- [ ] Thêm/sửa/xóa milestone.
- [ ] Quick Complete cập nhật status và completed timestamp.
- [ ] Milestone quá hạn được cảnh báo.
- [ ] Forecast, variance, Schedule Health, Current Stage và Next Milestone đúng.
- [ ] Export CSV mở đúng tiếng Việt và đủ Stage/Milestone.

## F. Regression

- [ ] Dashboard, Analytics, ISSUE, Import, Activity và Project Switcher hoạt động.
- [ ] Activity Center có filter Kế hoạch và ghi nhận thay đổi.
- [ ] Dark/Light mode hiển thị đủ tương phản.
- [ ] `npm run check` hoàn tất không lỗi.
