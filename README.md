# ASC WORKING — V0.5.0

**Department Intelligence / Phòng ban** — Project Workspace đa dự án.

EPU là project đầu tiên hiện tại, không phải tên workspace. Tất cả Dashboard, PLHĐ, Phòng ban và các API đều hoạt động theo `project_id` của project đang chọn.

## Version history
- ✅ V0.1.0 — Foundation / Deployable Skeleton
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data
- ✅ V0.4.0 — PLHĐ Unified View
- ✅ V0.5.0 — Department Intelligence / Phòng ban

## V0.5.0 có gì mới?

### Department Intelligence thật theo project
Route `/departments` đọc dữ liệu từ Supabase theo project hiện tại:

- Tổng ISSUE theo phòng ban.
- Đã xử lý.
- Đã Release.
- Đã bàn giao / còn lại.
- ISSUE quá hạn / gần due date.
- % bàn giao.
- Đầu mối stakeholder theo phòng ban.
- Module PLHĐ phòng ban phụ trách.
- ISSUE cần chú ý.
- Search, filter và sort.
- Drawer chi tiết phòng ban.
- Drill-down sang ISSUE theo bộ lọc.
- Drill-down sang PLHĐ Module.

### Bucket “Chưa xác định phòng ban”
ISSUE chưa có `department_id` được đưa vào bucket riêng thay vì bị mất khỏi thống kê.

Điều này đảm bảo:

```text
Tổng ISSUE theo phòng ban + Chưa xác định = Tổng ISSUE project
```

### Dashboard integration
Top phòng ban trên Dashboard V0.3.0 nay mở trực tiếp Department Intelligence:

```text
Dashboard → Department Intelligence → ISSUE / Module
```

### Multi-project
Đổi project bằng Project Switcher sẽ tự tải lại dữ liệu phòng ban của project mới.

## Supabase

Nếu đã chạy migration V0.2.0 → V0.4.0, chạy thêm:

```text
supabase/migrations/202608220004_v050_department_rpc.sql
```

Chi tiết: `docs/DEPARTMENT_V050_SETUP.md`.

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
**V0.6.0 — ISSUE Core**: CRUD ISSUE thật, inline edit, filter, drawer, assignee, due date, Module, Phòng ban và history.

© 2026 HuyVo. All rights reserved.
