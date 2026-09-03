# Plan Execution Tracking V1.7.0 — Setup

## Thứ tự migration

Chạy lần lượt nếu database chưa có module Plan:

```text
supabase/migrations/202609030001_v160_master_plan_project_stages.sql
supabase/migrations/202609030002_v161_stage_date_range.sql
supabase/migrations/202609030003_v170_plan_execution_tracking.sql
```

Nếu database đã ở V1.6.1, chỉ cần chạy:

```text
supabase/migrations/202609030003_v170_plan_execution_tracking.sql
```

## Kiểm tra nhanh sau migration

1. Mở `/plan`.
2. Chọn tab `Execution Tasks`.
3. Thêm một task gắn với stage hiện có.
4. Đổi task sang `Done`, kiểm tra task biến khỏi queue đang mở.
5. Mở tab `Milestones`.
6. Thêm checklist cho một milestone và tick hoàn tất.
7. Chạy `/settings/uat` để xác nhận readiness thấy `Plan Execution & Tracking`.

## Bảng mới

- `project_plan_tasks`: task thực thi theo project/stage.
- `project_milestone_checklist_items`: checklist điều kiện hoàn thành của milestone.

## Quyền

- MASTER/Admin/PM: đọc, thêm, sửa, xóa task/checklist.
- Member/Viewer: chỉ đọc theo Project RLS.

## Ghi chú

V1.7.0 không thay đổi logic giữ nguyên khoảng ngày thủ công của stage từ V1.6.1. Các task/checklist là lớp execution tracking nằm phía trên timeline hiện có.
