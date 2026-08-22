# Dashboard V0.3.0 — Supabase setup

Dashboard V0.3.0 dùng một RPC server-side để tránh tải toàn bộ ISSUE về browser.

## 1. Migration bắt buộc
Trong Supabase SQL Editor chạy:

```text
supabase/migrations/202608220002_v030_dashboard_rpc.sql
```

Migration V0.2.0 phải được chạy trước:

```text
supabase/migrations/202608220001_v020_core_schema.sql
```

## 2. Quyền project
User phải có record trong:

```text
project_members
```

RPC gọi `is_project_member(project_id)` trước khi aggregate dữ liệu.

## 3. Khi database chưa có ISSUE/PLHĐ
Dashboard sẽ hiển thị số 0 và cảnh báo "Database chưa có dữ liệu nghiệp vụ".
Đây là hành vi cố ý: khi Supabase đã cấu hình, Dashboard không dùng mock để che dữ liệu thật.

## 4. Multi-project
Project Switcher gửi `selectedProject.id` vào Dashboard API.
Mọi KPI được aggregate bằng đúng `project_id` đó.
