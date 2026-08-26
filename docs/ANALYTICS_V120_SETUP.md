# Setup ASC WORKING V1.2.0 — Advanced Analytics & Project Health

Nếu database đã chạy tới V1.1.1, chạy thêm migration:

`supabase/migrations/202608260002_v120_analytics_health.sql`

Migration thực hiện:
1. Tạo RPC `get_project_analytics_v120`.
2. Bổ sung index cho ISSUE history/created_at.
3. Mở rộng `issue_user_preferences.page_size` thành 50 / 100 / 500 / 1000 / 0 (ALL).

Không cần Environment Variable mới.

Sau deploy:
- Mở **Analytics** trên sidebar.
- Chọn range 30/90/180/365/Toàn bộ.
- Kiểm tra Project Health Score và các bảng risk.
- Vào ISSUE → Cột hoặc footer → chọn số dòng.
