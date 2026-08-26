# UAT V1.1.1

## ISSUE Validation
- [ ] Bỏ trống Nội dung → chặn submit + báo field cụ thể.
- [ ] Jira URL sai → báo tại Link Jira.
- [ ] Trạng thái/Trạng thái KH/Ưu tiên thiếu → báo đúng field.
- [ ] API/database relation lỗi → không hiển thị lỗi chung chung.

## Flexible Project Team
- [ ] Tạo thành viên chỉ với Họ tên + Role.
- [ ] Thành viên không email xuất hiện trong combobox Phụ trách.
- [ ] Giao ISSUE cho thành viên không email thành công.
- [ ] Bổ sung email chưa có Auth → lưu được nhưng trạng thái chưa liên kết login.
- [ ] Tạo Auth rồi lưu lại email → trạng thái chuyển sang đã liên kết tài khoản.
- [ ] Gỡ nhân sự → không còn trong Phụ trách mới, ISSUE lịch sử vẫn giữ người phụ trách.

## Performance
- [ ] ISSUE page load bình thường sau migration.
- [ ] Search/filter nhanh không bị kết quả request cũ ghi đè request mới.
- [ ] Summary ISSUE đúng tổng số.
- [ ] Đổi tab browser không phát notification poll thừa khi tab hidden.
