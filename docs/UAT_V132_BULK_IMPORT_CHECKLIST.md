# UAT V1.3.2 — Bulk Master Data Import / Direct Excel

## Database

- [ ] Chạy/rerun `202608260004_v132_bulk_master_data_import.sql` thành công.
- [ ] RPC `preview_quick_master_import_v132` tồn tại.
- [ ] RPC `apply_quick_master_import_v132` tồn tại.
- [ ] Dữ liệu cũ ở `departments`, `contract_items`, `contract_detail_items` có `import_key`.

## File đơn giản giống `IMP-PLHD-PhongBan.xlsx`

- [ ] File có 3 sheet `Phòng ban`, `PLHĐ`, `PLHĐ chi tiết` được nhận diện mà không cần `__META`.
- [ ] Sheet Phòng ban chỉ có cột A vẫn Preview được.
- [ ] Sheet PLHĐ chỉ có cột A vẫn Preview được và tự nhận diện Nhóm / Phân hệ / Module.
- [ ] Sheet PLHĐ chi tiết cột A=Mã, B=Nội dung được dựng cây cha-con.
- [ ] Dòng chi tiết có tên trùng Module được tự mapping Module.
- [ ] Dòng chưa mapping được hiển thị cảnh báo, không báo lỗi chung chung.

## Phạm vi Import

- [ ] Từ màn Phòng ban, mở Import mặc định chỉ chọn Phòng ban.
- [ ] Từ màn PLHĐ, mở Import mặc định chọn PLHĐ + PLHĐ chi tiết.
- [ ] Từ Danh mục Project, phạm vi mặc định thay đổi theo tab.
- [ ] Có thể bật/tắt nhóm dữ liệu trước Preview.

## Preview / Apply

- [ ] Preview hiển thị số dòng nhận diện ở từng sheet.
- [ ] Preview hiển thị Insert / Update theo database hiện có.
- [ ] Sai/thiếu sheet cần import hiển thị tên sheet cụ thể.
- [ ] Chỉ file `.xlsx` tối đa 20 MB được chấp nhận.
- [ ] Phải nhập đúng mã Project mới bật Apply.
- [ ] Merge cập nhật bản ghi đã khớp và thêm bản ghi mới.
- [ ] Import lại cùng file không tạo duplicate không cần thiết.
- [ ] Apply thất bại giữa chừng rollback toàn bộ transaction.
- [ ] Apply không xóa dữ liệu hiện có ngoài file.
- [ ] Sau Apply, màn Phòng ban/PLHĐ refresh và thấy dữ liệu mới.
- [ ] MASTER/Admin/PM Apply được; Member/Viewer bị chặn.
