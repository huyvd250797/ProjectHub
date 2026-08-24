# ASC WORKING V0.9.2 — Excel Import Production

## 1. Migration bắt buộc
Run in Supabase SQL Editor after V0.9.1:

`supabase/migrations/202608240004_v092_excel_import_production.sql`

Migration adds stable `import_key` columns plus:
- `preview_import_v092(project_id, payload)`
- `apply_import_v092(project_id, payload, mode, file_name, source_hash)`

## 2. Luồng sử dụng
1. Chọn Project trên Project Switcher.
2. Vào **Thiết lập → Excel Import Production**.
3. Bấm **Tải mẫu Excel V0.9.2**.
4. Điền dữ liệu, giữ nguyên tên sheet/cột và `__META`.
5. Upload lại file.
6. Bấm **Kiểm tra dữ liệu / Preview**.
7. Sửa mọi lỗi validation.
8. Chọn mode:
   - **Merge**: key cũ cập nhật, key mới thêm mới.
   - **Insert Only**: key cũ bỏ qua, chỉ thêm key mới.
9. Nhập mã Project để xác nhận.
10. Bấm **Apply Import**.

## 3. Quy tắc key
Mỗi entity cần `key` ổn định và duy nhất trong sheet. Không dùng số dòng Excel làm key.

Ví dụ:
- Department: `DEPT-DT`
- Person: `ASC-HUY`, `CUS-LAN`
- Contract Module: `MOD-DKHP`
- Contract Detail: `DETAIL-DKHP-001`
- Issue: `ISSUE-001` hoặc key nghiệp vụ ổn định
- Resource: `RES-SQL-PROD`

Các cột liên kết dùng key của sheet khác:
- `department_key` → PHÒNG BAN.key
- `module_key` → PLHĐ.key
- `requester_key`, `assignee_key` → NHÂN SỰ.key
- `contract_item_key` → PLHĐ.key
- `parent_key` → key cùng sheet

## 4. Transaction
`apply_import_v092` chạy trong một PostgreSQL transaction. Nếu một bước insert/update lỗi, toàn bộ batch bị rollback.

## 5. Quyền
- MASTER: Apply tất cả Project.
- Admin/PM: Apply Project được phân quyền.
- Member/Viewer: tải template + Dry-run, không Apply.

## 6. Resource Security
Excel chỉ import metadata:
- name
- type/environment
- URL/host
- remote address
- username
- notes
- sensitive flag

Không có password/token/secret. Credential phải nhập tại Resource Vault để dùng AES-256-GCM.

Nếu resource đã có encrypted secret và bạn Merge metadata từ Excel, secret hiện tại được giữ nguyên.

## 7. Legacy workbook
Workbook kiểu cũ `[EPU] _ ASC-Working.xlsx` vẫn Dry-run được để đối chiếu dữ liệu, nhưng Apply Import bị khóa. Muốn ghi production phải dùng Template V0.9.2.
