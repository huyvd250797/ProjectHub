# UAT V1.5.0 — ISSUE Personalization & Workspace Layout

## Chuẩn bị

- [ ] Đã chạy `202608270002_v150_issue_workspace_personalization.sql` sau migration V1.4.0.
- [ ] Có ít nhất hai Project và tài khoản có quyền truy cập.
- [ ] ISSUE có dữ liệu cho Trạng thái, Trạng thái KH, Ưu tiên và Phụ trách.

## Màu tag

- [ ] Mở ISSUE → Màu tag; chỉnh riêng màu viền, nền, chữ cho từng nhóm.
- [ ] Preview khớp màu hiển thị trên lưới.
- [ ] Refresh trang: màu vẫn được giữ.
- [ ] Chuyển Project: cấu hình màu độc lập.
- [ ] Khôi phục từng tag và cả nhóm hoạt động.

## Cột và bộ lọc

- [ ] Kéo tiêu đề cột sang vị trí mới; lưới đổi ngay.
- [ ] Refresh trang: thứ tự cột vẫn được giữ.
- [ ] Cửa sổ Cột phản ánh đúng thứ tự đã kéo.
- [ ] Bộ lọc hiển thị mặc định với tài khoản chưa có preference.
- [ ] Ẩn lọc không xóa các điều kiện lọc đang áp dụng.
- [ ] Hiện lọc và refresh trang giữ đúng preference.

## Navbar trái

- [ ] Mở nút sắp xếp tại tiêu đề Project Workspace.
- [ ] Kéo-thả và dùng mũi tên đều đổi được thứ tự module.
- [ ] Lưu, refresh và chuyển Project: thứ tự vẫn được giữ.
- [ ] Khôi phục mặc định đưa đủ chín module về thứ tự chuẩn.
- [ ] Tài khoản khác có thứ tự navbar độc lập.

## Regression

- [ ] CRUD/Bulk/Saved View/Export ISSUE vẫn hoạt động.
- [ ] Project Documents/Google Drive V1.4.0 vẫn hoạt động.
- [ ] Desktop collapsed sidebar và mobile sidebar hiển thị đúng.
- [ ] Readiness có check `ISSUE & Workspace personalization` đạt Pass.
