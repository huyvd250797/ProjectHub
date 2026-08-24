# ASC WORKING V0.9.2 — Excel Import UAT

- [ ] Chọn EPU → tải template; file có `PROJECT`, `ISSUE`, `PLHĐ`, `RESOURCE`, `DANH MỤC`.
- [ ] Đổi sang Project khác → template mới có project_id/project_code khác trong `__META`.
- [ ] Upload template của Project A khi đang chọn Project B → validation BLOCKED.
- [ ] Xóa sheet bắt buộc → validation BLOCKED.
- [ ] Trùng `key` trong một sheet → validation BLOCKED.
- [ ] `module_key` không có trong PLHĐ → validation BLOCKED.
- [ ] `department_key` không có trong PHÒNG BAN → validation BLOCKED.
- [ ] Workbook legacy vẫn Dry-run nhưng không có nút Apply.
- [ ] Preview hiển thị incoming / insert / update.
- [ ] Member/Viewer không Apply được.
- [ ] MASTER/Admin/PM Apply Merge thành công.
- [ ] Import lại cùng file ở Merge → các key chuyển từ insert sang update, không tạo duplicate.
- [ ] Insert Only bỏ qua key đã tồn tại.
- [ ] ISSUE import tạo `issue_no` và history như V0.6.0.
- [ ] RESOURCE metadata import không thay encrypted secret đã có.
- [ ] RESOURCE có cột password/secret/token → validation BLOCKED.
- [ ] Apply lỗi giữa chừng → transaction rollback toàn bộ.
- [ ] Apply thành công tạo record trong `import_batches` với source hash + batch id.
