# ASC ProjectHub

Web app quản lý triển khai dự án phần mềm giáo dục.

## Phiên bản hiện tại

`V0.1.0 Prototype/MVP Preview`

Đây là bản đầu tiên bám theo kế hoạch chi tiết đã lập. Mục tiêu của phiên bản này là xác nhận giao diện, luồng nghiệp vụ và cách tổ chức dữ liệu trước khi xây phần backend thật.

## Đã có trong V0.1.0

- Dashboard tổng quan danh mục dự án.
- Danh sách dự án demo có tìm kiếm.
- Trang chi tiết dự án với tab: Tổng quan, Milestone, Timeline, Task, Khách hàng, Nghiệm thu.
- Timeline/Gantt dạng prototype.
- Task board theo trạng thái.
- Ticket hỗ trợ vận hành demo.
- Checklist nghiệm thu sơ bộ.
- Ghi rõ version history trong giao diện.

## Chưa làm trong V0.1.0

- Chưa kết nối Supabase.
- Chưa có đăng nhập/phân quyền thật.
- Chưa CRUD dữ liệu thật.
- Chưa upload file và audit log thật.
- Chưa export báo cáo Word/PDF.

## Phiên bản tiếp theo

`V0.5.0 Core MVP`

Phạm vi nên làm tiếp:

- Supabase Auth.
- Organization, profile, membership, role.
- CRUD project, phase, milestone, task.
- Attachment cơ bản.
- Audit log.
- RLS policy tối thiểu.
- Dashboard đọc từ dữ liệu thật.

## Công nghệ

- Next.js/Vinext
- React
- TypeScript
- Tailwind CSS

## Lệnh phát triển

```bash
npm run dev
npm run build
```
