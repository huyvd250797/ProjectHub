# ASC ProjectHub V0.5.0 Core MVP

Web app quản lý triển khai dự án phần mềm giáo dục.

## Phiên bản

Đã xây:

- `V0.1.0 Prototype/MVP Preview`: giao diện, demo data, dashboard, project detail, timeline, task, ticket.
- `V0.1.1 Portable Next.js`: chuyển source sang Next.js thuần để deploy ngoài Sites.
- `V0.1.2 Vercel Fix`: fix deploy Vercel, loại trừ file Sites/Vinext cũ.
- `V0.5.0 Core MVP`: CRUD nội bộ, local-first storage, dashboard dữ liệu thao tác thật, milestone, task, audit log, Supabase schema.

Tiếp theo:

- `V0.8.0 Customer Collaboration`: portal khách hàng, khảo sát, tập huấn, UAT và xác nhận khách hàng.

## Có trong V0.5.0

- Dashboard portfolio đọc từ dữ liệu đang thao tác.
- Tạo dự án mới.
- Tìm kiếm dự án theo mã, tên, PM, khách hàng.
- Cập nhật trạng thái dự án.
- Cập nhật tiến độ dự án bằng slider.
- Cập nhật health note.
- Thêm milestone.
- Cập nhật trạng thái và tiến độ milestone.
- Thêm task.
- Chuyển trạng thái task theo board: Chưa làm, Đang làm, Chờ khách hàng, Hoàn tất.
- Audit log cho thao tác tạo/cập nhật chính.
- Role switcher nền tảng: Admin, PM, Member, Viewer.
- Supabase schema tại `supabase/schema.sql`.
- `.env.example` cho Supabase URL/key.

## Cơ chế lưu dữ liệu

V0.5.0 đang chạy `local-first`:

- Dữ liệu lưu trong `localStorage` của trình duyệt.
- Có thể dùng ngay để pilot nội bộ, demo luồng, review nghiệp vụ.
- Chưa cần Supabase credentials nên không sợ lộ key.

Khi chuyển sang Supabase thật trong V0.5.x:

1. Tạo project Supabase.
2. Chạy `supabase/schema.sql` trong SQL Editor.
3. Tạo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Thay lớp localStorage trong `app/page.tsx` bằng repository gọi Supabase.
5. Bật RLS policy chi tiết theo organization/project membership.

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
git commit -m "Build ASC ProjectHub V0.5.0 Core MVP"
git push
```
