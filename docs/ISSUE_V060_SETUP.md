# ASC WORKING V0.6.0 — ISSUE Core setup

## 1. Phạm vi V0.6.0

V0.6.0 chuyển `/issues` từ skeleton sang ISSUE Core dùng dữ liệu Supabase thật theo `project_id`:

- CRUD ISSUE.
- Inline edit: trạng thái, trạng thái KH, ưu tiên, Module, Phòng ban, phụ trách.
- Drawer chi tiết.
- Search + filter + deep-link bằng URL.
- Due Date / Jira / release date / ASC phản hồi / ghi chú.
- Lịch sử thay đổi tự động.
- Archive ISSUE dành cho PM/Admin.
- Viewer chỉ xem; Member/PM/Admin được cập nhật.

## 2. Chạy migration

Nếu database đã chạy V0.2.0 → V0.5.0, chỉ chạy thêm:

```text
supabase/migrations/202608220005_v060_issue_core.sql
```

Trong Supabase Dashboard:

1. SQL Editor.
2. New query.
3. Copy toàn bộ nội dung migration trên.
4. Run.

Migration sẽ:

- thêm `issues.issue_no` theo từng project;
- thêm `created_by`, `updated_by`;
- backfill số ISSUE hiện có;
- tạo unique index `(project_id, issue_no)`;
- tự cấp số cho ISSUE mới;
- tạo trigger ghi `issue_history`;
- cho phép project member xem tên người thay đổi ISSUE trong cùng project.

## 3. Quyền

| Role | Xem | Tạo/Sửa | Archive |
|---|---|---|---|
| Viewer | Có | Không | Không |
| Member | Có | Có | Không |
| PM | Có | Có | Có |
| Admin | Có | Có | Có |

RLS hiện có từ V0.2.0 tiếp tục là lớp bảo vệ chính. API server không dùng service-role để bỏ qua RLS.

## 4. Deep-link hỗ trợ

`/issues` hiểu các query sau:

```text
status=processing
customerStatus=handed_over
priority=A
stage=STAGE-03
moduleId=<uuid>
departmentId=<uuid>
assigneeId=<uuid>
overdue=1
nearDue=7
missingModule=1
missingDepartment=1
missingAssignee=1
mine=1
issueId=<uuid>
search=<keyword>
page=2
```

Các link từ Dashboard, PLHĐ và Department Intelligence hiện có tiếp tục dùng được.

## 5. Lưu ý "Tôi phụ trách"

V0.6.0 xác định người phụ trách hiện tại bằng `people.person_type='asc'` và `people.email = email đăng nhập`. Nếu ASC member chưa có email trong `people`, quick-view `Tôi phụ trách` sẽ trả 0 cho tới khi bổ sung mapping email.

## 6. Kiểm tra sau deploy

1. Mở `/issues` và xác nhận không còn dữ liệu mock khi Supabase được cấu hình.
2. Tạo ISSUE mới → mã `#issue_no` tăng theo project.
3. Inline edit trạng thái → reload vẫn giữ dữ liệu.
4. Mở drawer → tab Lịch sử có record thay đổi.
5. Click KPI Dashboard/Phòng ban/PLHĐ → `/issues?...` lọc đúng.
6. Viewer không thấy nút tạo/lưu; PM/Admin có Archive.
7. Đổi Project Switcher → ISSUE đổi theo `project_id`.
