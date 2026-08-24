# ASC WORKING V0.9.4 — Grid UX UAT Checklist

## Searchable combobox

- [ ] Project Switcher mở ra có ô `Nhập để tìm kiếm...`.
- [ ] Gõ một phần tên Project lọc đúng.
- [ ] Bộ lọc ISSUE: Trạng thái / Ưu tiên / Phòng ban / Trạng thái KH / Giai đoạn / Module / Phụ trách đều tìm được bằng text.
- [ ] Inline combobox trên ISSUE có ô tìm kiếm.
- [ ] Issue Drawer: Module / Phòng ban / requester / assignee tìm kiếm được.
- [ ] PLHĐ, Phòng ban, Remote Server và Master Console sử dụng combobox mới.
- [ ] Gõ không dấu vẫn tìm được tiếng Việt có dấu, ví dụ `quan ly dao tao`.
- [ ] Nút X xóa query và trả lại toàn bộ option.
- [ ] Search không có kết quả hiển thị empty state rõ ràng.
- [ ] `Esc` đóng menu.
- [ ] ThemedSelect dùng Arrow Up/Down + Enter được sau khi search.

## Sticky ISSUE header

- [ ] Lưới ISSUE có vùng cuộn dọc riêng khi có nhiều record.
- [ ] Khi cuộn xuống, hàng header luôn ở trên cùng vùng lưới.
- [ ] Checkbox header không bị đè.
- [ ] Cột pin bên trái vẫn cố định khi cuộn ngang.
- [ ] Header của cột pin nằm trên body cell đúng z-index.
- [ ] Dropdown inline vẫn nổi trên sticky header.
- [ ] Pagination phía dưới hoạt động bình thường.

## Regression

- [ ] Inline edit ISSUE vẫn lưu đúng.
- [ ] Bulk update vẫn hoạt động.
- [ ] Saved Views vẫn hoạt động.
- [ ] Project Switcher vẫn chuyển Project đúng.
- [ ] Không có thay đổi database/migration cần chạy.
