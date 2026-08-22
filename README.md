# ASC WORKING — V0.7.0

**ISSUE Productivity** — lớp tăng tốc thao tác ISSUE trên nền ISSUE Core V0.6.0.

ASC WORKING vẫn là **Project Workspace đa dự án**. EPU chỉ là project dữ liệu hiện tại; tất cả Dashboard, PLHĐ, Phòng ban và ISSUE đều chạy theo `project_id` đang chọn.

## Version đã hoàn thành

- ✅ V0.1.0 — Foundation / Deployable Skeleton
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data
- ✅ V0.4.0 — PLHĐ Unified View
- ✅ V0.5.0 — Department Intelligence
- ✅ V0.6.0 — ISSUE Core
- ✅ **V0.7.0 — ISSUE Productivity**

## V0.7.0 có gì mới?

### 1. Bulk Update
Chọn nhiều ISSUE bằng checkbox và cập nhật cùng lúc:
- Trạng thái
- Trạng thái khách hàng
- Ưu tiên
- Giai đoạn
- Module
- Phòng ban
- Người phụ trách
- Due Date

Mỗi UPDATE vẫn đi qua trigger `issue_history`, vì vậy lịch sử thay đổi của từng ISSUE được giữ nguyên.

### 2. Saved Views
Lưu bộ lọc hiện tại theo **user + project**. Ví dụ:
- Tôi phụ trách
- Quá hạn
- Chưa bàn giao
- Giai đoạn 2
- View nghiệp vụ riêng của từng người

Saved View lưu query filter, không snapshot dữ liệu.

### 3. Column Preferences
Mỗi user có thể cấu hình riêng:
- Ẩn / hiện cột
- Sắp thứ tự cột
- Điều chỉnh độ rộng
- Ghim cột
- 25 / 50 / 100 ISSUE mỗi trang

Cấu hình lưu theo `user_id + project_id`.

### 4. Quick Add
Nút **Thêm nhanh** cho phép nhập nội dung ISSUE, chọn ưu tiên và Enter để tạo mà không cần mở drawer đầy đủ.

### 5. Duplicate ISSUE
Chọn đúng 1 ISSUE → **Nhân bản**. Bản sao giữ context nghiệp vụ (Module, Phòng ban, assignee, priority, stage, due date) nhưng reset trạng thái về chờ xử lý/chưa bàn giao và không copy Jira/release.

### 6. Export CSV
Export toàn bộ ISSUE phù hợp **bộ lọc hiện tại** (tối đa 10.000 record/lần), chạy server-side và không export dữ liệu Remote Server/credential.

### 7. Grid productivity
- Checkbox chọn dòng
- Sticky/pinned columns
- Độ rộng cột theo preference
- Inline edit giữ nguyên từ V0.6.0
- Pagination theo page-size cá nhân
- URL filters/deep-link vẫn tương thích Dashboard, PLHĐ và Department Intelligence

## Supabase migration bắt buộc

Nếu database đã chạy đến V0.6.0, chạy thêm:

```text
supabase/migrations/202608220006_v070_issue_productivity.sql
```

Migration tạo:
- `issue_saved_views`
- `issue_user_preferences`
- RLS chỉ cho user sở hữu preference/view và phải là member của project

Không cần chạy lại migration V0.2 → V0.6 nếu đã có.

## Chạy local

```bash
npm install
npm run dev
```

## Kiểm tra trước deploy

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy Vercel

Giữ cấu hình Next.js mặc định:
- Framework Preset: Next.js
- Build Command: Default
- Output Directory: **Default / để trống**

Không đặt Output Directory là `out`.

## Version tiếp theo

**V0.8.0 — Remote Server Security**
- Vault tài nguyên project
- Credential encryption server-only
- Reveal / Copy theo role
- Audit log
- Rotate/migrate secret an toàn

© 2026 HuyVo. All rights reserved.
