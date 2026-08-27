# UAT V1.4.0 — Project Documents / Google Drive

## Cấu hình

- [ ] Migration `202608270001_v140_google_drive_documents.sql` đã chạy.
- [ ] Ba biến OAuth Google Drive và `SUPABASE_SERVICE_ROLE_KEY` đã cấu hình server-only.
- [ ] System Information báo **Project Documents — Google Drive Ready**.
- [ ] Không có secret Google Drive trong source, browser bundle hoặc Network response.

## Upload và xác minh

- [ ] MASTER/Admin/PM/Member upload được PDF/ảnh/tài liệu văn phòng.
- [ ] Viewer nhận 403 khi thử upload.
- [ ] Tiến độ upload hiển thị từ 0–100%.
- [ ] File lớn hơn 250 MB bị từ chối trước khi tạo session.
- [ ] `.exe`, `.msi`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.php`, `.jar` bị chặn.
- [ ] Metadata chỉ được tạo sau khi Google Drive trả file hợp lệ.
- [ ] File nằm đúng folder của Project, không lẫn giữa hai Project.

## Danh sách và nội dung

- [ ] Danh sách chỉ hiển thị tài liệu của Project đang chọn.
- [ ] Search tìm theo tiêu đề, tên file, mô tả hoặc nhãn liên kết.
- [ ] Filter loại tài liệu và đối tượng liên kết hoạt động.
- [ ] PDF/ảnh/text preview được; định dạng khác có download fallback.
- [ ] Range request cho PDF/video trả `206` khi Google Drive hỗ trợ.
- [ ] Người không thuộc Project không xem/download được URL tài liệu.

## Quyền và vòng đời

- [ ] MASTER/Admin/PM sửa được tiêu đề, phân loại, mô tả/liên kết.
- [ ] Member/Viewer không sửa hoặc archive được.
- [ ] Archive làm tài liệu biến khỏi danh sách nhưng file gốc vẫn còn trên Drive.
- [ ] Activity Center nhận event upload/update/archive/restore.

## Regression

- [ ] Import nhanh Phòng ban, PLHĐ, PLHĐ chi tiết V1.3.2 vẫn hoạt động.
- [ ] Dashboard, Analytics, Reports, ISSUE, Remote Server không đổi quyền/hành vi.
- [ ] `npm run preflight`, `npm run typecheck`, `npm run lint`, `npm run build` đều pass.
