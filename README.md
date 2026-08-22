# ASC ProjectHub V0.1.1 Portable Next.js

Bản này sửa lỗi deploy của zip V0.1.0 trước đó.

## Vì sao có bản V0.1.1?

Bản `V0.1.0` trước được build theo môi trường Sites/Vinext nên `npm run build` chạy qua shell wrapper riêng. Khi đưa sang Vercel/Netlify, môi trường deploy có thể báo:

```text
Error: Command "npm run build" exited with 126
```

Bản `V0.1.1` này chuyển về Next.js thuần để deploy phổ biến hơn.

## Lệnh build

```bash
npm install
npm run build
```

## Cấu hình Vercel

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: để trống hoặc `.next`
- Install Command: `npm install`
- Node.js Version: `20.x` hoặc mới hơn

Không đặt Output Directory là `out` vì app này không dùng static export.

## Cấu hình Netlify

- Build command: `npm run build`
- Publish directory: `.next`
- Cần bật Next.js runtime/plugin của Netlify nếu Netlify yêu cầu.

## Phiên bản

- Đã xây: `V0.1.0 Prototype/MVP Preview`
- Bản sửa deploy: `V0.1.1 Portable Next.js`
- Tiếp theo: `V0.5.0 Core MVP`

## Phạm vi app hiện tại

- Dashboard dự án.
- Danh sách dự án demo.
- Chi tiết dự án.
- Milestone.
- Timeline/Gantt demo.
- Task board.
- Ticket hỗ trợ.
- Checklist nghiệm thu.
- Version history trong giao diện.
