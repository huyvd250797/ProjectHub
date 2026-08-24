# ASC WORKING — V0.9.1

**Master Account / Multi-Project Access** — bổ sung quyền quản trị toàn hệ thống trước Production Release.

ASC WORKING là **Project Workspace đa dự án**. EPU chỉ là một Project. Từ V0.9.1, tài khoản có `profiles.global_role = 'master'` tự động nhìn thấy và quản trị mọi Project hiện tại lẫn Project tạo trong tương lai, không cần thêm một dòng `project_members` cho từng Project.

## Đã hoàn thành
- ✅ V0.1.0 — Foundation
- ✅ V0.2.0 — Data Model + Import POC
- ✅ V0.3.0 — Dashboard / Real Project Data
- ✅ V0.4.0 — PLHĐ Unified View
- ✅ V0.5.0 — Department Intelligence
- ✅ V0.6.0 — ISSUE Core
- ✅ V0.7.0 — ISSUE Productivity
- ✅ V0.8.0 — Remote Server Security
- ✅ V0.9.0 — Hardening + UAT
- ✅ **V0.9.1 — Master Account / Multi-Project Access**

## V0.9.1 có gì mới?
- `profiles.global_role`: `user | master`.
- Helper RLS `public.is_master()`.
- `is_project_member()` và `has_project_role()` tự hiểu MASTER.
- MASTER nhìn thấy **tất cả Project** trong Project Switcher.
- MASTER được map thành effective project role `admin` trong ISSUE và Resource Vault APIs.
- MASTER có quyền Reveal/Copy credential, CRUD nghiệp vụ và quản trị thành viên theo security rules hiện tại.
- User thường vẫn bị giới hạn bằng `project_members` với role `admin / pm / member / viewer`.
- **Master Project Console** tại `/settings/projects`:
  - tạo Project mới;
  - xem toàn bộ Project;
  - chuyển `active / paused / completed / archived`;
  - xem số thành viên;
  - thêm/cập nhật/xóa project member theo email và role.
- MASTER không cần tự thêm mình vào `project_members`.
- Nếu hệ thống chưa có Project nào, MASTER có thể bootstrap Project đầu tiên ngay tại màn hình No Project.
- Hardening/UAT Readiness nhận diện MASTER và kiểm tra Multi-Project Access.
- Có trigger chống user thường tự nâng `global_role` lên `master` qua profile self-update.

## Bắt buộc khi nâng từ V0.9.0

### 1. Chạy migration V0.9.1
Supabase → SQL Editor:

```text
supabase/migrations/202608240003_v091_master_multi_project.sql
```

### 2. Promote tài khoản chính thành MASTER
Chạy:

```text
supabase/promote-master.sql
```

File mẫu hiện dùng email:

```text
huywork257@gmail.com
```

Nếu dùng email khác, sửa email trong file trước khi chạy.

Kết quả mong muốn:

```text
global_role = master
is_active   = true
```

### 3. Reload / đăng nhập lại
Sau khi promote, reload ASC WORKING. Project Switcher của MASTER sẽ tự hiển thị toàn bộ Project mà không cần thêm `project_members`.

## Mô hình quyền V0.9.1

```text
ASC WORKING
│
├── MASTER (global)
│   ├── Project A
│   ├── Project B
│   ├── Project C
│   └── mọi Project tạo sau này
│
└── USER thường
    └── project_members
        ├── admin
        ├── pm
        ├── member
        └── viewer
```

## Environment Variables
Giữ nguyên các biến V0.9.0:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
```

Không commit `.env.local`, Service Role hoặc APP_ENCRYPTION_KEY.

## Kiểm tra trước deploy

```bash
npm install
npm run preflight
npm run typecheck
npm run lint
npm run build
```

Hoặc:

```bash
npm run check
```

## Deploy Vercel
- Framework Preset: **Next.js**
- Build Command: Default (`npm run build`)
- Output Directory: **Default / để trống**
- Sau khi thêm/chỉnh Environment Variables phải Redeploy.

## Security notes
- `master` là quyền toàn cục, chỉ nên cấp cho tài khoản quản trị hệ thống tin cậy.
- Không tạo `project_members` cho MASTER chỉ để nhìn thấy Project; quyền global đã bao phủ toàn bộ.
- User thường không thể tự thay `global_role` nhờ trigger `guard_profile_global_role_trigger`.
- Remote secret vẫn dùng AES-256-GCM server-only và audit như V0.8.0.
- Không đổi `APP_ENCRYPTION_KEY` tùy ý sau khi đã lưu credential thật.

## Tiếp theo
**V1.0.0 — Production Release**: freeze schema/scope, cut-over dữ liệu thật, role/user cuối cùng, smoke test, release note và runbook vận hành.

© 2026 HuyVo. All rights reserved.
