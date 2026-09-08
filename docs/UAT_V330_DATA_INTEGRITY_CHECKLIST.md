# UAT Checklist — V3.3.0 Data Integrity

| Nhóm | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| Catalog | Module thiếu parent hoặc phòng ban inactive | Finding hiển thị đúng entity và link về PLHĐ |
| ISSUE | ISSUE trỏ Module/Phòng ban không còn active | Finding cảnh báo, không tự sửa dữ liệu |
| Plan | Stage có ngày bắt đầu sau ngày kết thúc | Finding Critical và readiness chuyển Blocked |
| Plan | Task/Milestone nằm ngoài khoảng Stage | Finding chỉ rõ Stage và hướng dẫn sửa |
| Finance | Trùng tháng hoặc revenue vượt hợp đồng | Finding Finance xuất hiện, số liệu gốc không bị thay đổi |
| Workload | Nhân sự thiếu capacity hoặc owner inactive | Finding Workload xuất hiện để sửa trước khi điều phối |
| Regression | Chạy audit nhiều lần | Kết quả ổn định, không tạo bản ghi mới |
| Security | User không thuộc Project | API trả 403, không lộ dữ liệu audit |

