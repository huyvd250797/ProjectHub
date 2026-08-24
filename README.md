# ASC WORKING — V0.9.0

**Hardening + UAT** — Production Candidate của Project Workspace đa dự án.

## Đã hoàn thành
- V0.1.0 Foundation
- V0.2.0 Data Model + Import POC
- V0.3.0 Dashboard / Real Project Data
- V0.4.0 PLHĐ Unified View
- V0.5.0 Department Intelligence
- V0.6.0 ISSUE Core
- V0.7.0 ISSUE Productivity
- V0.8.0 Remote Server Security
- ✅ **V0.9.0 Hardening + UAT**

## V0.9.0 có gì mới?
- **Hardening & UAT Center** tại `/settings/uat`.
- Automated readiness check cho Auth, Project membership/RLS, core schema, Dashboard RPC, ISSUE Productivity, Remote Security và data quality.
- Manual regression checklist theo từng project, lưu trên browser và có thể copy UAT report.
- Route-level loading skeleton + error boundary + trang 404 đồng bộ theme.
- Không còn fallback EPU demo khi Supabase đã cấu hình nhưng user chưa có Project/RLS: hệ thống hiển thị đúng trạng thái chưa được cấp quyền.
- Security response headers: nosniff, DENY frame, Referrer Policy, Permissions Policy, COOP, HSTS.
- Tối ưu Resource Vault: permission được load theo batch thay vì query N+1 theo từng resource.
- Migration V0.9.0 bổ sung index cho ISSUE active rows, PLHĐ, Phòng ban và Resource/Audit queries.
- Preflight script trước release: `npm run preflight`.

## Bắt buộc trước UAT/Production Candidate
1. Đã chạy migration V0.2 → V0.8.
2. Chạy thêm:
   `supabase/migrations/202608240002_v090_hardening.sql`
3. Vercel phải có:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_ENCRYPTION_KEY`
4. Redeploy.
5. Mở **Thiết lập → Hardening & UAT Center** và xử lý mọi check `FAIL` trước V1.0.0.

## Kiểm tra local
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

## Deploy Vercel
- Framework Preset: Next.js
- Build Command: Default (`npm run build`)
- Output Directory: để trống / Default
- Không dùng `out`.

## Security
Không commit `.env.local`, Service Role hoặc APP_ENCRYPTION_KEY. Không log/export plaintext credential. Nếu APP_ENCRYPTION_KEY đang dùng cho Resource Vault production thì không đổi key tùy ý nếu chưa có kế hoạch rotate/re-encrypt.

## Tiếp theo
**V1.0.0 — Production Release**: freeze schema/scope, final migration/cut-over dữ liệu, user/role cuối, smoke test, release note và runbook vận hành.

© 2026 HuyVo. All rights reserved.
