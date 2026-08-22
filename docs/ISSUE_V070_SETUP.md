# ASC WORKING V0.7.0 — ISSUE Productivity setup

## 1. Mục tiêu

V0.7.0 không thay thế ISSUE Core mà thêm lớp productivity cho thao tác hằng ngày.

## 2. Migration

Chạy trong Supabase SQL Editor:

```text
supabase/migrations/202608220006_v070_issue_productivity.sql
```

Sau migration, kiểm tra hai bảng:

```text
issue_saved_views
issue_user_preferences
```

## 3. RLS

Saved Views và preferences chỉ đọc/ghi khi:
- `user_id = auth.uid()`
- user là member của `project_id`

Không có preference dùng chung giữa các user hoặc giữa các project.

## 4. Bulk update

Endpoint:

```text
PATCH /api/issues/bulk
```

Giới hạn 200 ISSUE/lần để tránh update quá lớn ngoài ý muốn. Trigger lịch sử của V0.6.0 tự ghi thay đổi cho từng record.

## 5. Export

Endpoint:

```text
GET /api/issues/export
```

Export giữ nguyên filter URL hiện tại và giới hạn tối đa 10.000 ISSUE/lần.

## 6. Saved Views

Endpoints:

```text
GET/POST/DELETE /api/issues/views
```

Saved View chỉ lưu search/filter params. Khi mở lại, dữ liệu vẫn là dữ liệu mới nhất từ database.

## 7. Column Preferences

Endpoints:

```text
GET/PUT /api/issues/preferences
```

Lưu visible columns, order, width, pinned columns và page size.
