-- ASC WORKING V1.3.2 — Bulk Master Data Import / Direct Excel Compatibility
-- Run after V1.3.0 / V1.3.1. Requires import_key columns + import_batches from V0.9.2.
-- Supports both the structured V1.3.2 template and simple Excel workbooks such as:
--   Phòng ban: column A = department name
--   PLHĐ: column A = PLHĐ / module name
--   PLHĐ chi tiết: column A = code, column B = content

create or replace function public.ensure_master_data_import_key_v132()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.import_key is null or btrim(new.import_key) = '' then
    new.import_key := case tg_table_name
      when 'departments' then 'DEPT-'
      when 'contract_items' then 'PLHD-'
      when 'contract_detail_items' then 'DETAIL-'
      else 'ROW-'
    end || upper(substr(replace(new.id::text, '-', ''), 1, 16));
  end if;

  return new;
end;
$$;

-- Backfill records created manually before V1.3.2. The direct-import RPC below
-- does NOT rely only on these generated keys; it can also match by business identity.
update public.departments
set import_key = 'DEPT-' || upper(substr(replace(id::text, '-', ''), 1, 16))
where import_key is null or btrim(import_key) = '';

update public.contract_items
set import_key = 'PLHD-' || upper(substr(replace(id::text, '-', ''), 1, 16))
where import_key is null or btrim(import_key) = '';

update public.contract_detail_items
set import_key = 'DETAIL-' || upper(substr(replace(id::text, '-', ''), 1, 16))
where import_key is null or btrim(import_key) = '';

drop trigger if exists departments_import_key_v132 on public.departments;
create trigger departments_import_key_v132
before insert or update of import_key on public.departments
for each row execute function public.ensure_master_data_import_key_v132();

drop trigger if exists contract_items_import_key_v132 on public.contract_items;
create trigger contract_items_import_key_v132
before insert or update of import_key on public.contract_items
for each row execute function public.ensure_master_data_import_key_v132();

drop trigger if exists contract_detail_items_import_key_v132 on public.contract_detail_items;
create trigger contract_detail_items_import_key_v132
before insert or update of import_key on public.contract_detail_items
for each row execute function public.ensure_master_data_import_key_v132();

comment on function public.ensure_master_data_import_key_v132() is
  'V1.3.2 assigns stable import_key values to Department / PLHD / PLHD Detail rows created outside Excel import.';

-- Preview direct/simple import by matching both import_key and business identity.
create or replace function public.preview_quick_master_import_v132(
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
  where exists (
    select 1
    from public.departments d
    where d.project_id = p_project_id
      and (
        d.import_key = e->>'importKey'
        or d.normalized_name = e->>'normalizedName'
      )
  );
  v_result := v_result || jsonb_build_object('departments', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'contractItems', '[]'::jsonb));
  select count(*) into v_update
  from jsonb_array_elements(coalesce(p_payload->'contractItems', '[]'::jsonb)) e
  where exists (
    select 1
    from public.contract_items c
    where c.project_id = p_project_id
      and (
        c.import_key = e->>'importKey'
        or (
          c.item_type = coalesce(nullif(e->>'itemType',''), 'module')
          and lower(btrim(c.name)) = lower(btrim(e->>'name'))
        )
      )
  );
  v_result := v_result || jsonb_build_object('contractItems', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_incoming := jsonb_array_length(coalesce(p_payload->'contractDetails', '[]'::jsonb));
  select count(*) into v_update
  from jsonb_array_elements(coalesce(p_payload->'contractDetails', '[]'::jsonb)) e
  where exists (
    select 1
    from public.contract_detail_items d
    where d.project_id = p_project_id
      and (
        d.import_key = e->>'importKey'
        or (
          d.sort_order = coalesce((e->>'sortOrder')::integer, 0)
          and coalesce(d.code, '') = coalesce(e->>'code', '')
          and lower(btrim(d.content)) = lower(btrim(e->>'content'))
        )
      )
  );
  v_result := v_result || jsonb_build_object('contractDetails', jsonb_build_object('incoming', v_incoming, 'insert', v_incoming-v_update, 'update', v_update));

  v_result := v_result
    || jsonb_build_object('people', jsonb_build_object('incoming',0,'insert',0,'update',0))
    || jsonb_build_object('stages', jsonb_build_object('incoming',0,'insert',0,'update',0))
    || jsonb_build_object('releaseVersions', jsonb_build_object('incoming',0,'insert',0,'update',0))
    || jsonb_build_object('issues', jsonb_build_object('incoming',0,'insert',0,'update',0))
    || jsonb_build_object('remoteResources', jsonb_build_object('incoming',0,'insert',0,'update',0));

  return v_result;
end;
$$;

-- Transactional apply for direct/simple master-data import.
-- Incoming keys are used to resolve relationships inside this batch, but matching
-- existing rows also uses normalized business identity. This makes import safe even
-- if V1.3.2 already backfilled generated DEPT-/PLHD-/DETAIL- keys.
create or replace function public.apply_quick_master_import_v132(
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
  v_row jsonb;
  v_id uuid;
  v_parent_id uuid;
  v_department_id uuid;
  v_contract_item_id uuid;
  v_department_map jsonb := '{}'::jsonb;
  v_contract_map jsonb := '{}'::jsonb;
  v_detail_map jsonb := '{}'::jsonb;
  v_key text;
  v_parent_key text;
  v_department_key text;
  v_contract_key text;
  v_item_type text;
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

  v_preview := public.preview_quick_master_import_v132(p_project_id, p_payload);

  -- Departments -------------------------------------------------------------
  for v_row in select value from jsonb_array_elements(coalesce(p_payload->'departments','[]'::jsonb))
  loop
    v_key := v_row->>'importKey';
    v_id := null;

    select d.id into v_id
    from public.departments d
    where d.project_id = p_project_id
      and (
        d.import_key = v_key
        or d.normalized_name = v_row->>'normalizedName'
      )
    order by case when d.import_key = v_key then 0 else 1 end, d.created_at
    limit 1;

    if v_id is null then
      insert into public.departments(project_id, import_key, code, name, normalized_name, is_active)
      values (
        p_project_id,
        v_key,
        nullif(v_row->>'code',''),
        v_row->>'name',
        v_row->>'normalizedName',
        true
      )
      returning id into v_id;
    elsif p_mode = 'merge' then
      update public.departments
      set code = nullif(v_row->>'code',''),
          name = v_row->>'name',
          normalized_name = v_row->>'normalizedName',
          is_active = true,
          updated_at = now()
      where id = v_id;
    end if;

    if v_key is not null and v_key <> '' then
      v_department_map := v_department_map || jsonb_build_object(v_key, v_id::text);
    end if;
  end loop;

  -- Contract items / PLHĐ ---------------------------------------------------
  for v_row in select value from jsonb_array_elements(coalesce(p_payload->'contractItems','[]'::jsonb))
  loop
    v_key := v_row->>'importKey';
    v_parent_key := nullif(v_row->>'parentKey','');
    v_department_key := nullif(v_row->>'departmentKey','');
    v_item_type := coalesce(nullif(v_row->>'itemType',''), 'module');
    v_parent_id := null;
    v_department_id := null;
    v_id := null;

    if v_parent_key is not null then
      if v_contract_map ? v_parent_key then
        v_parent_id := (v_contract_map->>v_parent_key)::uuid;
      else
        select id into v_parent_id from public.contract_items where project_id=p_project_id and import_key=v_parent_key limit 1;
      end if;
    end if;

    if v_department_key is not null then
      if v_department_map ? v_department_key then
        v_department_id := (v_department_map->>v_department_key)::uuid;
      else
        select id into v_department_id from public.departments where project_id=p_project_id and import_key=v_department_key limit 1;
      end if;
    end if;

    select c.id into v_id
    from public.contract_items c
    where c.project_id = p_project_id
      and (
        c.import_key = v_key
        or (
          c.item_type = v_item_type
          and lower(btrim(c.name)) = lower(btrim(v_row->>'name'))
          and (v_parent_id is null or c.parent_id is not distinct from v_parent_id)
        )
      )
    order by case when c.import_key = v_key then 0 else 1 end, c.sort_order, c.created_at
    limit 1;

    if v_id is null then
      insert into public.contract_items(
        project_id, import_key, parent_id, code, name, item_type,
        owner_department_id, module_status_code, classification, sort_order
      )
      values (
        p_project_id, v_key, v_parent_id, nullif(v_row->>'code',''), v_row->>'name', v_item_type,
        v_department_id, nullif(v_row->>'moduleStatusCode',''), nullif(v_row->>'classification',''),
        coalesce((v_row->>'sortOrder')::integer, 0)
      )
      returning id into v_id;
    elsif p_mode = 'merge' then
      update public.contract_items
      set parent_id = v_parent_id,
          code = nullif(v_row->>'code',''),
          name = v_row->>'name',
          item_type = v_item_type,
          owner_department_id = v_department_id,
          module_status_code = nullif(v_row->>'moduleStatusCode',''),
          classification = nullif(v_row->>'classification',''),
          sort_order = coalesce((v_row->>'sortOrder')::integer, 0),
          updated_at = now()
      where id = v_id;
    end if;

    if v_key is not null and v_key <> '' then
      v_contract_map := v_contract_map || jsonb_build_object(v_key, v_id::text);
    end if;
  end loop;

  -- Contract detail tree ----------------------------------------------------
  for v_row in select value from jsonb_array_elements(coalesce(p_payload->'contractDetails','[]'::jsonb))
  loop
    v_key := v_row->>'importKey';
    v_parent_key := nullif(v_row->>'parentKey','');
    v_contract_key := nullif(v_row->>'contractItemKey','');
    v_parent_id := null;
    v_contract_item_id := null;
    v_id := null;

    if v_parent_key is not null then
      if v_detail_map ? v_parent_key then
        v_parent_id := (v_detail_map->>v_parent_key)::uuid;
      else
        select id into v_parent_id from public.contract_detail_items where project_id=p_project_id and import_key=v_parent_key limit 1;
      end if;
    end if;

    if v_contract_key is not null then
      if v_contract_map ? v_contract_key then
        v_contract_item_id := (v_contract_map->>v_contract_key)::uuid;
      else
        select id into v_contract_item_id from public.contract_items where project_id=p_project_id and import_key=v_contract_key limit 1;
      end if;
    end if;

    select d.id into v_id
    from public.contract_detail_items d
    where d.project_id = p_project_id
      and (
        d.import_key = v_key
        or (
          d.sort_order = coalesce((v_row->>'sortOrder')::integer, 0)
          and coalesce(d.code,'') = coalesce(v_row->>'code','')
          and lower(btrim(d.content)) = lower(btrim(v_row->>'content'))
          and (v_parent_id is null or d.parent_id is not distinct from v_parent_id)
        )
      )
    order by case when d.import_key = v_key then 0 else 1 end, d.created_at
    limit 1;

    if v_id is null then
      insert into public.contract_detail_items(
        project_id, import_key, parent_id, contract_item_id, code, content,
        node_type, level, sort_order, note
      )
      values (
        p_project_id, v_key, v_parent_id, v_contract_item_id, nullif(v_row->>'code',''), v_row->>'content',
        nullif(v_row->>'nodeType',''), coalesce((v_row->>'level')::integer,0),
        coalesce((v_row->>'sortOrder')::integer,0), nullif(v_row->>'note','')
      )
      returning id into v_id;
    elsif p_mode = 'merge' then
      update public.contract_detail_items
      set parent_id = v_parent_id,
          contract_item_id = v_contract_item_id,
          code = nullif(v_row->>'code',''),
          content = v_row->>'content',
          node_type = nullif(v_row->>'nodeType',''),
          level = coalesce((v_row->>'level')::integer,0),
          sort_order = coalesce((v_row->>'sortOrder')::integer,0),
          note = nullif(v_row->>'note',''),
          updated_at = now()
      where id = v_id;
    end if;

    if v_key is not null and v_key <> '' then
      v_detail_map := v_detail_map || jsonb_build_object(v_key, v_id::text);
    end if;
  end loop;

  insert into public.import_batches(project_id, source_file_name, source_hash, mode, status, summary, created_by)
  values (
    p_project_id,
    p_file_name,
    p_source_hash,
    'apply',
    'imported',
    v_preview || jsonb_build_object('importMode',p_mode,'quickImportVersion','1.3.2','source','direct-master-data'),
    auth.uid()
  )
  returning id into v_batch_id;

  return jsonb_build_object(
    'ok', true,
    'batchId', v_batch_id,
    'mode', p_mode,
    'summary', v_preview,
    'message', 'Import Phòng ban / PLHĐ / PLHĐ chi tiết hoàn tất trong một transaction.'
  );
end;
$$;

grant execute on function public.preview_quick_master_import_v132(uuid,jsonb) to authenticated;
grant execute on function public.apply_quick_master_import_v132(uuid,jsonb,text,text,text) to authenticated;

comment on function public.preview_quick_master_import_v132(uuid,jsonb) is
  'V1.3.2 previews direct Excel master-data import using import key + business identity matching.';
comment on function public.apply_quick_master_import_v132(uuid,jsonb,text,text,text) is
  'V1.3.2 transactional direct Excel import for Departments, PLHD and PLHD Detail.';
