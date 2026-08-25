# Backup / Restore / Rollback — V1.0.0

## Trước release
1. Tạo backup database Supabase theo chính sách của project.
2. Ghi lại deployment production đang ổn định trên Vercel.
3. Không thay `APP_ENCRYPTION_KEY`.

## Rollback source
Nếu V1.0.0 có lỗi nghiêm trọng, rollback Vercel về deployment gần nhất đã xác nhận hoặc revert Git commit release.

## Database
V1.0.0 không có migration mới, vì vậy rollback source không yêu cầu rollback schema.

## Secret
Không restore/rotate `APP_ENCRYPTION_KEY` tùy ý. Ciphertext Remote Server phụ thuộc key hiện tại.
