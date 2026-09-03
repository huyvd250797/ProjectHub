# UAT V1.6.1 — Stage Date Range

## Chuẩn bị

- [ ] Migration V1.6.0 đã chạy.
- [ ] Migration `202609030002_v161_stage_date_range.sql` chạy thành công.
- [ ] Kiểm thử bằng một tài khoản PM/Admin và một tài khoản Member/Viewer.

## Nhập ngày thủ công

- [ ] PM/Admin mở form tạo stage và thấy lựa chọn **Nhập Từ ngày – Đến ngày**.
- [ ] Nhập Từ ngày và Đến ngày hợp lệ; Số ngày tự cập nhật.
- [ ] Với `calendar_days`, số ngày tính cả hai đầu mút và cuối tuần.
- [ ] Với `business_days`, số ngày bỏ thứ Bảy và Chủ nhật.
- [ ] Không thể lưu khi thiếu một ngày hoặc Đến ngày trước Từ ngày.
- [ ] Khoảng không có ngày làm việc hoặc vượt 3.650 ngày bị từ chối rõ ràng.

## Giữ lịch và tính lại

- [ ] Sau khi lưu, bảng Stage và Gantt hiển thị đúng hai ngày.
- [ ] Bấm **Tính lại lịch** không thay đổi stage thủ công.
- [ ] Đổi thứ tự stage không thay đổi stage thủ công.
- [ ] Chỉnh ngày/cách tính của Master Plan không ghi đè hai ngày thủ công.
- [ ] Stage tự động phía sau bắt đầu sau ngày kết thúc stage thủ công.
- [ ] Chuyển stage từ `manual` sang `auto` làm lịch được tính lại theo số ngày và thứ tự.

## Dữ liệu liên quan

- [ ] Forecast end date lấy ngày kết thúc muộn nhất.
- [ ] Weighted progress dùng số ngày mới của stage.
- [ ] CSV có cột Cách lập lịch, Bắt đầu và Kết thúc.
- [ ] ISSUE tiếp tục tham chiếu đúng mã stage.
- [ ] Member/Viewer nhìn thấy lịch nhưng không thể sửa.

## Regression

- [ ] CRUD Master Plan hoạt động.
- [ ] CRUD Milestone hoạt động.
- [ ] Gantt, Dashboard và Activity Center tải thành công.
- [ ] `npm run check` hoàn tất không có lỗi.
