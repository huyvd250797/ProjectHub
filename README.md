# ASC WORKING — V0.4.0

**PLHĐ Unified View** — Project Workspace đa dự án.

EPU là project đầu tiên hiện tại, không phải tên workspace. Mọi màn hình dùng `project_id` để tái sử dụng cho các dự án tiếp theo.

## Version history
- ✅ V0.1.0 — Foundation / Deployable Skeleton
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data
- ✅ V0.4.0 — PLHĐ Unified View

## V0.4.0 có gì mới?

### PLHĐ thật theo project
Route `/contract` có hai chế độ:
- Tổng quan PLHĐ
- Chi tiết PLHĐ

Tính năng:
- KPI Phân hệ / Module / chi tiết / ISSUE / bàn giao.
- Search và filter.
- Module progress.
- Drill-down ISSUE.
- Tree detail với expand/collapse.
- Virtualized rendering cho 5.000+ node.
- Focus Module từ tổng quan sang chi tiết.
- Drawer node detail.
- Cảnh báo mapping.

### UX fixes
- Click logo ASC WORKING => reload trang hiện tại.
- Spinner nút đăng nhập giữ trạng thái quay cho đến khi redirect vào workspace hoàn tất.
- Project Switcher dùng custom themed combobox; không còn dropdown native màu xanh/trắng lệch theme.

## Supabase

Nếu bạn đã chạy migration V0.2.0 + V0.3.0, chạy thêm:

```text
supabase/migrations/202608220003_v040_contract_rpc.sql
```

Chi tiết: `docs/CONTRACT_V040_SETUP.md`.

## Local

```bash
npm install
npm run dev
```

Node.js >= 20.9.

## Build

```bash
npm run check
```

hoặc:

```bash
npm run build
```

## Vercel
- Framework: Next.js
- Build Command: Default
- Output Directory: Default / để trống
- Không cấu hình `out`

Environment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
APP_URL=
```

## Tiếp theo
**V0.5.0 — Phòng ban / Real Department Data**.

© 2026 HuyVo. All rights reserved.
