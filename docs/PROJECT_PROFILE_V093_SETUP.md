# ASC WORKING V0.9.3 — Project Profile / Project Management

## Mục tiêu

V0.9.3 mở rộng Master Project Console để Project sau khi tạo có thể cập nhật đầy đủ hồ sơ, thay vì chỉ có mã Project, tên dự án và vài mốc thời gian.

## Nâng database

Chạy migration sau trong Supabase → SQL Editor:

```text
supabase/migrations/202608240005_v093_project_profile.sql
```

Migration chỉ bổ sung cột cho `projects`, không xóa dữ liệu hiện có.

## Các thông tin có thể cập nhật

### Nhận diện Project
- Mã Project
- Slug
- Tên dự án
- Mô tả dự án
- Trạng thái: Active / Paused / Completed / Archived

### Trường / Đơn vị triển khai
- Tên trường / đơn vị
- Mã đơn vị
- Địa chỉ

### Hợp đồng & kế hoạch
- Số hợp đồng
- Giá trị hợp đồng
- Ngày ký hợp đồng
- Ngày bắt đầu
- Ngày kết thúc dự kiến

### Đầu mối khách hàng
- Họ tên
- Chức vụ
- Email
- Điện thoại

### Ghi chú
- Ghi chú vận hành cấp Project

## Cách sử dụng

1. Đăng nhập tài khoản MASTER.
2. Vào `Thiết lập → Master Project Console`.
3. Chọn `Quản lý Project` ở Project cần cập nhật.
4. Tab `Hồ sơ dự án` → cập nhật thông tin → `Lưu thông tin Project`.
5. Tab `Thành viên` vẫn dùng để gán Admin/PM/Member/Viewer.
6. Sau khi lưu, Server Component được refresh; Project Switcher và Dashboard sử dụng tên trường/đơn vị và dữ liệu hợp đồng mới.

## Quyền

- MASTER: quản trị hồ sơ mọi Project.
- User thường: không truy cập Master Project Console.
- Các policy project-scoped hiện có vẫn áp dụng cho dữ liệu nghiệp vụ.

## Lưu ý

- `code` và `slug` là định danh kỹ thuật. Có thể sửa nhưng không nên đổi thường xuyên sau khi hệ thống đã tích hợp bên ngoài.
- `contract_value` là numeric; nhập số không kèm ký hiệu tiền tệ.
- Project Profile không lưu credential Remote Server.
