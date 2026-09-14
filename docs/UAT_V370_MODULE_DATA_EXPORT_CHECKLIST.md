# UAT V3.7.0 - Module Data Export Checklist

## Kiểm tra chung

- Mở từng module có nút Export.
- Chọn một vài filter/search nếu màn có filter.
- Bấm Export.
- Mở file CSV bằng Excel và kiểm tra tiếng Việt hiển thị đúng.
- Kiểm tra dòng xuất ra khớp dữ liệu đang hiển thị.

## Checklist module

| Module | Kỳ vọng |
| --- | --- |
| Dashboard | CSV có Project Overview, Issue KPI, Stages, Departments, Members |
| Finance | CSV có đầy đủ tháng tài chính và các cột forecast/actual/revenue/cost/profit |
| PLHĐ / Contract | CSV giữ được cấp cây và loại Nhóm/Phân hệ/Module/Chức năng |
| Department | CSV đổi theo search/filter/sort hiện tại |
| Workload | CSV có nhân sự, allocation, planned/available/overload hours |
| Workload Modal | Bấm tên nhân sự, export danh sách ISSUE của nhân sự đó |
| Allocation | CSV có Unassigned Work Queue và Weekly Assignment Board |
| Document | CSV không lộ link dài trên lưới; export metadata tài liệu |
| Resource Vault | CSV không có secret/password |
| Command Center | CSV có Action Board, Risk Radar, Stages, Milestones |
| Portfolio | CSV có danh sách project và chỉ số portfolio |
| Master Console | CSV có danh sách project master |
| Activity | CSV có activity theo filter/trang hiện tại |
| Data Integrity | CSV có findings theo filter hiện tại |

## Không yêu cầu migration

Bản này chỉ bổ sung UI/helper export phía frontend, không thay đổi schema database.
