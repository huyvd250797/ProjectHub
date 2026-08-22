# PLHĐ V0.4.0 — Supabase setup

## 1. Migration cần chạy
Trong Supabase SQL Editor, chạy theo thứ tự:

1. `202608220001_v020_core_schema.sql`
2. `202608220002_v030_dashboard_rpc.sql`
3. `202608220003_v040_contract_rpc.sql`

Nếu V0.2.0 và V0.3.0 đã chạy, chỉ cần chạy file thứ 3.

## 2. RPC mới
`public.get_project_contract(p_project_id uuid)`

RPC kiểm tra `is_project_member(project_id)` trước khi đọc dữ liệu và trả về:
- summary
- contract overview
- contract detail tree
- department filters
- module status filters

## 3. Khi project chưa có dữ liệu
Nếu Supabase đã cấu hình nhưng `contract_items` / `contract_detail_items` chưa có record, màn hình hiển thị trạng thái trống thật, không dùng mock EPU.

Demo data chỉ xuất hiện khi ứng dụng chưa cấu hình Supabase.

## 4. Performance
Chi tiết PLHĐ được lấy theo project qua RPC và render bằng virtual list ở browser. Với 5.000+ node, DOM chỉ giữ một cửa sổ nhỏ các dòng đang nhìn thấy thay vì render toàn bộ cùng lúc.
