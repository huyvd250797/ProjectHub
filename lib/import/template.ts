import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_TEMPLATE_VERSION } from "@/lib/import/canonical";

type TemplateStageRow = {
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  sort_order: number | null;
};

type TemplateCatalogRow = {
  category: string;
  code: string;
  label: string;
  sort_order: number | null;
};

function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null>> = [],
  widths: number[] = [],
) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = headers.map((header, index) => ({
    wch: widths[index] ?? Math.min(Math.max(header.length + 4, 14), 34),
  }));
  if (headers.length) {
    worksheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function makeGuideRows(projectCode: string) {
  return [
    ["ASC WORKING V0.9.2 — EXCEL IMPORT PRODUCTION"],
    [""],
    ["Project đích", projectCode],
    ["Template version", IMPORT_TEMPLATE_VERSION],
    [""],
    ["QUY TẮC"],
    ["1", "Không đổi tên sheet hoặc tên cột."],
    ["2", "Mỗi dòng dữ liệu phải có key duy nhất trong sheet. Key dùng để nhận diện bản ghi khi import lại."],
    ["3", "Chế độ Merge: cùng key sẽ cập nhật, key mới sẽ thêm mới."],
    ["4", "Chế độ Chỉ thêm mới: bản ghi trùng key sẽ được bỏ qua, không cập nhật."],
    ["5", "Các cột *_key phải tham chiếu key ở sheet tương ứng, không dùng tên tự do."],
    ["6", "Ngày nhập theo YYYY-MM-DD hoặc DD/MM/YYYY."],
    ["7", "RESOURCE không có password/token/secret. Credential phải nhập trong Resource Vault để được mã hóa."],
    ["8", "Luôn chạy Kiểm tra dữ liệu trước khi Apply Import."],
    [""],
    ["THỨ TỰ NÊN NHẬP"],
    ["1", "PROJECT / GIAI ĐOẠN"],
    ["2", "PHÒNG BAN"],
    ["3", "NHÂN SỰ"],
    ["4", "PLHĐ"],
    ["5", "PLHĐ CHI TIẾT"],
    ["6", "RELEASE"],
    ["7", "ISSUE"],
    ["8", "RESOURCE"],
    [""],
    ["KEY GỢI Ý"],
    ["PHÒNG BAN", "DEPT-DT, DEPT-CTSV"],
    ["NHÂN SỰ", "CUS-LAN, ASC-HUY"],
    ["PLHĐ", "MOD-DKHP, MOD-DIEM"],
    ["PLHĐ CHI TIẾT", "DETAIL-DKHP-001"],
    ["ISSUE", "ISSUE-001 hoặc Jira key ổn định"],
    ["RESOURCE", "RES-PORTAL-PROD"],
  ];
}

export async function buildImportTemplate(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ fileName: string; bytes: ArrayBuffer }> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id,code,name,organization_name,contract_no,contract_value,contract_date,start_date,due_date,status")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    throw new Error("Không tìm thấy Project hoặc bạn không có quyền truy cập.");
  }

  const [{ data: catalogs }, { data: stages }] = await Promise.all([
    supabase
      .from("status_catalog")
      .select("category,code,label,sort_order")
      .or(`project_id.is.null,project_id.eq.${projectId}`)
      .eq("is_active", true)
      .order("category")
      .order("sort_order"),
    supabase
      .from("project_stages")
      .select("code,name,start_date,end_date,status,sort_order")
      .eq("project_id", projectId)
      .order("sort_order"),
  ]);

  const workbook = XLSX.utils.book_new();
  const guide = XLSX.utils.aoa_to_sheet(makeGuideRows(project.code));
  guide["!cols"] = [{ wch: 20 }, { wch: 78 }];
  XLSX.utils.book_append_sheet(workbook, guide, "HƯỚNG DẪN");

  addSheet(
    workbook,
    "PROJECT",
    ["project_code", "project_name", "organization_name", "contract_no", "contract_value", "contract_date", "start_date", "due_date", "status"],
    [[
      project.code,
      project.name,
      project.organization_name ?? "",
      project.contract_no ?? "",
      project.contract_value ?? "",
      project.contract_date ?? "",
      project.start_date ?? "",
      project.due_date ?? "",
      project.status ?? "active",
    ]],
    [16, 30, 34, 22, 18, 16, 16, 16, 16],
  );

  addSheet(
    workbook,
    "GIAI ĐOẠN",
    ["key", "code", "name", "start_date", "end_date", "status", "sort_order"],
    ((stages ?? []) as TemplateStageRow[]).map((stage) => [
      `STAGE-${String(stage.code).toUpperCase()}`,
      stage.code,
      stage.name,
      stage.start_date ?? "",
      stage.end_date ?? "",
      stage.status ?? "",
      stage.sort_order ?? 0,
    ]),
    [20, 16, 30, 16, 16, 18, 12],
  );

  addSheet(workbook, "PHÒNG BAN", ["key", "code", "name"], [], [22, 18, 38]);
  addSheet(
    workbook,
    "NHÂN SỰ",
    ["key", "person_type", "department_key", "full_name", "title", "project_role", "email", "zalo", "module_notes"],
    [],
    [22, 16, 22, 28, 24, 20, 30, 18, 38],
  );
  addSheet(
    workbook,
    "PLHĐ",
    ["key", "parent_key", "code", "name", "item_type", "department_key", "module_status_code", "classification", "sort_order"],
    [],
    [24, 24, 16, 44, 16, 22, 22, 22, 12],
  );
  addSheet(
    workbook,
    "PLHĐ CHI TIẾT",
    ["key", "parent_key", "contract_item_key", "code", "content", "node_type", "level", "sort_order", "note"],
    [],
    [28, 28, 28, 18, 70, 20, 10, 12, 42],
  );
  addSheet(
    workbook,
    "ISSUE",
    ["key", "content", "status_code", "customer_status_code", "priority_code", "stage_code", "jira_url", "release_date", "due_date", "module_key", "response", "department_key", "requester_key", "assignee_key", "notes"],
    [],
    [24, 72, 22, 24, 18, 18, 42, 16, 16, 26, 56, 24, 24, 24, 48],
  );
  addSheet(workbook, "RELEASE", ["key", "sequence_no", "release_date", "label"], [], [22, 14, 16, 28]);
  addSheet(
    workbook,
    "RESOURCE",
    ["key", "name", "resource_type", "environment", "url_or_host", "remote_address", "username", "notes", "is_sensitive"],
    [],
    [24, 32, 20, 18, 48, 24, 24, 50, 14],
  );

  const catalogRows = [
    ["person_type", "asc", "Nhân sự ASC"],
    ["person_type", "customer", "Nhân sự khách hàng"],
    ["item_type", "root", "Root"],
    ["item_type", "subsystem", "Phân hệ"],
    ["item_type", "module", "Module"],
    ["node_type", "function", "Chức năng"],
    ["project_status", "active", "Active"],
    ["project_status", "paused", "Paused"],
    ["project_status", "completed", "Completed"],
    ["project_status", "archived", "Archived"],
    ["resource_type", "portal", "Portal"],
    ["resource_type", "server", "Server"],
    ["resource_type", "database", "Database"],
    ["resource_type", "folder", "Folder / Document"],
    ["resource_type", "test", "Test"],
    ["resource_type", "other", "Other"],
    ["environment", "production", "Production"],
    ["environment", "staging", "Staging"],
    ["environment", "test", "Test"],
    ["environment", "development", "Development"],
    ...((catalogs ?? []) as TemplateCatalogRow[]).map((item) => [item.category, item.code, item.label]),
  ];
  addSheet(workbook, "DANH MỤC", ["category", "code", "label"], catalogRows, [24, 28, 42]);

  const metaRows = [
    ["key", "value"],
    ["template_version", IMPORT_TEMPLATE_VERSION],
    ["project_id", project.id],
    ["project_code", project.code],
    ["generated_at", new Date().toISOString()],
    ["generator", "ASC WORKING"],
  ];
  const meta = XLSX.utils.aoa_to_sheet(metaRows);
  XLSX.utils.book_append_sheet(workbook, meta, "__META");
  workbook.Workbook = workbook.Workbook ?? {};
  workbook.Workbook.Sheets = workbook.SheetNames.map((name) => ({
    name,
    Hidden: name === "__META" ? 2 : 0,
  }));

  const bytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  }) as ArrayBuffer;

  const safeCode = String(project.code).replace(/[^A-Za-z0-9_-]+/g, "-");
  return {
    fileName: `ASC-WORKING-${safeCode}-Import-Template-V0.9.2.xlsx`,
    bytes,
  };
}
