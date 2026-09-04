-- ASC WORKING V2.2.0 — PLHĐ Function Tree & Project Delete
-- Chuẩn hóa cấu trúc PLHĐ:
-- contract_items: Nhóm / Phân hệ / Module
-- contract_detail_items: Chức năng nằm dưới Module

update public.contract_detail_items
set node_type = 'function',
    updated_at = now()
where node_type is null
   or lower(btrim(node_type)) in ('', 'other', 'khac', 'chuc nang', 'chucnang', 'function');

create index if not exists contract_detail_project_function_idx
  on public.contract_detail_items(project_id, contract_item_id, parent_id, sort_order);

comment on column public.contract_detail_items.node_type is
  'V2.2.0: PLHD detail rows are displayed as Chuc nang/function under Module in the single PLHD tree.';

comment on schema public is
  'ASC WORKING schema through V2.2.0 PLHD Function Tree and MASTER project hard delete via existing FK cascade.';
