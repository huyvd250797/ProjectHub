# V0.9.1 — MASTER / Multi-Project Setup

## 1. Chạy migration
Supabase → SQL Editor → chạy:

`supabase/migrations/202608240003_v091_master_multi_project.sql`

Migration này:
- thêm `profiles.global_role`;
- tạo `public.is_master()`;
- nâng cấp `is_project_member()` / `has_project_role()`;
- cho MASTER đọc profile để quản lý member;
- cho MASTER tạo/xóa project ở tầng RLS;
- chống self-escalation global role.

## 2. Promote tài khoản master
Chạy `supabase/promote-master.sql`.

Mặc định file đang target:
`huywork257@gmail.com`

Kết quả kiểm tra phải có:
- global_role = master
- is_active = true

## 3. Reload app
Đăng xuất/đăng nhập lại hoặc reload.

Kỳ vọng:
- Header hiện badge MASTER.
- Project Switcher hiển thị toàn bộ projects.
- Thiết lập có card Master Project Console.
- `/settings/projects` truy cập được.

## 4. User thường
Không set `global_role = master`.
Dùng Master Project Console để thêm email vào project và chọn:
- admin
- pm
- member
- viewer

## 5. Quy tắc quan trọng
MASTER không cần project_members. Không tạo hàng loạt membership cho MASTER vì sẽ làm sai mô hình quyền toàn cục và tăng chi phí quản trị khi có Project mới.
