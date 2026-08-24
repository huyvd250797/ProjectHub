# ASC WORKING V0.8.0 — Remote Server Security setup

## 1. Chạy migration
Trong Supabase → SQL Editor, chạy:

`supabase/migrations/202608240001_v080_remote_security.sql`

Migration bổ sung:
- `remote_resource_permissions`: cấp riêng quyền Reveal/Copy cho Member.
- `remote_resource_access_logs`: audit các hành động Reveal, Copy, Open link, Create, Update, Delete, Secret update/clear.
- `created_by`, `updated_by` cho `remote_resources`.

`remote_resource_secrets` đã có từ V0.2.0 và vẫn **không có policy browser**.

## 2. Vercel Environment Variables
Ngoài Supabase URL/Publishable Key hiện tại, Production/Preview cần:

```env
SUPABASE_SERVICE_ROLE_KEY=<service_role key của project Supabase>
APP_ENCRYPTION_KEY=<random secret dài tối thiểu 24 ký tự, khuyến nghị 32+ byte>
```

Không prefix hai biến này bằng `NEXT_PUBLIC_`.

Có thể tạo encryption key bằng Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Sau khi đặt biến trên Vercel, Redeploy.

### Quan trọng về APP_ENCRYPTION_KEY
- Không đổi key tùy ý sau khi đã lưu credential.
- Nếu đổi key, secret cũ sẽ không giải mã được.
- Lưu key trong password manager/vault của tổ chức.

## 3. Cơ chế bảo mật V0.8.0
- Browser list chỉ nhận metadata + `hasSecret` + hint mask.
- Plaintext secret không nằm trong `remote_resources`.
- Server mã hóa AES-256-GCM trước khi ghi `remote_resource_secrets`.
- Cipher có AAD gắn `projectId:resourceId`, giúp payload không thể hoán đổi sang resource khác.
- Reveal trả plaintext bằng response `Cache-Control: no-store`, UI tự ẩn sau 10 giây.
- Copy không giữ secret trong React state: nhận → clipboard → bỏ response.
- Audit log không lưu plaintext secret. Thay đổi quyền Reveal/Copy cũng được audit.

## 4. Quyền
- Admin/PM: CRUD metadata, Reveal, Copy, audit.
- Member: xem metadata; Reveal/Copy chỉ khi có grant trong `remote_resource_permissions`.
- Viewer: xem metadata; không Reveal/Copy.

API permissions đã có tại `/api/resources/[resourceId]/permissions` để nền tảng sẵn sàng cho màn hình cấp quyền chi tiết.

## 5. Credential cũ từ workbook
Không import tự động plaintext credential từ sheet `LinkRemoteServer`.
Khuyến nghị:
1. Rotate credential cũ nếu đã từng chia sẻ/lưu plain text.
2. Tạo resource metadata trên ASC WORKING.
3. Nhập credential mới qua Resource Vault để server mã hóa.
