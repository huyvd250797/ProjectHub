# Department Intelligence V0.5.0 — Supabase setup

## 1. Điều kiện
Đã chạy các migration:

1. `202608220001_v020_core_schema.sql`
2. `202608220002_v030_dashboard_rpc.sql`
3. `202608220003_v040_contract_rpc.sql`

## 2. Chạy migration V0.5.0
Trong Supabase → SQL Editor, chạy:

```text
supabase/migrations/202608220004_v050_department_rpc.sql
```

Migration tạo RPC:

```text
get_project_departments(uuid)
```

RPC kiểm tra `project_members` trước khi trả dữ liệu.

## 3. Dữ liệu cần có
Department Intelligence dùng:

- `departments`
- `people` với `person_type = customer`
- `issues`
- `contract_items`

ISSUE chưa có `department_id` vẫn được hiển thị trong bucket **Chưa xác định phòng ban**.

## 4. Kiểm tra
Sau khi deploy:

1. Mở `/departments`.
2. Chọn project trên Project Switcher.
3. Xác nhận KPI đổi theo project.
4. Click một phòng ban → drawer chi tiết.
5. Click KPI → mở `/issues?...`.
6. Click Module → mở `/contract?moduleId=...`.
7. Nếu có ISSUE chưa mapping phòng ban, banner/bucket màu amber phải xuất hiện.

## 5. Nếu báo migration required
Nếu UI báo:

```text
Phòng ban V0.5.0 cần chạy migration 202608220004_v050_department_rpc.sql
```

hãy chạy migration trên đúng Supabase project đang được Vercel sử dụng.
