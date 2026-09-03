# Master Plan V1.6.0 — Setup

## 1. Điều kiện

- Source/database đã chạy đầy đủ migration đến V1.5.0.
- Tài khoản triển khai có quyền chạy SQL trên Supabase.
- Backup database trước khi nâng cấp production.

## 2. Chạy migration

Chạy file sau trong Supabase SQL Editor:

```text
supabase/migrations/202609030001_v160_master_plan_project_stages.sql
```

Migration thực hiện:

- Mở rộng `project_stages` với `description`, `duration_days`, `progress`, `color`, `owner_person_id`.
- Chuẩn hóa status stage cũ và giữ nguyên ID/code hiện có.
- Tạo `project_master_plans` và `project_milestones`.
- Tạo RLS, index, trigger kiểm tra liên kết, Activity trigger và hàm tính lịch.
- Cập nhật default navigation để có `/plan`.

## 3. Deploy source

Không có environment variable mới. Deploy như V1.5.0:

```bash
npm ci
npm run check
```

Vercel dùng Build Command mặc định và để trống Output Directory.

## 4. Khởi tạo kế hoạch

1. Chọn Project.
2. Mở **Kế hoạch** ở sidebar.
3. Chọn **Tạo Master Plan**, nhập ngày bắt đầu và target date.
4. Mở **Project Stages**, khai báo số ngày và owner.
5. Dùng nút lên/xuống để sắp xếp stage.
6. Chọn **Tính lại lịch** và kiểm tra Timeline.
7. Thêm Milestones theo các mốc phê duyệt/bàn giao.

## 5. Rollback

Ưu tiên restore backup nếu cần rollback toàn bộ. Source V1.5.0 vẫn đọc được các cột stage cũ; các cột/bảng V1.6.0 có thể để nguyên khi rollback ứng dụng để tránh mất dữ liệu kế hoạch.
