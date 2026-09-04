import { NextRequest, NextResponse } from "next/server";
import { getProjectRole } from "@/lib/issues/server";
import type {
  ProjectCatalogData,
  ProjectCatalogMutationResponse,
  ProjectCatalogResponse,
} from "@/lib/catalog/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown, max = 500) {
  const result = String(value ?? "").trim();
  return result.slice(0, max);
}

function nullableText(value: unknown, max = 500) {
  const result = text(value, max);
  return result || null;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, " ")
    .trim();
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function uniqueUuidList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 60)).filter((item) => uuidPattern.test(item)))];
}

function canManage(role: string | null) {
  return role === "admin" || role === "pm";
}

async function getContext(projectId: string) {
  if (!uuidPattern.test(projectId)) {
    return { error: NextResponse.json({ ok: false, code: "PROJECT_INVALID", message: "Project không hợp lệ." } satisfies ProjectCatalogResponse, { status: 400 }) } as const;
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: NextResponse.json({ ok: false, code: "SUPABASE_REQUIRED", message: "Danh mục Project chỉ khả dụng khi đã kết nối Supabase." } satisfies ProjectCatalogResponse, { status: 503 }) } as const;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ProjectCatalogResponse, { status: 401 }) } as const;
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return { error: NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies ProjectCatalogResponse, { status: 403 }) } as const;
  }

  return { supabase, user, role } as const;
}

function databaseMessage(error: { code?: string | null; message: string }, entity: "department" | "module" | "detail") {
  if (error.code === "23505") {
    return entity === "department"
      ? "Phòng ban này đã tồn tại trong Project. Hãy kiểm tra lại tên phòng ban."
      : entity === "module"
        ? "Dữ liệu PLHĐ bị trùng với ràng buộc hiện có của Project."
        : "Dữ liệu chi tiết PLHĐ bị trùng với ràng buộc hiện có của Project.";
  }
  if (error.code === "23503") return "Dữ liệu liên kết không còn hợp lệ. Hãy tải lại danh mục và chọn lại.";
  return error.message;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const context = await getContext(projectId);
  if ("error" in context) return context.error;
  const { supabase, role } = context;

  const [departmentResult, moduleResult, detailResult, statusResult] = await Promise.all([
    supabase
      .from("departments")
      .select("id,code,name,is_active,updated_at")
      .eq("project_id", projectId)
      .order("is_active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("contract_items")
      .select("id,parent_id,code,name,item_type,owner_department_id,module_status_code,classification,sort_order,updated_at")
      .eq("project_id", projectId)
      .in("item_type", ["root", "subsystem", "module"])
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(5000),
    supabase
      .from("contract_detail_items")
      .select("id,parent_id,contract_item_id,code,content,node_type,level,sort_order,note,updated_at")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("content", { ascending: true })
      .limit(8000),
    supabase
      .from("status_catalog")
      .select("project_id,code,label,sort_order,is_active")
      .eq("category", "module_status")
      .eq("is_active", true)
      .or(`project_id.is.null,project_id.eq.${projectId}`)
      .order("sort_order", { ascending: true }),
  ]);

  const firstError = departmentResult.error ?? moduleResult.error ?? detailResult.error ?? statusResult.error;
  if (firstError) {
    return NextResponse.json({ ok: false, code: "CATALOG_QUERY_FAILED", message: `Không tải được danh mục Project: ${firstError.message}` } satisfies ProjectCatalogResponse, { status: 500 });
  }

  const departments = (departmentResult.data ?? []).map((row) => ({
    id: String(row.id),
    code: row.code ? String(row.code) : null,
    name: String(row.name ?? ""),
    isActive: row.is_active !== false,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }));
  const departmentName = new Map(departments.map((row) => [row.id, row.name]));

  const modules = (moduleResult.data ?? []).map((row) => ({
    id: String(row.id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    code: row.code ? String(row.code) : null,
    name: String(row.name ?? ""),
    itemType: ["root", "subsystem", "module"].includes(String(row.item_type)) ? String(row.item_type) as "root" | "subsystem" | "module" : "module",
  }));
  const parentName = new Map(modules.map((row) => [row.id, row.name]));
  const detailName = new Map((detailResult.data ?? []).map((row) => [String(row.id), String(row.content ?? "")]));

  const statusMap = new Map<string, { label: string; sortOrder: number; projectScoped: boolean }>();
  for (const row of statusResult.data ?? []) {
    const code = String(row.code ?? "");
    if (!code) continue;
    const next = {
      label: String(row.label ?? code),
      sortOrder: Number(row.sort_order ?? 0),
      projectScoped: Boolean(row.project_id),
    };
    const current = statusMap.get(code);
    if (!current || next.projectScoped) statusMap.set(code, next);
  }

  const data: ProjectCatalogData = {
    projectId,
    role,
    canManage: canManage(role),
    departments,
    modules: (moduleResult.data ?? []).map((row) => ({
      id: String(row.id),
      parentId: row.parent_id ? String(row.parent_id) : null,
      parentName: row.parent_id ? parentName.get(String(row.parent_id)) ?? null : null,
      code: row.code ? String(row.code) : null,
      name: String(row.name ?? ""),
      itemType: ["root", "subsystem", "module"].includes(String(row.item_type)) ? String(row.item_type) as "root" | "subsystem" | "module" : "module",
      ownerDepartmentId: row.owner_department_id ? String(row.owner_department_id) : null,
      ownerDepartmentName: row.owner_department_id ? departmentName.get(String(row.owner_department_id)) ?? null : null,
      moduleStatusCode: row.module_status_code ? String(row.module_status_code) : null,
      moduleStatusLabel: row.module_status_code ? statusMap.get(String(row.module_status_code))?.label ?? String(row.module_status_code) : null,
      classification: row.classification ? String(row.classification) : null,
      sortOrder: Number(row.sort_order ?? 0),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    })),
    details: (detailResult.data ?? []).map((row) => ({
      id: String(row.id),
      parentId: row.parent_id ? String(row.parent_id) : null,
      parentContent: row.parent_id ? detailName.get(String(row.parent_id)) ?? null : null,
      contractItemId: row.contract_item_id ? String(row.contract_item_id) : null,
      contractItemName: row.contract_item_id ? parentName.get(String(row.contract_item_id)) ?? null : null,
      code: row.code ? String(row.code) : null,
      content: String(row.content ?? ""),
      nodeType: row.node_type ? String(row.node_type) : null,
      level: Number(row.level ?? 0),
      sortOrder: Number(row.sort_order ?? 0),
      note: row.note ? String(row.note) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    })),
    parentOptions: modules
      .filter((row) => row.itemType === "root" || row.itemType === "subsystem")
      .map((row) => ({
      value: row.id,
      label: `${row.code ? `${row.code} • ` : ""}${row.name}${row.itemType === "root" ? " • Nhóm" : " • Phân hệ"}`,
      })),
    contractItemOptions: modules.map((row) => ({
      value: row.id,
      label: `${row.code ? `${row.code} • ` : ""}${row.name}${row.itemType === "root" ? " • Nhóm" : row.itemType === "subsystem" ? " • Phân hệ" : " • Module"}`,
    })),
    detailParentOptions: (detailResult.data ?? []).map((row) => ({
      value: String(row.id),
      label: `${row.code ? `${row.code} • ` : ""}${String(row.content ?? "")}`,
    })),
    moduleStatusOptions: [...statusMap.entries()]
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder || a[1].label.localeCompare(b[1].label, "vi"))
      .map(([value, item]) => ({ value, label: item.label })),
  };

  return NextResponse.json({ ok: true, data } satisfies ProjectCatalogResponse);
}

async function verifyDepartment(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, departmentId: string | null) {
  if (!departmentId || !supabase) return true;
  const { data } = await supabase
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .eq("project_id", projectId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function verifyParent(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, parentId: string | null) {
  if (!parentId || !supabase) return true;
  const { data } = await supabase
    .from("contract_items")
    .select("id,item_type")
    .eq("id", parentId)
    .eq("project_id", projectId)
    .in("item_type", ["root", "subsystem"])
    .maybeSingle();
  return Boolean(data?.id);
}

async function verifyContractItem(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, contractItemId: string | null) {
  if (!contractItemId || !supabase) return true;
  const { data } = await supabase
    .from("contract_items")
    .select("id,item_type")
    .eq("id", contractItemId)
    .eq("project_id", projectId)
    .in("item_type", ["root", "subsystem", "module"])
    .maybeSingle();
  return Boolean(data?.id);
}

async function verifyDetailParent(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, parentId: string | null) {
  if (!parentId || !supabase) return true;
  const { data } = await supabase
    .from("contract_detail_items")
    .select("id")
    .eq("id", parentId)
    .eq("project_id", projectId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } satisfies ProjectCatalogMutationResponse, { status: 400 }); }

  const projectId = text(body.projectId, 60);
  const entity = body.entity === "module" ? "module" : body.entity === "department" ? "department" : body.entity === "detail" ? "detail" : null;
  if (!entity) return NextResponse.json({ ok: false, code: "ENTITY_REQUIRED", message: "Chưa xác định loại danh mục cần tạo." } satisfies ProjectCatalogMutationResponse, { status: 400 });

  const context = await getContext(projectId);
  if ("error" in context) return context.error;
  const { supabase, role } = context;
  if (!canManage(role)) return NextResponse.json({ ok: false, code: "FORBIDDEN_WRITE", message: "Chỉ MASTER/Admin/PM mới được cập nhật danh mục Project." } satisfies ProjectCatalogMutationResponse, { status: 403 });

  const name = text(body.name, 300);
  if (!name) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: entity === "department" ? "Vui lòng nhập Tên phòng ban." : entity === "module" ? "Vui lòng nhập Tên PLHĐ." : "Vui lòng nhập Nội dung chi tiết PLHĐ.", fieldErrors: { name: "Thông tin này là bắt buộc." } } satisfies ProjectCatalogMutationResponse, { status: 400 });

  if (entity === "department") {
    const { error } = await supabase.from("departments").insert({
      project_id: projectId,
      code: nullableText(body.code, 80),
      name,
      normalized_name: normalizeName(name),
      is_active: body.isActive !== false,
    });
    if (error) return NextResponse.json({ ok: false, code: "DEPARTMENT_CREATE_FAILED", message: databaseMessage(error, entity) } satisfies ProjectCatalogMutationResponse, { status: 400 });
    return NextResponse.json({ ok: true, message: "Đã thêm phòng ban vào Project." } satisfies ProjectCatalogMutationResponse, { status: 201 });
  }

  if (entity === "detail") {
    const parentId = nullableText(body.parentId, 60);
    const contractItemId = nullableText(body.contractItemId, 60);
    if ((parentId && !uuidPattern.test(parentId)) || !(await verifyDetailParent(supabase, projectId, parentId))) {
      return NextResponse.json({ ok: false, code: "DETAIL_PARENT_INVALID", message: "Chi tiết cha không hợp lệ hoặc không thuộc Project.", fieldErrors: { parentId: "Hãy chọn lại chi tiết cha." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
    }
    if ((contractItemId && !uuidPattern.test(contractItemId)) || !(await verifyContractItem(supabase, projectId, contractItemId))) {
      return NextResponse.json({ ok: false, code: "CONTRACT_ITEM_INVALID", message: "PLHĐ liên kết không hợp lệ hoặc không thuộc Project.", fieldErrors: { contractItemId: "Hãy chọn lại PLHĐ liên kết." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
    }
    const { error } = await supabase.from("contract_detail_items").insert({
      project_id: projectId,
      parent_id: parentId,
      contract_item_id: contractItemId,
      code: nullableText(body.code, 120),
      content: name,
      node_type: nullableText(body.nodeType, 80) ?? "other",
      level: integer(body.level, 3),
      sort_order: integer(body.sortOrder, 0),
      note: nullableText(body.note, 1000),
    });
    if (error) return NextResponse.json({ ok: false, code: "DETAIL_CREATE_FAILED", message: databaseMessage(error, entity) } satisfies ProjectCatalogMutationResponse, { status: 400 });
    return NextResponse.json({ ok: true, message: "Đã thêm chi tiết PLHĐ vào Project." } satisfies ProjectCatalogMutationResponse, { status: 201 });
  }

  const parentId = nullableText(body.parentId, 60);
  const departmentId = nullableText(body.ownerDepartmentId, 60);
  const itemType = body.itemType === "root" || body.itemType === "subsystem" || body.itemType === "module" ? body.itemType : "module";
  if ((parentId && !uuidPattern.test(parentId)) || !(await verifyParent(supabase, projectId, parentId))) {
    return NextResponse.json({ ok: false, code: "PARENT_INVALID", message: "Phân hệ/Nhóm cha không hợp lệ hoặc không thuộc Project.", fieldErrors: { parentId: "Hãy chọn lại Phân hệ/Nhóm cha." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
  }
  if ((departmentId && !uuidPattern.test(departmentId)) || !(await verifyDepartment(supabase, projectId, departmentId))) {
    return NextResponse.json({ ok: false, code: "DEPARTMENT_INVALID", message: "Phòng ban phụ trách không hợp lệ hoặc không thuộc Project.", fieldErrors: { ownerDepartmentId: "Hãy chọn lại phòng ban." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
  }

  const { error } = await supabase.from("contract_items").insert({
    project_id: projectId,
    parent_id: parentId,
    code: nullableText(body.code, 120),
    name,
    item_type: itemType,
    owner_department_id: departmentId,
    module_status_code: nullableText(body.moduleStatusCode, 80),
    classification: nullableText(body.classification, 180),
    sort_order: integer(body.sortOrder, 0),
  });
  if (error) return NextResponse.json({ ok: false, code: "MODULE_CREATE_FAILED", message: databaseMessage(error, entity) } satisfies ProjectCatalogMutationResponse, { status: 400 });
  return NextResponse.json({ ok: true, message: "Đã thêm PLHĐ vào Project." } satisfies ProjectCatalogMutationResponse, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } satisfies ProjectCatalogMutationResponse, { status: 400 }); }

  const projectId = text(body.projectId, 60);
  const id = text(body.id, 60);
  const entity = body.entity === "module" ? "module" : body.entity === "department" ? "department" : body.entity === "detail" ? "detail" : null;
  if (!entity || !uuidPattern.test(id)) return NextResponse.json({ ok: false, code: "INVALID_TARGET", message: "Danh mục cần cập nhật không hợp lệ." } satisfies ProjectCatalogMutationResponse, { status: 400 });

  const context = await getContext(projectId);
  if ("error" in context) return context.error;
  const { supabase, role } = context;
  if (!canManage(role)) return NextResponse.json({ ok: false, code: "FORBIDDEN_WRITE", message: "Chỉ MASTER/Admin/PM mới được cập nhật danh mục Project." } satisfies ProjectCatalogMutationResponse, { status: 403 });

  const name = text(body.name, 300);
  if (!name) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: entity === "department" ? "Vui lòng nhập Tên phòng ban." : entity === "module" ? "Vui lòng nhập Tên PLHĐ." : "Vui lòng nhập Nội dung chi tiết PLHĐ.", fieldErrors: { name: "Thông tin này là bắt buộc." } } satisfies ProjectCatalogMutationResponse, { status: 400 });

  if (entity === "department") {
    const { error } = await supabase
      .from("departments")
      .update({
        code: nullableText(body.code, 80),
        name,
        normalized_name: normalizeName(name),
        is_active: body.isActive !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("project_id", projectId);
    if (error) return NextResponse.json({ ok: false, code: "DEPARTMENT_UPDATE_FAILED", message: databaseMessage(error, entity) } satisfies ProjectCatalogMutationResponse, { status: 400 });
    return NextResponse.json({ ok: true, message: "Đã cập nhật phòng ban." } satisfies ProjectCatalogMutationResponse);
  }

  if (entity === "detail") {
    const parentId = nullableText(body.parentId, 60);
    const contractItemId = nullableText(body.contractItemId, 60);
    if (parentId === id) return NextResponse.json({ ok: false, code: "DETAIL_PARENT_SELF", message: "Chi tiết PLHĐ không thể chọn chính nó làm cấp cha.", fieldErrors: { parentId: "Hãy chọn chi tiết cha khác." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
    if ((parentId && !uuidPattern.test(parentId)) || !(await verifyDetailParent(supabase, projectId, parentId))) {
      return NextResponse.json({ ok: false, code: "DETAIL_PARENT_INVALID", message: "Chi tiết cha không hợp lệ hoặc không thuộc Project.", fieldErrors: { parentId: "Hãy chọn lại chi tiết cha." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
    }
    if ((contractItemId && !uuidPattern.test(contractItemId)) || !(await verifyContractItem(supabase, projectId, contractItemId))) {
      return NextResponse.json({ ok: false, code: "CONTRACT_ITEM_INVALID", message: "PLHĐ liên kết không hợp lệ hoặc không thuộc Project.", fieldErrors: { contractItemId: "Hãy chọn lại PLHĐ liên kết." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
    }
    const { error } = await supabase
      .from("contract_detail_items")
      .update({
        parent_id: parentId,
        contract_item_id: contractItemId,
        code: nullableText(body.code, 120),
        content: name,
        node_type: nullableText(body.nodeType, 80) ?? "other",
        level: integer(body.level, 3),
        sort_order: integer(body.sortOrder, 0),
        note: nullableText(body.note, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("project_id", projectId);
    if (error) return NextResponse.json({ ok: false, code: "DETAIL_UPDATE_FAILED", message: databaseMessage(error, entity) } satisfies ProjectCatalogMutationResponse, { status: 400 });
    return NextResponse.json({ ok: true, message: "Đã cập nhật chi tiết PLHĐ." } satisfies ProjectCatalogMutationResponse);
  }

  const parentId = nullableText(body.parentId, 60);
  const departmentId = nullableText(body.ownerDepartmentId, 60);
  const itemType = body.itemType === "root" || body.itemType === "subsystem" || body.itemType === "module" ? body.itemType : "module";
  if (parentId === id) return NextResponse.json({ ok: false, code: "PARENT_SELF", message: "Module không thể chọn chính nó làm cấp cha.", fieldErrors: { parentId: "Hãy chọn Phân hệ/Nhóm khác." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
  if ((parentId && !uuidPattern.test(parentId)) || !(await verifyParent(supabase, projectId, parentId))) {
    return NextResponse.json({ ok: false, code: "PARENT_INVALID", message: "Phân hệ/Nhóm cha không hợp lệ hoặc không thuộc Project.", fieldErrors: { parentId: "Hãy chọn lại Phân hệ/Nhóm cha." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
  }
  if ((departmentId && !uuidPattern.test(departmentId)) || !(await verifyDepartment(supabase, projectId, departmentId))) {
    return NextResponse.json({ ok: false, code: "DEPARTMENT_INVALID", message: "Phòng ban phụ trách không hợp lệ hoặc không thuộc Project.", fieldErrors: { ownerDepartmentId: "Hãy chọn lại phòng ban." } } satisfies ProjectCatalogMutationResponse, { status: 400 });
  }

  const { error } = await supabase
    .from("contract_items")
    .update({
      parent_id: parentId,
      code: nullableText(body.code, 120),
      name,
      item_type: itemType,
      owner_department_id: departmentId,
      module_status_code: nullableText(body.moduleStatusCode, 80),
      classification: nullableText(body.classification, 180),
      sort_order: integer(body.sortOrder, 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId)
    .in("item_type", ["root", "subsystem", "module"]);
  if (error) return NextResponse.json({ ok: false, code: "MODULE_UPDATE_FAILED", message: databaseMessage(error, entity) } satisfies ProjectCatalogMutationResponse, { status: 400 });
  return NextResponse.json({ ok: true, message: "Đã cập nhật PLHĐ." } satisfies ProjectCatalogMutationResponse);
}

export async function DELETE(request: NextRequest) {
  // V1.9.0 hard delete: unused catalog rows are removed permanently, not archived.
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } satisfies ProjectCatalogMutationResponse, { status: 400 }); }

  const projectId = text(body.projectId, 60);
  const entity = body.entity === "module" ? "module" : body.entity === "department" ? "department" : body.entity === "detail" ? "detail" : null;
  const ids = uniqueUuidList(body.ids);
  if (!entity || !ids.length) return NextResponse.json({ ok: false, code: "INVALID_TARGET", message: "Chưa chọn dữ liệu cần xóa." } satisfies ProjectCatalogMutationResponse, { status: 400 });

  const context = await getContext(projectId);
  if ("error" in context) return context.error;
  const { supabase, role } = context;
  if (!canManage(role)) return NextResponse.json({ ok: false, code: "FORBIDDEN_WRITE", message: "Chỉ MASTER/Admin/PM mới được xóa danh mục Project." } satisfies ProjectCatalogMutationResponse, { status: 403 });

  if (entity === "department") {
    const [{ data: owned }, issueUsage, peopleUsage, moduleUsage] = await Promise.all([
      supabase.from("departments").select("id").eq("project_id", projectId).in("id", ids),
      supabase.from("issues").select("department_id").eq("project_id", projectId).in("department_id", ids),
      supabase.from("people").select("department_id").eq("project_id", projectId).in("department_id", ids),
      supabase.from("contract_items").select("owner_department_id").eq("project_id", projectId).in("owner_department_id", ids),
    ]);
    const ownedIds = new Set((owned ?? []).map((row) => String(row.id)));
    const blocked = new Set<string>();
    for (const row of issueUsage.data ?? []) if (row.department_id) blocked.add(String(row.department_id));
    for (const row of peopleUsage.data ?? []) if (row.department_id) blocked.add(String(row.department_id));
    for (const row of moduleUsage.data ?? []) if (row.owner_department_id) blocked.add(String(row.owner_department_id));
    const deletable = ids.filter((id) => ownedIds.has(id) && !blocked.has(id));
    if (deletable.length) {
      const { error } = await supabase.from("departments").delete().eq("project_id", projectId).in("id", deletable);
      if (error) return NextResponse.json({ ok: false, code: "DEPARTMENT_DELETE_FAILED", message: `Không xóa được phòng ban: ${error.message}` } satisfies ProjectCatalogMutationResponse, { status: 400 });
    }
    const blockedCount = ids.filter((id) => ownedIds.has(id) && blocked.has(id)).length;
    return NextResponse.json({ ok: true, deletedCount: deletable.length, blockedCount, message: blockedCount ? `Đã xóa ${deletable.length} phòng ban. ${blockedCount} phòng ban đang được sử dụng nên không xóa.` : `Đã xóa ${deletable.length} phòng ban.` } satisfies ProjectCatalogMutationResponse);
  }

  if (entity === "detail") {
    const [{ data: owned }, childUsage] = await Promise.all([
      supabase.from("contract_detail_items").select("id").eq("project_id", projectId).in("id", ids),
      supabase.from("contract_detail_items").select("parent_id").eq("project_id", projectId).in("parent_id", ids),
    ]);
    const ownedIds = new Set((owned ?? []).map((row) => String(row.id)));
    const blocked = new Set<string>();
    for (const row of childUsage.data ?? []) if (row.parent_id) blocked.add(String(row.parent_id));
    const deletable = ids.filter((id) => ownedIds.has(id) && !blocked.has(id));
    if (deletable.length) {
      const { error } = await supabase.from("contract_detail_items").delete().eq("project_id", projectId).in("id", deletable);
      if (error) return NextResponse.json({ ok: false, code: "DETAIL_DELETE_FAILED", message: `Không xóa được chi tiết PLHĐ: ${error.message}` } satisfies ProjectCatalogMutationResponse, { status: 400 });
    }
    const blockedCount = ids.filter((id) => ownedIds.has(id) && blocked.has(id)).length;
    return NextResponse.json({ ok: true, deletedCount: deletable.length, blockedCount, message: blockedCount ? `Đã xóa ${deletable.length} chi tiết PLHĐ. ${blockedCount} dòng có chi tiết con nên không xóa.` : `Đã xóa ${deletable.length} chi tiết PLHĐ.` } satisfies ProjectCatalogMutationResponse);
  }

  const [{ data: owned }, issueUsage, detailUsage, childUsage] = await Promise.all([
    supabase.from("contract_items").select("id").eq("project_id", projectId).in("item_type", ["root", "subsystem", "module"]).in("id", ids),
    supabase.from("issues").select("module_id").eq("project_id", projectId).in("module_id", ids),
    supabase.from("contract_detail_items").select("contract_item_id").eq("project_id", projectId).in("contract_item_id", ids),
    supabase.from("contract_items").select("parent_id").eq("project_id", projectId).in("parent_id", ids),
  ]);
  const ownedIds = new Set((owned ?? []).map((row) => String(row.id)));
  const blocked = new Set<string>();
  for (const row of issueUsage.data ?? []) if (row.module_id) blocked.add(String(row.module_id));
  for (const row of detailUsage.data ?? []) if (row.contract_item_id) blocked.add(String(row.contract_item_id));
  for (const row of childUsage.data ?? []) if (row.parent_id) blocked.add(String(row.parent_id));
  const deletable = ids.filter((id) => ownedIds.has(id) && !blocked.has(id));
  if (deletable.length) {
    const { error } = await supabase.from("contract_items").delete().eq("project_id", projectId).in("item_type", ["root", "subsystem", "module"]).in("id", deletable);
    if (error) return NextResponse.json({ ok: false, code: "MODULE_DELETE_FAILED", message: `Không xóa được PLHĐ: ${error.message}` } satisfies ProjectCatalogMutationResponse, { status: 400 });
  }
  const blockedCount = ids.filter((id) => ownedIds.has(id) && blocked.has(id)).length;
  return NextResponse.json({ ok: true, deletedCount: deletable.length, blockedCount, message: blockedCount ? `Đã xóa ${deletable.length} dòng PLHĐ. ${blockedCount} dòng đang được sử dụng nên không xóa.` : `Đã xóa ${deletable.length} dòng PLHĐ.` } satisfies ProjectCatalogMutationResponse);
}
