# ASC WORKING — V0.8.0

**Remote Server Security** — Project Workspace đa dự án.

## Đã hoàn thành
- V0.1.0 Foundation
- V0.2.0 Data Model + Import POC
- V0.3.0 Dashboard / Real Project Data
- V0.4.0 PLHĐ Unified View
- V0.5.0 Department Intelligence
- V0.6.0 ISSUE Core
- V0.7.0 ISSUE Productivity
- ✅ **V0.8.0 Remote Server Security**

## V0.8.0 có gì mới?
- Remote Server / Resource Vault dùng dữ liệu thật theo project đang chọn.
- CRUD Portal / Server / Database / Folder / Test / Other.
- Phân môi trường Production / Staging / Test / Development.
- Credential mã hóa **AES-256-GCM server-side**.
- Secret tách khỏi metadata và không xuất hiện trong list API.
- Reveal credential trong 10 giây, tự ẩn.
- Copy credential với kiểm tra quyền.
- PM/Admin mặc định được Reveal/Copy; Member có nền tảng grant riêng theo resource.
- Audit: reveal/copy/open/create/update/delete/secret update/clear.
- Search/filter và drawer bảo mật đồng bộ theme.

## Bắt buộc trước khi dùng credential thật
1. Chạy migration:
   `supabase/migrations/202608240001_v080_remote_security.sql`
2. Vercel thêm server-only env:
   `SUPABASE_SERVICE_ROLE_KEY`
   `APP_ENCRYPTION_KEY`
3. Redeploy.

Xem chi tiết: `docs/REMOTE_SECURITY_V080_SETUP.md`.

## Deploy Vercel
- Framework Preset: Next.js
- Build Command: Default
- Output Directory: để trống / Default
- Không dùng `out`.

## Security
Không commit `.env.local`, service role hoặc encryption key. Không copy credential thật từ workbook vào source. Credential cũ từng nằm plaintext nên được rotate trước khi nhập vào Resource Vault.

## Tiếp theo
**V0.9.0 — Hardening + UAT**: performance, security review, responsive, loading/error states, regression/UAT fixes và chuẩn bị production.

© 2026 HuyVo. All rights reserved.
