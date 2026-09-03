# Stage Date Range V1.6.1 — Setup

## Điều kiện

- Source ASC WORKING V1.6.1.
- Database đã chạy migration V1.6.0:

```text
supabase/migrations/202609030001_v160_master_plan_project_stages.sql
```

## Triển khai database

Chạy tiếp migration sau trong Supabase SQL Editor hoặc pipeline migration:

```text
supabase/migrations/202609030002_v161_stage_date_range.sql
```

Migration này:

- thêm `project_stages.date_mode` với giá trị `auto` hoặc `manual`;
- thêm validation khoảng ngày thủ công;
- thêm hàm tính số ngày theo lịch Master Plan;
- thêm scheduler V1.6.1 giữ nguyên ngày thủ công;
- chuyển RPC V1.6.0 sang scheduler mới để tương thích client cũ.

## Sau triển khai

1. Deploy source V1.6.1.
2. Mở **Kế hoạch → Project Stages**.
3. Sửa một stage và chọn **Nhập Từ ngày – Đến ngày**.
4. Nhập hai ngày, kiểm tra Số ngày tự tính rồi lưu.
5. Bấm **Tính lại lịch** và xác nhận hai ngày thủ công không thay đổi.
6. Chạy checklist `docs/UAT_V161_STAGE_DATE_RANGE_CHECKLIST.md`.

Không có Environment Variable mới.
