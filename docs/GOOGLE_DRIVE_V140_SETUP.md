# Thiết lập Google Drive cho ASC WORKING V1.4.0

## 1. Google Cloud

1. Tạo/chọn Google Cloud Project.
2. Bật **Google Drive API**.
3. Cấu hình OAuth consent screen.
4. Tạo OAuth Client ID loại **Web application**.
5. Thêm Redirect URI `http://127.0.0.1:53682/oauth/callback`.

Ứng dụng dùng scope tối thiểu `https://www.googleapis.com/auth/drive.file`. Nên dùng một tài khoản Google Workspace chuyên dụng cho kho tài liệu dự án.

## 2. Lấy Refresh Token

Chạy ở máy local, không chạy trên Vercel:

```bash
export GOOGLE_DRIVE_CLIENT_ID='...apps.googleusercontent.com'
export GOOGLE_DRIVE_CLIENT_SECRET='...'
npm run drive:oauth
```

Mở URL được in ra, đồng ý quyền Drive, rồi sao chép `GOOGLE_DRIVE_REFRESH_TOKEN` từ Terminal. Script không ghi secret vào file.

## 3. Environment server/Vercel

```env
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

`GOOGLE_DRIVE_ROOT_FOLDER_ID` là tùy chọn. Khuyến nghị để trống để ứng dụng tự tạo thư mục `ASC-WORKING` và quản lý bằng scope `drive.file`. Nếu cấu hình sẵn folder ID, tài khoản OAuth phải có quyền truy cập folder đó.

Không thêm tiền tố `NEXT_PUBLIC_` cho bất kỳ biến Google Drive nào.

## 4. Supabase

Chạy migration sau các migration V1.3.2:

```text
supabase/migrations/202608270001_v140_google_drive_documents.sql
```

Migration tạo:

- `project_document_folders`
- `project_document_upload_sessions`
- `project_documents`
- index, trigger `updated_at` và RLS policy theo Project role.

`SUPABASE_SERVICE_ROLE_KEY` bắt buộc để xác minh upload session và tạo metadata an toàn.

## 5. Deploy và kiểm tra

1. Redeploy sau khi thêm environment.
2. Đăng nhập MASTER/Admin/PM/Member và chọn Project.
3. Vào **Tài liệu**, upload PDF nhỏ.
4. Xác nhận preview, download, tìm kiếm và phân loại.
5. Mở Google Drive của tài khoản OAuth, xác nhận cây `ASC-WORKING/<Mã Project - Tên Project>`.
6. Chạy UAT trong `docs/UAT_V140_PROJECT_DOCUMENTS_CHECKLIST.md`.

## Xử lý lỗi nhanh

- `GOOGLE_TOKEN_FAILED`: kiểm tra Client ID/Secret, refresh token hoặc trạng thái consent app.
- `DRIVE_ROOT_INVALID`: folder ID không tồn tại, đã vào Trash hoặc không phải folder.
- `DRIVE_UPLOAD_SESSION_FAILED`: kiểm tra Drive API đã bật, quota và quyền của tài khoản OAuth.
- `MIGRATION_REQUIRED`: chạy đúng migration V1.4.0 trên Supabase của môi trường đang dùng.
- Upload xong nhưng không hoàn tất metadata: không tự tạo bản ghi thủ công; kiểm tra server log và retry file để giữ chuỗi xác minh nhất quán.
