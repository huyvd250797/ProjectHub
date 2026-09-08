# UAT Checklist — V3.4.0 Performance

| Khu vực | Kiểm tra | Kết quả mong đợi |
| --- | --- | --- |
| ISSUE | 1.000+ dòng, chuyển trang/lọc | Response chỉ trả page hiện tại, thao tác không đơ |
| ISSUE | Chọn ALL có cảnh báo tải lớn | Không crash trình duyệt; dữ liệu vẫn đúng |
| PLHĐ | Cây nhiều Function | Expand/collapse nhanh, dòng ngoài viewport giảm paint |
| PLHĐ | Nội dung dài | Vẫn hiển thị đủ, không bị cắt bởi virtualization |
| Workload | Nhiều nhân sự/ISSUE | Cache chống gọi lặp, lọc client mượt |
| Allocation | Nhiều task theo tuần | Đổi tuần/reload nhanh, assignment vẫn chính xác |
| API | Gọi lại cùng Project trong TTL | Dùng cache private ngắn hạn, không lộ dữ liệu khác Project |
| Regression | Ghi/sửa/xóa rồi reload | Cache bị invalidate, màn ngoài hiển thị dữ liệu mới |
| Database | Chạy migration index | Chỉ tạo index, không thay đổi bản ghi |

