# ASC WORKING — V0.9.3

**Project Profile / Project Management**

ASC WORKING là Project Workspace đa dự án. V0.9.3 giữ nguyên toàn bộ chức năng đến V0.9.2 và bổ sung khả năng cập nhật đầy đủ hồ sơ Project sau khi tạo.

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
- ✅ V0.9.2 — Excel Import Production / Template Round-trip
- ✅ **V0.9.3 — Project Profile / Project Management**
- ⏭ V1.0.0 — Production Release

## V0.9.3 có gì mới?

Trong `Thiết lập → Master Project Console`, nút trước đây chỉ quản lý thành viên được nâng thành **Quản lý Project** với hai tab:

1. **Hồ sơ dự án**
2. **Thành viên**

Hồ sơ dự án cho phép cập nhật:
- Mã Project, slug, tên dự án, mô tả, trạng thái.
- Tên trường/đơn vị, mã đơn vị, địa chỉ.
- Số hợp đồng, giá trị hợp đồng, ngày ký.
- Ngày bắt đầu, ngày kết thúc dự kiến.
- Đầu mối khách hàng: họ tên, chức vụ, email, điện thoại.
- Ghi chú vận hành cấp Project.

Sau khi lưu, app refresh Server Component để Project Switcher/Dashboard sử dụng dữ liệu mới.

## Nâng từ V0.9.2

### 1. Chạy migration V0.9.3

Supabase → SQL Editor:

```text
supabase/migrations/202608240005_v093_project_profile.sql
```

Migration chỉ mở rộng bảng `projects`, không xóa dữ liệu hiện có.

### 2. Environment Variables

Giữ nguyên:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
```

### 3. Build / deploy

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

## Excel Import

V0.9.3 tiếp tục sử dụng **Template Excel contract V0.9.2** để đảm bảo backward compatibility. Không cần đổi template chỉ vì nâng Project Profile.

## Tài liệu
- `docs/PROJECT_PROFILE_V093_SETUP.md`
- `docs/UAT_V093_PROJECT_PROFILE_CHECKLIST.md`
- `docs/EXCEL_IMPORT_V092_SETUP.md`
- `docs/HARDENING_V090_SETUP.md`

## Vercel
- Framework Preset: Next.js
- Build Command: Default
- Output Directory: Default / để trống
- Không dùng `out`

© 2026 HuyVo. All rights reserved.
