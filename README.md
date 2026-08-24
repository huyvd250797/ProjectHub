# ASC WORKING — V0.9.4

**Searchable Combobox & Sticky Grid UX**

ASC WORKING là Project Workspace đa dự án. V0.9.4 giữ nguyên toàn bộ nghiệp vụ đến V0.9.3 và tập trung nâng trải nghiệm thao tác dữ liệu: combobox có thể gõ để tìm kiếm trên toàn hệ thống và tiêu đề lưới ISSUE được cố định trong vùng cuộn.

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
- ✅ V0.9.3 — Project Profile / Project Management
- ✅ **V0.9.4 — Searchable Combobox & Sticky Grid UX**
- ⏭ V1.0.0 — Production Release

## V0.9.4 có gì mới?

### 1. Searchable Combobox toàn hệ thống

Hai component combobox dùng chung của hệ thống đều được nâng cấp:

- `ThemedSelect`: Project Switcher, bộ lọc, form, Master Console, PLHĐ, Phòng ban, Remote Server...
- `FloatingSelect`: các combobox inline trong lưới ISSUE.

Khi mở combobox, hệ thống tự focus vào ô tìm kiếm. Người dùng có thể gõ tên cần tìm rồi chọn kết quả thay vì phải cuộn danh sách dài.

Tìm kiếm áp dụng trên:
- label;
- description;
- value/code;
- không phân biệt chữ hoa/thường;
- hỗ trợ tìm tiếng Việt không dấu.

Ví dụ `quan ly dao tao` vẫn tìm được `Phòng quản lý đào tạo`.

### 2. Sticky ISSUE Grid Header

Lưới ISSUE chuyển sang vùng cuộn riêng có giới hạn theo viewport. Hàng tiêu đề:

`Mã | Nội dung yêu cầu | Trạng thái | Trạng thái KH | Ưu tiên | Module | Phòng ban | Phụ trách...`

được giữ cố định ở phía trên khi cuộn qua các ISSUE.

Các cột pin bên trái vẫn hoạt động cùng sticky header; ô góc checkbox có z-index riêng để không bị đè khi cuộn ngang/dọc.

## Nâng từ V0.9.3

Không có migration database mới ở V0.9.4.

Giữ nguyên Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
```

Build / deploy:

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

V0.9.4 tiếp tục sử dụng **Template Excel contract V0.9.2**, không thay đổi cấu trúc import.

## Tài liệu
- `docs/V0.9.4-SCOPE.md`
- `docs/UAT_V094_GRID_UX_CHECKLIST.md`
- `docs/PROJECT_PROFILE_V093_SETUP.md`
- `docs/EXCEL_IMPORT_V092_SETUP.md`
- `docs/HARDENING_V090_SETUP.md`

## Vercel
- Framework Preset: Next.js
- Build Command: Default
- Output Directory: Default / để trống
- Không dùng `out`

© 2026 HuyVo. All rights reserved.
