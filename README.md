# ASC WORKING — V0.9.5

**Project Team / ISSUE Assignee Sync**

V0.9.5 thống nhất dữ liệu **Thành viên Project** và **Phụ trách ISSUE**. Từ phiên bản này, danh sách Phụ trách không còn lấy trực tiếp từ toàn bộ `people.person_type = 'asc'` được import từ Excel. Chỉ những tài khoản đã được khai báo trong `project_members` của Project hiện tại mới xuất hiện để chọn.

## Luồng dữ liệu mới

```text
Supabase Auth
    ↓
profiles
    ↓
project_members      ← Họ tên + Email đăng nhập + Role được quản lý tại Master Console
    ↓
people.user_id       ← bản ghi nhân sự ASC liên kết để giữ FK của ISSUE
    ↓
issues.assignee_person_id
```

## Master Console → Thành viên

MASTER khai báo:

- Họ tên
- Email đăng nhập
- Role: Admin / PM / Member / Viewer

Email phải tồn tại trong Supabase Authentication. Khi lưu:
1. `profiles.display_name` được cập nhật theo Họ tên.
2. `project_members` được thêm/cập nhật.
3. Hệ thống tìm bản ghi ASC cũ theo email hoặc họ tên để giữ tham chiếu ISSUE lịch sử.
4. Nếu chưa có thì tạo `people` mới.
5. `people.user_id` liên kết thành viên với người phụ trách ISSUE.

## ISSUE

- Combobox **Phụ trách** chỉ hiển thị Project Members.
- Mỗi option hiển thị Họ tên, Email và Role.
- API Create / Update / Bulk Update từ chối assignee không thuộc Project Member.
- Phụ trách cũ đã bị gỡ khỏi Project vẫn được hiển thị dưới dạng `Legacy`, nhưng không thể chọn lại.
- Gỡ member không xóa `people` để không làm mất lịch sử ISSUE.

## Migration bắt buộc

Nếu database đang ở V0.9.4, chạy:

```text
supabase/migrations/202608240006_v095_project_members_assignees.sql
```

Migration thêm `people.user_id`, backfill các member cũ có thể match theo email/họ tên và tạo person record còn thiếu.

## Environment

V0.9.5 dùng `SUPABASE_SERVICE_ROLE_KEY` phía server khi MASTER lưu thành viên để đồng bộ profile/member/person.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
```

Không commit `.env.local`.

## Lưu ý tài khoản đăng nhập

V0.9.5 **không tự tạo tài khoản Authentication**. Email phải được tạo trước trong Supabase → Authentication → Users. Sau đó MASTER khai báo Họ tên + Email đó trong Project.

© 2026 HuyVo. All rights reserved.
