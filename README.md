# ASC-Working — V0.1.0

**Foundation / Deployable Skeleton**  
Phong cách: professional technology workspace.

## 1. V0.1.0 có gì?

- Next.js 16.3 App Router + TypeScript.
- Tailwind CSS 4.
- Giao diện dark-tech chuyên nghiệp, responsive.
- Sidebar thu gọn + mobile drawer.
- Topbar, global-search shell, project badge, version.
- Route:
  - `/dashboard`
  - `/contract`
  - `/departments`
  - `/issues`
  - `/resources`
  - `/settings`
  - `/login`
- PLHĐ: một màn hình, toggle 2 kiểu xem tổng quan/chi tiết.
- Supabase SSR/Auth foundation.
- **Demo Mode**: nếu chưa cấu hình Supabase, app vẫn deploy và xem được toàn bộ skeleton.
- Không đưa password/credential thật từ workbook vào source.
- Vercel config tối giản; **không dùng `output: "export"` và không yêu cầu thư mục `out`**.

> Dữ liệu trong V0.1.0 là demo/seed để nhìn UX. V0.2.0 mới bắt đầu schema thật + import POC.

---

## 2. Yêu cầu máy

- Node.js **20.9+**
- npm 10+ khuyến nghị

## 3. Chạy local

```bash
npm install
npm run dev
```

Mở:

```text
http://localhost:3000
```

Khi chưa có Supabase, vào `/login` và chọn **Vào Demo Workspace**.

---

## 4. Kết nối Supabase

Copy file:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Điền:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Sau đó restart:

```bash
npm run dev
```

Khi Supabase đã được cấu hình, workspace yêu cầu user đăng nhập thật bằng Supabase Auth.

### Tạo user test

Trong Supabase Dashboard:

1. Authentication
2. Users
3. Add user
4. Tạo email/password
5. Dùng email/password đó tại `/login`

---

## 5. Push GitHub

```bash
git init
git add .
git commit -m "feat: ASC-Working V0.1.0 foundation"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

---

## 6. Deploy Vercel

1. Vercel → **Add New → Project**
2. Import repository GitHub.
3. Framework Preset: **Next.js**
4. Build Command: để **Default**
5. Install Command: để **Default**
6. **Output Directory: để trống / Default**
7. Nếu muốn Auth thật, thêm 2 Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
8. Deploy.

### Rất quan trọng

Không đặt Output Directory là `out`.

Project này dùng Next.js server runtime bình thường. Không có:

```ts
output: "export"
```

nên Vercel tự xử lý `.next` theo Next.js integration.

---

## 7. Environment variables dự kiến

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Chỉ dùng server-side ở các version sau:
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
APP_URL=
```

Không commit `.env.local`.

---

## 8. Cấu trúc source

```text
ASC-Working-V0.1.0/
├─ app/
│  ├─ (workspace)/
│  │  ├─ dashboard/
│  │  ├─ contract/
│  │  ├─ departments/
│  │  ├─ issues/
│  │  ├─ resources/
│  │  └─ settings/
│  ├─ login/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
├─ lib/
│  └─ supabase/
├─ proxy.ts
├─ .env.example
├─ next.config.ts
├─ package.json
└─ vercel.json
```

---

## 9. Roadmap tiếp theo

### Đã xây dựng
- ✅ **V0.1.0 — Foundation / Deployable Skeleton**

### Tiếp theo
- ⏭️ **V0.2.0 — Data Model + Import POC**
  - PostgreSQL schema
  - RLS cơ bản
  - master catalogs
  - import dry-run
  - PLHĐ/ISSUE mapping report
  - seed dữ liệu thật có kiểm soát

---

## 10. Security note cho Link Remote Server

V0.1.0 **không chứa credential thật**.

Các trường username/password/token trong workbook phải được xử lý ở version bảo mật:
- server-only encryption
- role check
- reveal/copy API
- audit logs
- rotate credential cũ nếu từng được lưu plain text

---

© 2026 HuyVo. All rights reserved.
