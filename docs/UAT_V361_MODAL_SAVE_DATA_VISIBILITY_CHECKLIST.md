# UAT V3.6.1 - Modal Save & Data Visibility

## ISSUE

- Mở ISSUE, bấm **Thêm ISSUE**.
- Nhập nội dung, trạng thái, ưu tiên, module/phòng ban/người phụ trách nếu có.
- Bấm **Tạo ISSUE**.
- Kỳ vọng: drawer đóng, URL không còn `issueId`, lưới ISSUE reload và thấy ISSUE mới theo bộ lọc phù hợp.
- Mở một ISSUE có sẵn, sửa `ASC phản hồi`, `Ghi chú`, `Due Date` hoặc `Jira`.
- Bấm **Lưu thay đổi**.
- Kỳ vọng: drawer đóng, lưới reload, các cột tương ứng hiển thị nội dung vừa sửa.

## Các Modal Chính Khác

- Plan: lưu Master Plan/Stage/Milestone/Task/Reminder/Checklist xong modal đóng và dữ liệu reload.
- Finance: lưu tháng tài chính xong modal đóng và dòng tháng hiển thị forecast/actual/revenue/cost/notes.
- Document: thêm/sửa/sao chép tài liệu xong modal đóng, lưới hiển thị tiêu đề, loại, liên kết nghiệp vụ, mô tả nếu có; link Drive không hiển thị trực tiếp.
- Resource: thêm/sửa tài nguyên xong drawer đóng, lưới hiển thị tên, loại, môi trường, URL/Host, username, credential status.
- Navbar: lưu cấu hình xong modal đóng, navbar hiển thị tên đã đổi.

## Regression

- Chạy preflight: `node scripts/uat-preflight.mjs`.
- Không cần chạy migration mới.

