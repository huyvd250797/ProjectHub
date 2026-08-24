# ASC WORKING V0.9.0 — Hardening + UAT Setup

## 1. Database
Nếu Supabase đã chạy migration đến V0.8.0, chạy thêm trong SQL Editor:

`supabase/migrations/202608240002_v090_hardening.sql`

Migration chỉ bổ sung index + ANALYZE, không xóa/đổi dữ liệu nghiệp vụ.

## 2. Vercel Environment
Production/Preview cần:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`

Không prefix hai key server-only bằng `NEXT_PUBLIC_`.

## 3. UAT
Sau deploy Preview:
1. Login bằng user thật.
2. Chọn project cần test.
3. Vào `Thiết lập → Hardening & UAT Center`.
4. Automated check không được còn FAIL.
5. Tick manual regression checklist.
6. Copy UAT report để lưu biên bản test.

## 4. Production Gate
- Không còn P0/P1 bug mở.
- RLS/role đã test bằng ít nhất Viewer + Member + PM/Admin.
- Resource secret Reveal/Copy và audit được xác nhận.
- Backup/rollback đã chuẩn bị.
