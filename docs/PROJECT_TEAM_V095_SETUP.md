# V0.9.5 — Setup Project Members / Assignees

## 1. Chạy migration

Supabase → SQL Editor:

```text
202608240006_v095_project_members_assignees.sql
```

Migration không xóa ISSUE hay people cũ.

## 2. Kiểm tra biến server

Vercel phải có:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Sau khi thay env phải Redeploy.

## 3. Tạo tài khoản đăng nhập

Supabase → Authentication → Users → Add user.

Tạo email của thành viên trước.

## 4. Khai báo thành viên trong ASC WORKING

MASTER → Master Console → chọn Project → Quản lý Project → Thành viên.

Nhập:
- Họ tên
- Email đăng nhập
- Role

Bấm **Lưu thành viên**.

Sau khi thành công, dòng member phải hiển thị **Đã đồng bộ Phụ trách ISSUE**.

## 5. Kiểm tra ISSUE

Mở ISSUE → combobox Phụ trách.

Chỉ member của Project hiện tại được xuất hiện. Option có dạng:

```text
Võ Đức Huy
huy@company.com • MEMBER
```

## 6. Dữ liệu legacy

Nếu ISSUE cũ đang phụ trách bởi một `people` chưa liên kết membership:
- tên cũ vẫn được hiển thị `Legacy`;
- không thể chọn lại;
- thêm đúng Họ tên/Email vào Project Member để hệ thống link lại person cũ nếu match.
