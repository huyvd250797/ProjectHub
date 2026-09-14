# UAT V3.7.1 - Search, Modal & Deadline Fix Checklist

## Global Search

- Nhập dưới 2 ký tự: không gọi gợi ý.
- Nhập nội dung rồi dừng 1 giây: dropdown hiển thị kết quả gần đúng.
- Search Jira code như `HIUCR1-626`: gợi ý ISSUE và click mở `/issues?search=HIUCR1-626`.
- Kết quả search có nhãn module, title, subtitle và không làm reload khi đang gõ liên tục.

## ISSUE

- Nhập vào ô search ISSUE: lưới chưa reload.
- Nhấn Enter: URL cập nhật `search=...` và lưới ISSUE load theo điều kiện.
- Nút xóa lọc vẫn xóa được search và các filter liên quan.

## Dashboard

- Project chưa Completed và đã quá `due_date`: hiển thị cảnh báo trễ số ngày.
- Project Completed có `completed_date` sau `due_date`: hiển thị hoàn thành trễ số ngày.
- Project Completed đúng hạn hoặc sớm hơn: hiển thị hoàn thành đúng hạn.

## Master Console

- Chuyển trạng thái nhanh sang Completed: bắt buộc nhập ngày hoàn thành.
- Sửa hồ sơ Project với trạng thái Completed: field Ngày hoàn thành là bắt buộc.
- Export Master Projects có cột Ngày hoàn thành.

## Plan Modal

- Bấm Chỉnh Master Plan: modal nằm giữa màn hình, không tuột xuống.
- Nội dung dài scroll trong modal, nền ngoài không scroll.
