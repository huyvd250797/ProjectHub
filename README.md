# ASC WORKING — V1.0.1

**Dark Mode Contrast & Visual Polish — Production Patch**

**Production Release** — Project Workspace đa dự án cho triển khai phần mềm.

## Production scope

- Multi-project + Project Switcher.
- MASTER toàn hệ thống; Admin / PM / Member / Viewer theo Project.
- Project Profile + Project Team / ISSUE Assignee Sync.
- Dashboard dữ liệu thật theo Project.
- PLHĐ Unified View + virtualized detail tree.
- Department Intelligence.
- ISSUE Core + Productivity: CRUD, inline edit, bulk update, saved views, column preferences, export.
- Searchable combobox toàn hệ thống + sticky ISSUE grid header.
- Excel Import Production: tải template → fill → preview → transaction apply.
- Remote Server Security: AES-256-GCM, Reveal/Copy permission, audit.
- Hardening & UAT Center.
- **Dark / Light Mode**: icon Sun/Moon ở Topbar, lưu preference trên browser và tự theo system theme khi chưa chọn.
- **System Information**: `/settings/system`.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
APP_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` và `APP_ENCRYPTION_KEY` là **server-only**, không dùng `NEXT_PUBLIC_` và không commit vào Git. Sau khi đã lưu credential Remote Server thật, không đổi `APP_ENCRYPTION_KEY` nếu chưa có kế hoạch rotate/migrate ciphertext.

## Database baseline

V1.0.1 **không yêu cầu migration Supabase mới**. Production database phải đã chạy migration đến:

```text
supabase/migrations/202608240006_v095_project_members_assignees.sql
```

## Local

```bash
npm install
npm run preflight
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Vercel

- Framework: Next.js.
- Build Command: Default (`npm run build`).
- Output Directory: **Default / để trống**, không đặt `out`.
- Cấu hình toàn bộ environment variables rồi Redeploy.
- Sau deploy: mở `Thiết lập → System Information` và `Hardening & UAT`.

## Theme UX

Nút theme nằm ở **Topbar góc phải, ngay trước chuông thông báo**. Đây là vị trí phù hợp vì theme là thiết lập toàn app, luôn truy cập được nhưng không tranh chỗ với Project Switcher. Màn hình Login cũng có cùng nút ở góc phải trên.

## Production gate

Trước khi coi deployment là Production Ready:

1. `npm run preflight` PASS.
2. Vercel build PASS.
3. System Information xác nhận Supabase / Database / Service Role / Encryption.
4. UAT Center không có FAIL blocker.
5. Smoke test Dashboard → PLHĐ → Phòng ban → ISSUE → Excel Import → Remote Server.
6. Backup database trước các import/migration lớn.

Xem thêm:
- `docs/PRODUCTION_V100_RELEASE.md`
- `docs/PRODUCTION_CHECKLIST_V100.md`
- `docs/BACKUP_RESTORE_ROLLBACK_V100.md`
- `docs/UAT_V100_CHECKLIST.md`

© 2026 HuyVo. All rights reserved.
