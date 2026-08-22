# ASC ProjectHub V0.8.0 Customer Collaboration

Web app quản lý triển khai dự án phần mềm giáo dục.

## Phiên bản

Đã xây chính thức:

- `V0.1.0 Prototype/MVP Preview`: giao diện, demo data, dashboard, project detail, timeline, task, ticket.
- `V0.1.1 Portable Next.js`: chuyển source sang Next.js thuần để deploy ngoài Sites.
- `V0.1.2 Vercel Fix`: fix deploy Vercel, loại trừ file Sites/Vinext cũ.
- `V0.5.0 Core MVP`: CRUD nội bộ, local-first storage, dashboard dữ liệu thao tác thật, milestone, task, audit log, Supabase schema.
- `V0.8.0 Customer Collaboration`: khảo sát khách hàng, tập huấn, UAT, nghiệm thu, hỗ trợ vận hành và góc nhìn cộng tác khách hàng.

Ghi chú:

- Các bản thử dashboard `V0.5.1`, `V0.5.2`, `V0.5.3` không dùng làm nền tiếp theo.
- V0.8.0 được xây lại từ source `V0.5.0 Core MVP` theo yêu cầu.

Tiếp theo:

- `V1.0 Production Ready`: Supabase thật, Auth/RLS hoàn chỉnh, upload file biên bản, phân quyền thực tế, export báo cáo, hardening deploy.

## Có trong V0.8.0

- Giữ toàn bộ lõi V0.5.0:
  - Tạo/tìm dự án.
  - Cập nhật trạng thái, tiến độ, health note.
  - Milestone, task board, audit log.
  - Role switcher nền tảng.
  - Supabase schema.
- Màn hình `Cộng tác KH`:
  - Tổng quan khảo sát, tập huấn, UAT, nghiệm thu và hỗ trợ.
  - Nhìn nhanh việc đang chờ khách hàng.
  - Nhìn nhanh kết quả đã hoàn tất.
- Màn hình `Khảo sát`:
  - Thêm khảo sát theo module/phòng ban.
  - Theo dõi trạng thái Draft, Sent, Customer Review, Confirmed, Rework.
- Màn hình `Tập huấn`:
  - Quản lý lịch tập huấn, người tập huấn, phòng ban, số người tham dự.
  - Trạng thái Planned, Invited, Completed, Need Follow-up.
- Màn hình `UAT`:
  - Quản lý testcase theo module.
  - Board trạng thái Not Started, Testing, Failed, Passed, Accepted.
- Màn hình `Nghiệm thu`:
  - Quản lý biên bản/hồ sơ nghiệm thu.
  - Theo dõi người xác nhận, trạng thái gửi/ký/rework.
- Màn hình `Hỗ trợ`:
  - Theo dõi yêu cầu hỗ trợ vận hành sau go-live.
  - Board trạng thái New, In Progress, Waiting Customer, Resolved.

## Cơ chế lưu dữ liệu

V0.8.0 đang chạy `local-first`:

- Dữ liệu lưu trong `localStorage` của trình duyệt.
- Có thể dùng ngay để pilot nội bộ, demo luồng, review nghiệp vụ.
- Chưa cần Supabase credentials nên không sợ lộ key.

Khi chuyển sang Supabase thật trong V1.0:

1. Tạo project Supabase.
2. Chạy `supabase/schema.sql` trong SQL Editor.
3. Tạo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Thay lớp localStorage trong `app/page.tsx` bằng repository gọi Supabase.
5. Bật RLS policy chi tiết theo organization/project membership.
6. Bổ sung upload file biên bản qua Supabase Storage.

## Deploy Vercel

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: để trống hoặc `.next`
- Node.js Version: `22.x`

Không đặt Output Directory là `out`.

## Lệnh local

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Lưu ý khi push GitHub

Không để lại các thư mục/file cũ của Sites/Vinext:

```bash
build/
db/
drizzle/
examples/
scripts/
worker/
.openai/
vite.config.ts
drizzle.config.ts
```

Nếu repo đang còn các file này, hãy xóa bằng:

```bash
git rm -r build db drizzle examples scripts worker .openai
git rm vite.config.ts drizzle.config.ts
git add .
git commit -m "Build ASC ProjectHub V0.8.0 Customer Collaboration"
git push
```
