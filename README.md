# ASC WORKING — V0.3.0

**Dashboard / Real Project Data**  
Ứng dụng: **ASC WORKING**  
Loại workspace: **Project Workspace đa dự án**.

> EPU là project đầu tiên đang sử dụng hệ thống, không phải tên workspace. Khi có Project B/C..., cùng UI Dashboard/PLHĐ/ISSUE/Phòng ban/Remote Server sẽ đọc dữ liệu theo `project_id` của project đang chọn.

## Version history
- ✅ V0.1.0 — Foundation / Deployable Skeleton
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data

## V0.3.0 có gì mới?
- Đổi branding **PROJECT HUB → ASC WORKING**.
- Giữ nguyên logo/icon HV đã cung cấp.
- Project Switcher tiếp tục là nền multi-project.
- Dashboard bỏ mock khi Supabase đã cấu hình.
- API server: `GET /api/dashboard?projectId=<uuid>`.
- RPC Supabase aggregate theo project: `get_project_dashboard`.
- Project Overview: HĐ, ngày ký, start/end, status, contract value.
- Master Plan: tổng ngày, đã chạy, còn lại, time progress, health.
- Project Stage progress.
- ISSUE KPI / customer handover KPI.
- Needs Attention: overdue, missing assignee/module/department, near due.
- Contract Pulse.
- Department ranking.
- ASC member workload.
- Loading, empty database và migration-required state.

## Supabase migration
Chạy V0.2.0 trước:

```text
supabase/migrations/202608220001_v020_core_schema.sql
```

Sau đó chạy V0.3.0:

```text
supabase/migrations/202608220002_v030_dashboard_rpc.sql
```

Chi tiết: `docs/DASHBOARD_V030_SETUP.md`.

## Chạy local

```bash
npm install
npm run dev
```

## Build kiểm tra

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy Vercel
- Framework Preset: Next.js
- Build Command: Default
- Output Directory: **Default / để trống**
- Không cấu hình `out`

Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Nếu chưa cấu hình Supabase, app chạy Demo Mode để xem UI. Khi Supabase đã cấu hình, Dashboard chỉ đọc dữ liệu thật; nếu project chưa có ISSUE/PLHĐ thì KPI hiển thị 0 thay vì dùng mock.

## Security
- Dashboard API kiểm tra user đăng nhập.
- RPC kiểm tra `is_project_member(project_id)` trước khi aggregate.
- Không tải toàn bộ ISSUE về browser để tự đếm.
- Credential Remote Server vẫn chưa đưa vào Dashboard/API.

## Tiếp theo
**V0.4.0 — PLHĐ Unified View**: hoàn thiện PLHĐ tổng quan + tree chi tiết, virtualization, mapping và drill-down theo project.

© 2026 HuyVo. All rights reserved.
