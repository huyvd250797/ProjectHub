-- ASC WORKING V0.9.2 — Excel Import Production / Template Round-trip
-- Run after V0.9.1. Adds stable import keys + transactional preview/apply RPCs.

alter table public.project_stages add column if not exists import_key text;
alter table public.departments add column if not exists import_key text;
alter table public.people add column if not exists import_key text;
alter table public.contract_items add column if not exists import_key text;
alter table public.contract_detail_items add column if not exists import_key text;
alter table public.release_versions add column if not exists import_key text;
alter table public.issues add column if not exists import_key text;
alter table public.remote_resources add column if not exists import_key text;

create unique index if not exists project_stages_import_key_uq on public.project_stages(project_id, import_key) where import_key is not null;
create unique index if not exists departments_import_key_uq on public.departments(project_id, import_key) where import_key is not null;
create unique index if not exists people_import_key_uq on public.people(project_id, import_key) where import_key is not null;
create unique index if not exists contract_items_import_key_uq on public.contract_items(project_id, import_key) where import_key is not null;
create unique index if not exists contract_details_import_key_uq on public.contract_detail_items(project_id, import_key) where import_key is not null;
create unique index if not exists release_versions_import_key_uq on public.release_versions(project_id, import_key) where import_key is not null;
create unique index if not exists issues_import_key_uq on public.issues(project_id, import_key) where import_key is not null;
create unique index if not exists remote_resources_import_key_uq on public.remote_resources(project_id, import_key) where import_key is not null;

create or replace function public.preview_import_v092(
  p_project_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_incoming integer;
  v_update integer;
  v_result jsonb := '{}'::jsonb;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Access denied for Project';
  end if;

  if coalesce(p_payload->>'projectId', '') <> p_project_id::text then
    raise exception 'Import payload Project mismatch';
  end if;

  v_incoming := jsonb_array_length(coalesce(p_payload->'departments', '[]'::jsonb));
  select count(*) into v_update
  from jsonb_array_elements(coalesce(p_payload->'departments', '[]'::jsonb)) e
  where exists (select 1 from public.departments t where t.project_id = p_project_id and t.import_key = e->>'importKey');
  v_result := v_result || jsonb_build_object('departments', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'people', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'people', '[]'::jsonb)) e
  where exists (select 1 from public.people t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('people', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'stages', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'stages', '[]'::jsonb)) e
  where exists (select 1 from public.project_stages t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('stages', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'contractItems', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'contractItems', '[]'::jsonb)) e
  where exists (select 1 from public.contract_items t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('contractItems', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'contractDetails', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'contractDetails', '[]'::jsonb)) e
  where exists (select 1 from public.contract_detail_items t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('contractDetails', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'releaseVersions', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'releaseVersions', '[]'::jsonb)) e
  where exists (select 1 from public.release_versions t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('releaseVersions', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'issues', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'issues', '[]'::jsonb)) e
  where exists (select 1 from public.issues t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('issues', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'remoteResources', '[]'::jsonb));
  select count(*) into v_update from jsonb_array_elements(coalesce(p_payload->'remoteResources', '[]'::jsonb)) e
  where exists (select 1 from public.remote_resources t where t.project_id=p_project_id and t.import_key=e->>'importKey');
  v_result := v_result || jsonb_build_object('remoteResources', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  return v_result;
end;
$$;

create or replace function public.apply_import_v092(
  p_project_id uuid,
  p_payload jsonb,
  p_mode text,
  p_file_name text,
  p_source_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preview jsonb;
  v_batch_id uuid;
  v_existing_contract_keys text[] := array[]::text[];
  v_existing_detail_keys text[] := array[]::text[];
begin
  if p_mode not in ('merge','insert_only') then
    raise exception 'Unsupported import mode';
  end if;
  if not public.has_project_role(p_project_id, array['admin','pm']) then
    raise exception 'Only MASTER, Admin or PM can Apply Import';
  end if;
  if coalesce(p_payload->>'projectId','') <> p_project_id::text then
    raise exception 'Import payload Project mismatch';
  end if;
  if coalesce(p_payload->>'templateVersion','') <> '0.9.2' then
    raise exception 'Unsupported import template version';
  end if;

  v_preview := public.preview_import_v092(p_project_id, p_payload);

  -- Adopt canonical keys for obvious existing records so the first V0.9.2 merge
  -- can coexist with data created before import_key existed.
  update public.project_stages t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'stages','[]'::jsonb)) as x("importKey" text, code text)
  where t.project_id=p_project_id and t.import_key is null and lower(t.code)=lower(x.code);

  update public.departments t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'departments','[]'::jsonb)) as x("importKey" text, "normalizedName" text)
  where t.project_id=p_project_id and t.import_key is null and t.normalized_name=x."normalizedName";

  update public.people t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'people','[]'::jsonb)) as x("importKey" text, "personType" text, "fullName" text, email text)
  where t.project_id=p_project_id and t.import_key is null
    and t.person_type=x."personType"
    and lower(t.full_name)=lower(x."fullName")
    and (x.email is null or x.email='' or lower(coalesce(t.email,''))=lower(x.email));

  update public.contract_items t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'contractItems','[]'::jsonb)) as x("importKey" text, code text, name text, "itemType" text)
  where t.project_id=p_project_id and t.import_key is null
    and t.item_type=x."itemType"
    and ((x.code is not null and x.code<>'' and lower(coalesce(t.code,''))=lower(x.code)) or lower(t.name)=lower(x.name));

  update public.release_versions t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'releaseVersions','[]'::jsonb)) as x("importKey" text, "releaseDate" date)
  where t.project_id=p_project_id and t.import_key is null and t.release_date=x."releaseDate";

  update public.issues t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'issues','[]'::jsonb)) as x("importKey" text, "jiraUrl" text)
  where t.project_id=p_project_id and t.import_key is null
    and x."jiraUrl" is not null and x."jiraUrl"<>'' and lower(coalesce(t.jira_url,''))=lower(x."jiraUrl");

  update public.remote_resources t
  set import_key = x."importKey"
  from jsonb_to_recordset(coalesce(p_payload->'remoteResources','[]'::jsonb)) as x("importKey" text, name text, "resourceType" text, environment text)
  where t.project_id=p_project_id and t.import_key is null
    and lower(t.name)=lower(x.name)
    and lower(t.resource_type)=lower(x."resourceType")
    and lower(coalesce(t.environment,''))=lower(coalesce(x.environment,''));

  select coalesce(array_agg(t.import_key), array[]::text[])
  into v_existing_contract_keys
  from public.contract_items t
  where t.project_id=p_project_id
    and t.import_key in (select e->>'importKey' from jsonb_array_elements(coalesce(p_payload->'contractItems','[]'::jsonb)) e);

  select coalesce(array_agg(t.import_key), array[]::text[])
  into v_existing_detail_keys
  from public.contract_detail_items t
  where t.project_id=p_project_id
    and t.import_key in (select e->>'importKey' from jsonb_array_elements(coalesce(p_payload->'contractDetails','[]'::jsonb)) e);

  if p_mode = 'merge' and p_payload->'project' is not null then
    update public.projects p
    set
      name = coalesce(nullif(p_payload->'project'->>'name',''), p.name),
      organization_name = nullif(p_payload->'project'->>'organizationName',''),
      contract_no = nullif(p_payload->'project'->>'contractNo',''),
      contract_value = nullif(p_payload->'project'->>'contractValue','')::numeric,
      contract_date = nullif(p_payload->'project'->>'contractDate','')::date,
      start_date = nullif(p_payload->'project'->>'startDate','')::date,
      due_date = nullif(p_payload->'project'->>'dueDate','')::date,
      status = coalesce(nullif(p_payload->'project'->>'status',''), p.status)
    where p.id=p_project_id;
  end if;

  -- Departments
  if p_mode='merge' then
    insert into public.departments(project_id, import_key, code, name, normalized_name)
    select p_project_id, x."importKey", nullif(x.code,''), x.name, x."normalizedName"
    from jsonb_to_recordset(coalesce(p_payload->'departments','[]'::jsonb)) as x("importKey" text, code text, name text, "normalizedName" text)
    on conflict (project_id, import_key) where import_key is not null do update set
      code=excluded.code, name=excluded.name, normalized_name=excluded.normalized_name, is_active=true;
  else
    insert into public.departments(project_id, import_key, code, name, normalized_name)
    select p_project_id, x."importKey", nullif(x.code,''), x.name, x."normalizedName"
    from jsonb_to_recordset(coalesce(p_payload->'departments','[]'::jsonb)) as x("importKey" text, code text, name text, "normalizedName" text)
    on conflict do nothing;
  end if;

  -- Project stages
  if p_mode='merge' then
    insert into public.project_stages(project_id, import_key, code, name, start_date, end_date, status, sort_order)
    select p_project_id, x."importKey", x.code, x.name, x."startDate", x."endDate", nullif(x.status,''), coalesce(x."sortOrder",0)
    from jsonb_to_recordset(coalesce(p_payload->'stages','[]'::jsonb)) as x("importKey" text, code text, name text, "startDate" date, "endDate" date, status text, "sortOrder" int)
    on conflict (project_id, import_key) where import_key is not null do update set
      code=excluded.code, name=excluded.name, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, sort_order=excluded.sort_order;
  else
    insert into public.project_stages(project_id, import_key, code, name, start_date, end_date, status, sort_order)
    select p_project_id, x."importKey", x.code, x.name, x."startDate", x."endDate", nullif(x.status,''), coalesce(x."sortOrder",0)
    from jsonb_to_recordset(coalesce(p_payload->'stages','[]'::jsonb)) as x("importKey" text, code text, name text, "startDate" date, "endDate" date, status text, "sortOrder" int)
    on conflict do nothing;
  end if;

  -- People
  if p_mode='merge' then
    insert into public.people(project_id, import_key, department_id, person_type, full_name, title, project_role, email, zalo, module_notes)
    select p_project_id, x."importKey",
      (select d.id from public.departments d where d.project_id=p_project_id and d.import_key=x."departmentKey" limit 1),
      x."personType", x."fullName", nullif(x.title,''), nullif(x."projectRole",''), nullif(x.email,''), nullif(x.zalo,''), nullif(x."moduleNotes",'')
    from jsonb_to_recordset(coalesce(p_payload->'people','[]'::jsonb)) as x("importKey" text, "departmentKey" text, "personType" text, "fullName" text, title text, "projectRole" text, email text, zalo text, "moduleNotes" text)
    on conflict (project_id, import_key) where import_key is not null do update set
      department_id=excluded.department_id, person_type=excluded.person_type, full_name=excluded.full_name,
      title=excluded.title, project_role=excluded.project_role, email=excluded.email, zalo=excluded.zalo, module_notes=excluded.module_notes;
  else
    insert into public.people(project_id, import_key, department_id, person_type, full_name, title, project_role, email, zalo, module_notes)
    select p_project_id, x."importKey",
      (select d.id from public.departments d where d.project_id=p_project_id and d.import_key=x."departmentKey" limit 1),
      x."personType", x."fullName", nullif(x.title,''), nullif(x."projectRole",''), nullif(x.email,''), nullif(x.zalo,''), nullif(x."moduleNotes",'')
    from jsonb_to_recordset(coalesce(p_payload->'people','[]'::jsonb)) as x("importKey" text, "departmentKey" text, "personType" text, "fullName" text, title text, "projectRole" text, email text, zalo text, "moduleNotes" text)
    on conflict do nothing;
  end if;

  -- Contract overview: upsert first, then resolve parent links.
  if p_mode='merge' then
    insert into public.contract_items(project_id, import_key, code, name, item_type, owner_department_id, module_status_code, classification, sort_order)
    select p_project_id, x."importKey", nullif(x.code,''), x.name, x."itemType",
      (select d.id from public.departments d where d.project_id=p_project_id and d.import_key=x."departmentKey" limit 1),
      nullif(x."moduleStatusCode",''), nullif(x.classification,''), coalesce(x."sortOrder",0)
    from jsonb_to_recordset(coalesce(p_payload->'contractItems','[]'::jsonb)) as x("importKey" text, "parentKey" text, code text, name text, "itemType" text, "departmentKey" text, "moduleStatusCode" text, classification text, "sortOrder" int)
    on conflict (project_id, import_key) where import_key is not null do update set
      code=excluded.code, name=excluded.name, item_type=excluded.item_type, owner_department_id=excluded.owner_department_id,
      module_status_code=excluded.module_status_code, classification=excluded.classification, sort_order=excluded.sort_order;
  else
    insert into public.contract_items(project_id, import_key, code, name, item_type, owner_department_id, module_status_code, classification, sort_order)
    select p_project_id, x."importKey", nullif(x.code,''), x.name, x."itemType",
      (select d.id from public.departments d where d.project_id=p_project_id and d.import_key=x."departmentKey" limit 1),
      nullif(x."moduleStatusCode",''), nullif(x.classification,''), coalesce(x."sortOrder",0)
    from jsonb_to_recordset(coalesce(p_payload->'contractItems','[]'::jsonb)) as x("importKey" text, "parentKey" text, code text, name text, "itemType" text, "departmentKey" text, "moduleStatusCode" text, classification text, "sortOrder" int)
    on conflict do nothing;
  end if;

  update public.contract_items c
  set parent_id=(select p.id from public.contract_items p where p.project_id=p_project_id and p.import_key=x."parentKey" limit 1)
  from jsonb_to_recordset(coalesce(p_payload->'contractItems','[]'::jsonb)) as x("importKey" text, "parentKey" text)
  where c.project_id=p_project_id and c.import_key=x."importKey"
    and (p_mode='merge' or not (c.import_key = any(v_existing_contract_keys)));

  -- Contract detail
  if p_mode='merge' then
    insert into public.contract_detail_items(project_id, import_key, contract_item_id, code, content, node_type, level, sort_order, note)
    select p_project_id, x."importKey",
      (select c.id from public.contract_items c where c.project_id=p_project_id and c.import_key=x."contractItemKey" limit 1),
      nullif(x.code,''), x.content, nullif(x."nodeType",''), coalesce(x.level,0), coalesce(x."sortOrder",0), nullif(x.note,'')
    from jsonb_to_recordset(coalesce(p_payload->'contractDetails','[]'::jsonb)) as x("importKey" text, "parentKey" text, "contractItemKey" text, code text, content text, "nodeType" text, level int, "sortOrder" int, note text)
    on conflict (project_id, import_key) where import_key is not null do update set
      contract_item_id=excluded.contract_item_id, code=excluded.code, content=excluded.content, node_type=excluded.node_type,
      level=excluded.level, sort_order=excluded.sort_order, note=excluded.note;
  else
    insert into public.contract_detail_items(project_id, import_key, contract_item_id, code, content, node_type, level, sort_order, note)
    select p_project_id, x."importKey",
      (select c.id from public.contract_items c where c.project_id=p_project_id and c.import_key=x."contractItemKey" limit 1),
      nullif(x.code,''), x.content, nullif(x."nodeType",''), coalesce(x.level,0), coalesce(x."sortOrder",0), nullif(x.note,'')
    from jsonb_to_recordset(coalesce(p_payload->'contractDetails','[]'::jsonb)) as x("importKey" text, "parentKey" text, "contractItemKey" text, code text, content text, "nodeType" text, level int, "sortOrder" int, note text)
    on conflict do nothing;
  end if;

  update public.contract_detail_items c
  set parent_id=(select p.id from public.contract_detail_items p where p.project_id=p_project_id and p.import_key=x."parentKey" limit 1)
  from jsonb_to_recordset(coalesce(p_payload->'contractDetails','[]'::jsonb)) as x("importKey" text, "parentKey" text)
  where c.project_id=p_project_id and c.import_key=x."importKey"
    and (p_mode='merge' or not (c.import_key = any(v_existing_detail_keys)));

  -- Release versions
  if p_mode='merge' then
    insert into public.release_versions(project_id, import_key, sequence_no, release_date, label)
    select p_project_id, x."importKey", x."sequenceNo", x."releaseDate", nullif(x.label,'')
    from jsonb_to_recordset(coalesce(p_payload->'releaseVersions','[]'::jsonb)) as x("importKey" text, "sequenceNo" int, "releaseDate" date, label text)
    on conflict (project_id, import_key) where import_key is not null do update set
      sequence_no=excluded.sequence_no, release_date=excluded.release_date, label=excluded.label;
  else
    insert into public.release_versions(project_id, import_key, sequence_no, release_date, label)
    select p_project_id, x."importKey", x."sequenceNo", x."releaseDate", nullif(x.label,'')
    from jsonb_to_recordset(coalesce(p_payload->'releaseVersions','[]'::jsonb)) as x("importKey" text, "sequenceNo" int, "releaseDate" date, label text)
    on conflict do nothing;
  end if;

  -- Issues. Trigger still generates issue_no and issue_history.
  if p_mode='merge' then
    insert into public.issues(project_id, import_key, content, status_code, customer_status_code, priority_code, stage_code, jira_url, release_date, due_date,
      module_id, module_name_raw, response, department_id, department_name_raw, requester_person_id, requester_name_raw, assignee_person_id, assignee_name_raw, notes)
    select p_project_id, x."importKey", x.content, nullif(x."statusCode",''), nullif(x."customerStatusCode",''), nullif(x."priorityCode",''), nullif(x."stageCode",''), nullif(x."jiraUrl",''), x."releaseDate", x."dueDate",
      (select c.id from public.contract_items c where c.project_id=p_project_id and c.import_key=x."moduleKey" limit 1), x."moduleKey", nullif(x.response,''),
      (select d.id from public.departments d where d.project_id=p_project_id and d.import_key=x."departmentKey" limit 1), x."departmentKey",
      (select pe.id from public.people pe where pe.project_id=p_project_id and pe.import_key=x."requesterKey" limit 1), x."requesterKey",
      (select pe.id from public.people pe where pe.project_id=p_project_id and pe.import_key=x."assigneeKey" limit 1), x."assigneeKey", nullif(x.notes,'')
    from jsonb_to_recordset(coalesce(p_payload->'issues','[]'::jsonb)) as x("importKey" text, content text, "statusCode" text, "customerStatusCode" text, "priorityCode" text, "stageCode" text, "jiraUrl" text, "releaseDate" date, "dueDate" date, "moduleKey" text, response text, "departmentKey" text, "requesterKey" text, "assigneeKey" text, notes text)
    on conflict (project_id, import_key) where import_key is not null do update set
      content=excluded.content, status_code=excluded.status_code, customer_status_code=excluded.customer_status_code,
      priority_code=excluded.priority_code, stage_code=excluded.stage_code, jira_url=excluded.jira_url, release_date=excluded.release_date,
      due_date=excluded.due_date, module_id=excluded.module_id, module_name_raw=excluded.module_name_raw, response=excluded.response,
      department_id=excluded.department_id, department_name_raw=excluded.department_name_raw, requester_person_id=excluded.requester_person_id,
      requester_name_raw=excluded.requester_name_raw, assignee_person_id=excluded.assignee_person_id, assignee_name_raw=excluded.assignee_name_raw,
      notes=excluded.notes, archived_at=null;
  else
    insert into public.issues(project_id, import_key, content, status_code, customer_status_code, priority_code, stage_code, jira_url, release_date, due_date,
      module_id, module_name_raw, response, department_id, department_name_raw, requester_person_id, requester_name_raw, assignee_person_id, assignee_name_raw, notes)
    select p_project_id, x."importKey", x.content, nullif(x."statusCode",''), nullif(x."customerStatusCode",''), nullif(x."priorityCode",''), nullif(x."stageCode",''), nullif(x."jiraUrl",''), x."releaseDate", x."dueDate",
      (select c.id from public.contract_items c where c.project_id=p_project_id and c.import_key=x."moduleKey" limit 1), x."moduleKey", nullif(x.response,''),
      (select d.id from public.departments d where d.project_id=p_project_id and d.import_key=x."departmentKey" limit 1), x."departmentKey",
      (select pe.id from public.people pe where pe.project_id=p_project_id and pe.import_key=x."requesterKey" limit 1), x."requesterKey",
      (select pe.id from public.people pe where pe.project_id=p_project_id and pe.import_key=x."assigneeKey" limit 1), x."assigneeKey", nullif(x.notes,'')
    from jsonb_to_recordset(coalesce(p_payload->'issues','[]'::jsonb)) as x("importKey" text, content text, "statusCode" text, "customerStatusCode" text, "priorityCode" text, "stageCode" text, "jiraUrl" text, "releaseDate" date, "dueDate" date, "moduleKey" text, response text, "departmentKey" text, "requesterKey" text, "assigneeKey" text, notes text)
    on conflict do nothing;
  end if;

  -- Resource metadata only. Existing encrypted secret stays untouched on merge.
  if p_mode='merge' then
    insert into public.remote_resources(project_id, import_key, name, resource_type, environment, url_or_host, remote_address, username, notes, is_sensitive, has_secret)
    select p_project_id, x."importKey", x.name, coalesce(nullif(x."resourceType",''),'other'), nullif(x.environment,''), nullif(x."urlOrHost",''), nullif(x."remoteAddress",''), nullif(x.username,''), nullif(x.notes,''), coalesce(x."isSensitive",false), false
    from jsonb_to_recordset(coalesce(p_payload->'remoteResources','[]'::jsonb)) as x("importKey" text, name text, "resourceType" text, environment text, "urlOrHost" text, "remoteAddress" text, username text, notes text, "isSensitive" boolean)
    on conflict (project_id, import_key) where import_key is not null do update set
      name=excluded.name, resource_type=excluded.resource_type, environment=excluded.environment, url_or_host=excluded.url_or_host,
      remote_address=excluded.remote_address, username=excluded.username, notes=excluded.notes, is_sensitive=excluded.is_sensitive;
  else
    insert into public.remote_resources(project_id, import_key, name, resource_type, environment, url_or_host, remote_address, username, notes, is_sensitive, has_secret)
    select p_project_id, x."importKey", x.name, coalesce(nullif(x."resourceType",''),'other'), nullif(x.environment,''), nullif(x."urlOrHost",''), nullif(x."remoteAddress",''), nullif(x.username,''), nullif(x.notes,''), coalesce(x."isSensitive",false), false
    from jsonb_to_recordset(coalesce(p_payload->'remoteResources','[]'::jsonb)) as x("importKey" text, name text, "resourceType" text, environment text, "urlOrHost" text, "remoteAddress" text, username text, notes text, "isSensitive" boolean)
    on conflict do nothing;
  end if;

  insert into public.import_batches(project_id, source_file_name, source_hash, mode, status, summary, created_by)
  values (p_project_id, p_file_name, p_source_hash, 'apply', 'imported', v_preview || jsonb_build_object('importMode',p_mode,'templateVersion','0.9.2'), auth.uid())
  returning id into v_batch_id;

  return jsonb_build_object(
    'ok', true,
    'batchId', v_batch_id,
    'mode', p_mode,
    'summary', v_preview,
    'message', 'Apply Import hoàn tất trong một transaction. Không có password/token/secret nào được import.'
  );
end;
$$;

grant execute on function public.preview_import_v092(uuid,jsonb) to authenticated;
grant execute on function public.apply_import_v092(uuid,jsonb,text,text,text) to authenticated;

comment on function public.preview_import_v092(uuid,jsonb) is 'V0.9.2 preview insert/update counts for canonical Excel import.';
comment on function public.apply_import_v092(uuid,jsonb,text,text,text) is 'V0.9.2 transactional canonical Excel import. MASTER/Admin/PM only.';
