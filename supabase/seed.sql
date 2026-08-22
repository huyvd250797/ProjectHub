-- Seed the FIRST project only. ASC-Working itself is a multi-project workspace.
insert into public.projects (id, code, slug, name, organization_name, status)
values (
  '00000000-0000-0000-0000-0000000000e1',
  'EPU',
  'epu',
  'Triển khai PMT-EMS',
  'Trường Đại học Điện lực',
  'active'
)
on conflict (id) do update set
  code = excluded.code,
  slug = excluded.slug,
  name = excluded.name,
  organization_name = excluded.organization_name;

insert into public.project_stages (project_id, code, name, sort_order)
values
  ('00000000-0000-0000-0000-0000000000e1','STAGE-01','Khởi động',1),
  ('00000000-0000-0000-0000-0000000000e1','STAGE-02','Khảo sát',2),
  ('00000000-0000-0000-0000-0000000000e1','STAGE-03','Cấu hình',3),
  ('00000000-0000-0000-0000-0000000000e1','STAGE-04','UAT / Training',4),
  ('00000000-0000-0000-0000-0000000000e1','STAGE-05','Nghiệm thu',5)
on conflict (project_id, code) do nothing;

insert into public.status_catalog (project_id, category, code, label, sort_order)
values
  (null,'issue_status','waiting_customer','Chờ khách hàng',1),
  (null,'issue_status','no_action','Không xử lý',2),
  (null,'issue_status','waiting','Chờ xử lý',3),
  (null,'issue_status','processing','Đang xử lý',4),
  (null,'issue_status','resolved','Đã xử lý',5),
  (null,'issue_status','released','Đã Release',6),
  (null,'issue_status','not_feasible','Không khả thi',7),
  (null,'customer_status','not_handed_over','Chưa bàn giao',1),
  (null,'customer_status','handed_over','Đã bàn giao',2),
  (null,'module_status','surveyed','Đã khảo sát',1),
  (null,'module_status','ready_training','Sẵn sàng tập huấn',2),
  (null,'module_status','trained','Đã tập huấn',3),
  (null,'module_status','ready_acceptance','Sẵn sàng nghiệm thu',4),
  (null,'module_status','accepted','Đã nghiệm thu',5),
  (null,'priority','A','A',1),
  (null,'priority','B','B',2),
  (null,'priority','C','C',3),
  (null,'priority','D','D',4)
on conflict do nothing;
