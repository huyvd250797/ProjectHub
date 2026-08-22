# ASC ProjectHub V0.1.2 Portable Next.js

Bản này sửa triệt để lỗi deploy Vercel do repo còn sót file cũ của Sites/Vinext.

## Vì sao có bản V0.1.2?

Bản `V0.1.0` trước được build theo môi trường Sites/Vinext nên `npm run build` chạy qua shell wrapper riêng. Khi đưa sang Vercel/Netlify, môi trường deploy có thể báo:

```text
Error: Command "npm run build" exited with 126
```

Sau đó nếu repo Git vẫn còn thư mục cũ như `build/`, `worker/`, `db/`, `drizzle/`, Vercel có thể type-check nhầm file không còn dependency, ví dụ:

```text
Cannot find module 'vite' or its corresponding type declarations.
```

Bản `V0.1.2` này xử lý bằng 2 lớp:

- Source zip không còn các thư mục Sites/Vinext thừa.
- `tsconfig.json` và `eslint.config.mjs` loại trừ các thư mục cũ để nếu Git còn sót file thì build vẫn không bị kéo vào.

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
- Node.js Version: `22.x`

Không đặt Output Directory là `out` vì app này không dùng static export.

## Nếu đang dùng repo GitHub cũ

Trong repo `ProjectHub`, cần xóa hẳn các thư mục/file cũ nếu còn:

```bash
git rm -r build db drizzle examples scripts worker .openai 2>/dev/null || true
git rm vite.config.ts drizzle.config.ts 2>/dev/null || true
git add package.json package-lock.json tsconfig.json eslint.config.mjs vercel.json app public README.md
git commit -m "Fix Vercel build for portable Next.js"
git push
```

Nếu không dùng lệnh `git rm`, xóa các thư mục/file trên trong VS Code rồi commit cũng được.

## Cấu hình Netlify

- Build command: `npm run build`
- Publish directory: `.next`
- Cần bật Next.js runtime/plugin của Netlify nếu Netlify yêu cầu.

## Phiên bản

- Đã xây: `V0.1.0 Prototype/MVP Preview`
- Bản sửa deploy lần 1: `V0.1.1 Portable Next.js`
- Bản fix triệt để Vercel: `V0.1.2 Portable Next.js`
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
