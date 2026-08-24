# ASC WORKING V0.9.0 — UAT Checklist

Chạy automated check tại `/settings/uat` trước, sau đó test thủ công.

## P0 — Blocker
- [ ] Login đúng/sai password hoạt động; loading không dừng giả.
- [ ] User không có project không nhìn thấy dữ liệu demo.
- [ ] Project Switcher đổi đúng toàn bộ dữ liệu.
- [ ] Viewer không sửa ISSUE và không Reveal/Copy secret.
- [ ] Member/PM/Admin đúng quyền.
- [ ] Secret không xuất hiện trong list API, URL, log hoặc export.
- [ ] CRUD ISSUE không mất history.
- [ ] Bulk update tạo history cho các ISSUE bị đổi.

## P1 — Core flows
- [ ] Dashboard KPI và drill-down đúng.
- [ ] PLHĐ overview/detail đúng project; 5K+ detail vẫn scroll mượt.
- [ ] Department KPI/drawer/drill-down đúng.
- [ ] ISSUE search/filter/pagination/inline edit/drawer đúng.
- [ ] Saved Views/Columns/Export đúng user + project.
- [ ] Resource CRUD/Reveal/Copy/auto-hide/audit đúng.

## P2 — UX/Responsive
- [ ] Loading/Error/Empty state rõ ràng.
- [ ] Desktop 1366px/1920px không vỡ layout.
- [ ] Laptop nhỏ và tablet dùng được các thao tác chính.
- [ ] Mobile tra cứu không tràn drawer/modal.
- [ ] Keyboard focus nhìn thấy rõ.

## Production gate
Chỉ lên V1.0.0 khi:
- Automated readiness không có FAIL.
- Không còn P0/P1 open bug.
- P2 chỉ còn lỗi cosmetic được chấp nhận.
- Migration/backup/rollback đã có runbook.
