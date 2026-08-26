# Executive Report V1.3.0 — Setup

1. Database phải có V1.2.0 Analytics RPC `get_project_analytics_v120`.
2. Chạy `supabase/migrations/202608260003_v130_executive_reports.sql`.
3. Deploy source V1.3.0.
4. Mở `Báo cáo` trong sidebar.

## Quyền

- MASTER/Admin/PM: xem + lưu/cập nhật snapshot/PM notes.
- Member/Viewer: xem report và drill-down, không lưu snapshot.

## Snapshot

Snapshot không copy toàn bộ ISSUE. Chỉ lưu bộ metric điều hành nhỏ để so sánh kỳ, kèm PM Comment và Kế hoạch tiếp theo.
