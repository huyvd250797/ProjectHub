# ASC WORKING — V0.6.0

**ISSUE Core** — Project Workspace đa dự án.

ASC WORKING là workspace chung; EPU chỉ là project đầu tiên. Dashboard, PLHĐ, Phòng ban, ISSUE và Remote Server đều chạy theo `project_id` của project đang chọn.

## Version đã hoàn thành

- ✅ V0.1.0 — Foundation
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data
- ✅ V0.4.0 — PLHĐ Unified View
- ✅ V0.5.0 — Department Intelligence
- ✅ **V0.6.0 — ISSUE Core**

## V0.6.0 có gì mới?

### ISSUE thật theo project

`/issues` không còn dùng skeleton/mock khi Supabase đã cấu hình. Data được query theo project đang chọn với pagination server-side.

### CRUD + inline edit

- Tạo ISSUE.
- Sửa trong drawer.
- Inline edit trạng thái, trạng thái KH, ưu tiên, Module, Phòng ban và phụ trách.
- Archive cho PM/Admin.

### Filter/deep-link

Hỗ trợ search và filter theo status, customer status, priority, stage, Module, Department, Assignee, overdue, near due, missing mapping và `issueId`.

Các deep-link từ Dashboard, PLHĐ và Department Intelligence tiếp tục hoạt động.

### ISSUE history

Migration V0.6.0 tự ghi lịch sử khi thay đổi các trường nghiệp vụ quan trọng. Drawer có tab **Lịch sử** để xem ai đổi, lúc nào và giá trị cũ/mới.

### Multi-project

Mỗi ISSUE có `project_id`. Đổi Project Switcher → list, lookup và KPI ISSUE đổi theo project mới.

## Cài đặt

```bash
npm install
npm run dev
```

## Supabase

Nếu đã chạy migration V0.2.0 → V0.5.0, chạy thêm:

```text
supabase/migrations/202608220005_v060_issue_core.sql
```

Chi tiết: `docs/ISSUE_V060_SETUP.md`.

## Deploy Vercel

- Framework: Next.js.
- Build Command: Default.
- Output Directory: **Default / để trống**.
- Không dùng `out`.
- Giữ các Environment Variables Supabase hiện có.

## Next version

**V0.7.0 — ISSUE Productivity**: bulk update, saved views, column preferences, export và thao tác grid nâng cao.

© 2026 HuyVo. All rights reserved.
