# ASC ProjectHub V0.5.3 Project Dashboard as Main Screen

Web app quản lý triển khai dự án phần mềm giáo dục.

## Phiên bản

Đã xây:

- `V0.1.0 Prototype/MVP Preview`: giao diện, demo data, dashboard, project detail, timeline, task, ticket.
- `V0.1.1 Portable Next.js`: chuyển source sang Next.js thuần để deploy ngoài Sites.
- `V0.1.2 Vercel Fix`: fix deploy Vercel, loại trừ file Sites/Vinext cũ.
- `V0.5.0 Core MVP`: CRUD nội bộ, local-first storage, dashboard dữ liệu thao tác thật, milestone, task, audit log, Supabase schema.
- `V0.5.1 Sheet-Inspired Working View`: thêm màn hình theo dõi từng dự án lấy cảm hứng từ file ASC-Working: issue, module, phòng ban, biên bản khảo sát/tập huấn/nghiệm thu.
- `V0.5.2 Project Dashboard Screens`: sửa đúng hướng hệ thống màn hình nghiệp vụ, không gom vào một tab working sheet; thêm dashboard dự án với hợp đồng, kế hoạch, timeline, milestone, issue, module, member, portal và server.
- `V0.5.3 Project Dashboard as Main Screen`: đưa dashboard dự án thành màn hình chính ngay khi chọn dự án; các tab chỉ còn là màn hình thao tác chi tiết.

Tiếp theo:

- `V0.8.0 Customer Collaboration`: portal khách hàng, khảo sát, tập huấn, UAT và xác nhận khách hàng.

## Có trong V0.5.3

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
- `Dashboard dự án` là màn hình chính của từng dự án, hiển thị ngay sau khi chọn dự án:
  - Về hợp đồng: số hợp đồng, giá trị, ngày hợp đồng, trạng thái.
  - Kế hoạch thời gian tổng thể: begin date, due date, master plan, passed, remain, progress.
  - Chi tiết từng giai đoạn: Stage 1 đến Stage 5, ngày bắt đầu/kết thúc, networkdays.
  - Timeline day dạng stacked bar theo mẫu hình tham chiếu.
  - Milestone timeline dạng trục thời gian theo mẫu hình tham chiếu.
  - Số lượng issue theo trạng thái, tổng issue và tỷ lệ bàn giao.
  - Danh sách module/phân hệ: module, done, remain.
  - Member tham gia dự án: issue, done, tỷ lệ hoàn thành.
  - Portal và server tách thành bảng quản lý riêng.
- Supabase schema tại `supabase/schema.sql`.
- `.env.example` cho Supabase URL/key.

## Tham chiếu từ ASC-Working

Bản này dùng file Excel `[EPU] _ ASC-Working.xlsx` làm tài liệu tham khảo nghiệp vụ. Các sheet được chuyển thành ý tưởng UI:

- `DASHBOARD` -> khối thông tin dự án, kế hoạch, timeline và tỷ lệ hoàn thành.
- `ISSUE` + `TrangThai` -> bảng yêu cầu, trạng thái ASC, trạng thái khách hàng, ưu tiên và release.
- `PLHĐ` -> module/phân hệ, tổng yêu cầu, đã bàn giao, còn lại.
- `Phòng ban` -> tổng hợp theo đơn vị đầu mối.
- `Theo dõi biên bản` -> checklist khảo sát, tập huấn, xác nhận hoàn thành.

Các dữ liệu nhạy cảm như mật khẩu portal/server, tài khoản email, test data nội bộ không được đưa vào source. UI chỉ hiển thị dạng che hoặc ghi chú lưu trong vault/env.

## Cơ chế lưu dữ liệu

V0.5.3 đang chạy `local-first`:

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
git commit -m "Build ASC ProjectHub V0.5.3 Project Dashboard Main Screen"
git push
```
