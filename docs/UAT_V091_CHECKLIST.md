# ASC WORKING V0.9.1 — UAT Checklist

## Master / Multi-Project
- [ ] Tài khoản MASTER đăng nhập thành công mà không cần project_members.
- [ ] MASTER nhìn thấy mọi Project hiện tại trong Project Switcher.
- [ ] Tạo Project mới trong Master Project Console.
- [ ] Project mới tự xuất hiện cho MASTER sau refresh.
- [ ] User thường không thấy Project mới nếu chưa được gán membership.
- [ ] Gán user vào Project bằng email + role và kiểm tra quyền đúng.
- [ ] Gỡ user khỏi Project và xác nhận Project biến mất khỏi Project Switcher của user đó.
- [ ] User thường không thể tự nâng global_role thành master.

## Regression bắt buộc
- [ ] Dashboard đọc đúng dữ liệu theo Project đang chọn.
- [ ] PLHĐ đổi theo Project và drill-down đúng.
- [ ] Department Intelligence đổi theo Project.
- [ ] ISSUE CRUD / Productivity / Saved Views hoạt động.
- [ ] Remote Resource Vault hoạt động, Reveal/Copy đúng quyền.
- [ ] MASTER có effective Admin trong ISSUE và Remote Resource.
- [ ] Admin/PM/Member/Viewer user thường không bị thay đổi quyền ngoài Project.
- [ ] Hardening & UAT Center không có FAIL trước Production.
