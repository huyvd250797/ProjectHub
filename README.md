# ASC WORKING — V0.9.2

**Excel Import Production / Template Round-trip**

ASC WORKING là **Project Workspace đa dự án**. EPU chỉ là Project đầu tiên. V0.9.2 giữ nguyên MASTER/Multi-Project của V0.9.1 và nâng `Data Import POC` thành luồng Excel production có template chuẩn, preview và Apply Import transaction.

## Version history
- ✅ V0.1.0 — Foundation
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data
- ✅ V0.4.0 — PLHĐ Unified View
- ✅ V0.5.0 — Department Intelligence
- ✅ V0.6.0 — ISSUE Core
- ✅ V0.7.0 — ISSUE Productivity
- ✅ V0.8.0 — Remote Server Security
- ✅ V0.9.0 — Hardening + UAT
- ✅ V0.9.1 — Master Account / Multi-Project Access
- ✅ **V0.9.2 — Excel Import Production / Template Round-trip**
- ⏭ V1.0.0 — Production Release

## V0.9.2 có gì mới?
- **Tải mẫu Excel theo Project** tại `Thiết lập → Excel Import Production`.
- Template gắn `project_id`, `project_code`, `template_version` trong sheet ẩn `__META` để chống import nhầm Project.
- Các sheet chuẩn:
  - PROJECT
  - GIAI ĐOẠN
  - PHÒNG BAN
  - NHÂN SỰ
  - PLHĐ
  - PLHĐ CHI TIẾT
  - ISSUE
  - RELEASE
  - RESOURCE
  - DANH MỤC
- Upload file đã fill → **Validation / Dry-run → Database Preview → Apply Import**.
- Preview hiển thị số `incoming / insert / update` theo entity.
- Hai mode:
  - **Merge**: key cũ cập nhật, key mới thêm mới.
  - **Insert Only**: key cũ bỏ qua, chỉ thêm key mới.
- Stable `import_key` để import lại cùng file mà không tạo duplicate theo key.
- Apply chạy trong **một PostgreSQL transaction**; lỗi giữa chừng rollback toàn bộ.
- Mỗi Apply thành công tạo `import_batches` với file name, SHA-256, mode, summary và user thực hiện.
- Chỉ **MASTER / Admin / PM** được Apply. Member/Viewer có thể tải template + Dry-run.
- Workbook legacy `[EPU] _ ASC-Working.xlsx` vẫn Dry-run được nhưng **không Apply production**.
- `RESOURCE` chỉ import metadata; **không có password/token/secret** và không ghi đè encrypted secret hiện có.

## Nâng từ V0.9.1

### 1. Chạy migration V0.9.2
Supabase → SQL Editor:

```text
supabase/migrations/202608240004_v092_excel_import_production.sql
```

Không cần chạy lại migration V0.9.1 nếu database đã có MASTER/Multi-Project.

### 2. Giữ Environment Variables hiện tại

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
```

Không commit `.env.local`, Service Role hoặc APP_ENCRYPTION_KEY.

### 3. Deploy và kiểm tra

```bash
npm install
npm run preflight
npm run typecheck
npm run lint
npm run build
```

Hoặc:

```bash
npm run check
```

## Luồng sử dụng Excel Import

```text
Chọn Project
    ↓
Tải Template V0.9.2
    ↓
Fill Excel
    ↓
Upload
    ↓
Validation / Dry-run
    ↓
Database Preview
    ↓
Chọn Merge / Insert Only
    ↓
Nhập mã Project xác nhận
    ↓
Apply Import transaction
    ↓
Batch ID + Reload Project
```

Xem chi tiết: `docs/EXCEL_IMPORT_V092_SETUP.md`.

## Vercel
- Framework Preset: **Next.js**
- Build Command: Default
- Output Directory: Default / để trống
- Không dùng `out`

© 2026 HuyVo. All rights reserved.
