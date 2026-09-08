import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectRole } from "@/lib/issues/types";
import type {
  DataIntegrityDomain,
  DataIntegrityDomainSummary,
  DataIntegrityFinding,
  DataIntegrityReport,
  DataIntegritySeverity,
  DataIntegrityStatus,
} from "@/lib/data-integrity/types";

type Row = Record<string, unknown>;

const DOMAIN_LABELS: Record<DataIntegrityDomain, string> = {
  catalog: "Catalog / PLHĐ",
  issue: "ISSUE",
  plan: "Plan",
  finance: "Finance",
  workload: "Workload",
};

const CLOSED_ISSUE_STATUSES = new Set(["resolved", "released", "no_action", "not_feasible"]);

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function nullableText(value: unknown) {
  const result = text(value);
  return result || null;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyValue(value: unknown) {
  return Math.max(0, numberValue(value));
}

function dateOnly(value: unknown) {
  const raw = nullableText(value);
  return raw ? raw.slice(0, 10) : null;
}

function dateKey(value: unknown) {
  const date = dateOnly(value);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function isBefore(left: string | null, right: string | null) {
  return Boolean(left && right && left < right);
}

function isAfter(left: string | null, right: string | null) {
  return Boolean(left && right && left > right);
}

function statusForFindings(findings: DataIntegrityFinding[]): DataIntegrityStatus {
  if (findings.some((item) => item.severity === "critical")) return "blocked";
  if (findings.length > 0) return "attention";
  return "clean";
}

function scoreForFindings(findings: DataIntegrityFinding[]) {
  const penalty = findings.reduce((sum, item) => {
    if (item.severity === "critical") return sum + 20;
    if (item.severity === "high") return sum + 12;
    if (item.severity === "medium") return sum + 6;
    return sum + 3;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function finding(input: Omit<DataIntegrityFinding, "id"> & { key: string }) {
  return {
    id: `${input.domain}:${input.entityType}:${input.entityId ?? input.key}`,
    ...input,
  };
}

function domainSummaries(findings: DataIntegrityFinding[]): DataIntegrityDomainSummary[] {
  return (Object.keys(DOMAIN_LABELS) as DataIntegrityDomain[]).map((domain) => {
    const domainFindings = findings.filter((item) => item.domain === domain);
    return {
      domain,
      label: DOMAIN_LABELS[domain],
      status: statusForFindings(domainFindings),
      findingCount: domainFindings.length,
      criticalCount: domainFindings.filter((item) => item.severity === "critical").length,
      highCount: domainFindings.filter((item) => item.severity === "high").length,
    };
  });
}

function sortFindings(findings: DataIntegrityFinding[]) {
  const rank: Record<DataIntegritySeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity] || a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title, "vi"));
}

export function isDataIntegritySourceMissing(message: string) {
  return /contract_items|contract_detail_items|project_stages|project_milestones|project_plan_tasks|project_financial_months|capacity_hours_per_week|allocation_target_percent|schema cache|relation .* does not exist/i.test(message);
}

export async function loadDataIntegrityReport(
  supabase: SupabaseClient,
  projectId: string,
  _role: ProjectRole,
): Promise<DataIntegrityReport> {
  const [
    projectResult,
    departmentResult,
    contractItemResult,
    detailResult,
    issueResult,
    peopleResult,
    stageResult,
    milestoneResult,
    taskResult,
    financeResult,
  ] = await Promise.all([
    supabase.from("projects").select("id,code,name,contract_value").eq("id", projectId).maybeSingle(),
    supabase.from("departments").select("id,code,name,is_active").eq("project_id", projectId).limit(5000),
    supabase.from("contract_items").select("id,parent_id,code,name,item_type,owner_department_id,module_status_code").eq("project_id", projectId).limit(8000),
    supabase.from("contract_detail_items").select("id,parent_id,contract_item_id,code,content,node_type,level").eq("project_id", projectId).limit(12000),
    supabase.from("issues").select("id,issue_no,content,status_code,stage_code,module_id,department_id,requester_person_id,assignee_person_id,due_date,estimated_hours,archived_at").eq("project_id", projectId).is("archived_at", null).limit(12000),
    supabase.from("people").select("id,full_name,person_type,department_id,is_active,capacity_hours_per_week,allocation_target_percent").eq("project_id", projectId).limit(6000),
    supabase.from("project_stages").select("id,code,name,start_date,end_date,owner_person_id").eq("project_id", projectId).limit(2000),
    supabase.from("project_milestones").select("id,title,due_date,stage_id,owner_person_id,status").eq("project_id", projectId).limit(4000),
    supabase.from("project_plan_tasks").select("id,title,due_date,stage_id,owner_person_id,status,estimated_hours").eq("project_id", projectId).limit(8000),
    supabase.from("project_financial_months").select("id,month_date,forecast_percent,actual_percent,revenue_amount,staff_cost_amount,other_cost_amount").eq("project_id", projectId).limit(1200),
  ]);

  const firstError = projectResult.error
    ?? departmentResult.error
    ?? contractItemResult.error
    ?? detailResult.error
    ?? issueResult.error
    ?? peopleResult.error
    ?? stageResult.error
    ?? milestoneResult.error
    ?? taskResult.error
    ?? financeResult.error;
  if (firstError) throw new Error(firstError.message);
  if (!projectResult.data) throw new Error("Project không tồn tại hoặc bạn không có quyền truy cập.");

  const project = projectResult.data as Row;
  const departments = (departmentResult.data ?? []) as Row[];
  const contractItems = (contractItemResult.data ?? []) as Row[];
  const details = (detailResult.data ?? []) as Row[];
  const issues = (issueResult.data ?? []) as Row[];
  const people = (peopleResult.data ?? []) as Row[];
  const stages = (stageResult.data ?? []) as Row[];
  const milestones = (milestoneResult.data ?? []) as Row[];
  const tasks = (taskResult.data ?? []) as Row[];
  const financeMonths = (financeResult.data ?? []) as Row[];

  const activeDepartments = new Map(departments.filter((row) => row.is_active !== false).map((row) => [text(row.id), row]));
  const allDepartments = new Map(departments.map((row) => [text(row.id), row]));
  const contractById = new Map(contractItems.map((row) => [text(row.id), row]));
  const moduleIds = new Set(contractItems.filter((row) => text(row.item_type) === "module").map((row) => text(row.id)));
  const stageByCode = new Map(stages.map((row) => [text(row.code), row]));
  const stageById = new Map(stages.map((row) => [text(row.id), row]));
  const personById = new Map(people.map((row) => [text(row.id), row]));
  const activePersonById = new Map(people.filter((row) => row.is_active !== false).map((row) => [text(row.id), row]));
  const detailById = new Map(details.map((row) => [text(row.id), row]));
  const findings: DataIntegrityFinding[] = [];

  for (const item of contractItems) {
    const id = text(item.id);
    const type = text(item.item_type, "module");
    const label = text(item.name, text(item.code, id));
    const parentId = nullableText(item.parent_id);
    const ownerDepartmentId = nullableText(item.owner_department_id);
    if (!["root", "subsystem", "module"].includes(type)) {
      findings.push(finding({ key: id, domain: "catalog", severity: "high", title: "PLHĐ có loại node không hợp lệ", detail: `Node "${label}" đang có item_type="${type}".`, entityType: "contract_item", entityId: id, entityLabel: label, expectedSource: "Danh mục PLHĐ", fixHint: "Chuẩn hóa item_type về root, subsystem hoặc module trong danh mục PLHĐ.", href: "/contract" }));
    }
    if (type !== "root" && (!parentId || !contractById.has(parentId))) {
      findings.push(finding({ key: id, domain: "catalog", severity: "critical", title: "PLHĐ thiếu cấp cha hợp lệ", detail: `Node "${label}" không có parent_id hợp lệ trong cùng Project.`, entityType: "contract_item", entityId: id, entityLabel: label, expectedSource: "Danh mục PLHĐ", fixHint: "Mở Danh mục PLHĐ và gắn lại cấp cha đúng Nhóm/Phân hệ.", href: "/contract" }));
    }
    if (type === "module" && ownerDepartmentId && !activeDepartments.has(ownerDepartmentId)) {
      findings.push(finding({ key: id, domain: "catalog", severity: "medium", title: "Module gắn phòng ban không còn active", detail: `Module "${label}" đang trỏ tới phòng ban không tồn tại hoặc đã ngưng dùng.`, entityType: "contract_item", entityId: id, entityLabel: label, expectedSource: "Danh mục phòng ban", fixHint: "Chọn lại phòng ban phụ trách cho Module trong Danh mục PLHĐ.", href: "/contract" }));
    }
  }

  for (const detail of details) {
    const id = text(detail.id);
    const label = text(detail.content, text(detail.code, id));
    const parentId = nullableText(detail.parent_id);
    const contractItemId = nullableText(detail.contract_item_id);
    const nodeType = text(detail.node_type, "function").toLowerCase();
    if (nodeType !== "function") {
      findings.push(finding({ key: id, domain: "catalog", severity: "medium", title: "Chi tiết PLHĐ chưa chuẩn Function", detail: `Chi tiết "${label}" đang có node_type="${nodeType}".`, entityType: "contract_detail_item", entityId: id, entityLabel: label, expectedSource: "Danh mục chi tiết PLHĐ", fixHint: "Chuẩn hóa chi tiết PLHĐ về node_type=function.", href: "/contract" }));
    }
    if (parentId && !detailById.has(parentId)) {
      findings.push(finding({ key: id, domain: "catalog", severity: "high", title: "Chi tiết PLHĐ thiếu cấp cha", detail: `Chi tiết "${label}" đang trỏ tới parent_id không còn tồn tại.`, entityType: "contract_detail_item", entityId: id, entityLabel: label, expectedSource: "Danh mục chi tiết PLHĐ", fixHint: "Gắn lại chức năng cha hoặc bỏ cấp cha cho dòng chi tiết này.", href: "/contract" }));
    }
    if (!contractItemId || !moduleIds.has(contractItemId)) {
      findings.push(finding({ key: id, domain: "catalog", severity: "high", title: "Chi tiết PLHĐ chưa gắn Module nguồn", detail: `Chi tiết "${label}" không gắn với Module hợp lệ trong danh mục PLHĐ.`, entityType: "contract_detail_item", entityId: id, entityLabel: label, expectedSource: "Danh mục PLHĐ / Module", fixHint: "Mở danh mục chi tiết PLHĐ và chọn lại Module.", href: "/contract" }));
    }
  }

  for (const issue of issues) {
    const id = text(issue.id);
    const issueNo = issue.issue_no === null || issue.issue_no === undefined ? "-" : `#${Number(issue.issue_no)}`;
    const label = `ISSUE ${issueNo}`;
    const status = text(issue.status_code);
    const moduleId = nullableText(issue.module_id);
    const departmentId = nullableText(issue.department_id);
    const assigneeId = nullableText(issue.assignee_person_id);
    const requesterId = nullableText(issue.requester_person_id);
    const stageCode = nullableText(issue.stage_code);
    if (!moduleId || !moduleIds.has(moduleId)) {
      findings.push(finding({ key: id, domain: "issue", severity: "high", title: "ISSUE không khớp Module trong danh mục", detail: `${label} đang thiếu module_id hoặc trỏ tới Module không còn trong danh mục PLHĐ.`, entityType: "issue", entityId: id, entityLabel: label, expectedSource: "Danh mục PLHĐ / Module", fixHint: "Mở ISSUE và chọn lại Module từ danh mục hiện hành.", href: "/issues" }));
    }
    if (!departmentId || !activeDepartments.has(departmentId)) {
      const department = departmentId ? allDepartments.get(departmentId) : null;
      findings.push(finding({ key: `${id}:department`, domain: "issue", severity: "medium", title: "ISSUE không khớp phòng ban active", detail: `${label} đang thiếu phòng ban hoặc gắn phòng ban ${department?.is_active === false ? "đã ngưng dùng" : "không tồn tại"}.`, entityType: "issue", entityId: id, entityLabel: label, expectedSource: "Danh mục phòng ban", fixHint: "Mở ISSUE và chọn lại phòng ban còn active.", href: "/issues" }));
    }
    if (assigneeId && !activePersonById.has(assigneeId)) {
      findings.push(finding({ key: `${id}:assignee`, domain: "issue", severity: "high", title: "ISSUE gắn người phụ trách không active", detail: `${label} đang trỏ tới nhân sự không tồn tại hoặc đã inactive.`, entityType: "issue", entityId: id, entityLabel: label, expectedSource: "Project Team / People", fixHint: "Chọn lại người phụ trách để Workload tính đúng tải việc.", href: "/issues" }));
    }
    if (requesterId && !personById.has(requesterId)) {
      findings.push(finding({ key: `${id}:requester`, domain: "issue", severity: "medium", title: "ISSUE gắn người yêu cầu không tồn tại", detail: `${label} đang trỏ tới requester không còn trong People của Project.`, entityType: "issue", entityId: id, entityLabel: label, expectedSource: "Project Team / People", fixHint: "Chọn lại nhân sự yêu cầu trong form ISSUE.", href: "/issues" }));
    }
    if (stageCode && !stageByCode.has(stageCode)) {
      findings.push(finding({ key: `${id}:stage`, domain: "issue", severity: "medium", title: "ISSUE gắn Stage không có trong Plan", detail: `${label} đang có stage_code="${stageCode}" nhưng Project Stages không còn mã này.`, entityType: "issue", entityId: id, entityLabel: label, expectedSource: "Project Stages", fixHint: "Chọn lại giai đoạn ISSUE hoặc tạo lại Stage tương ứng trong Kế hoạch.", href: "/issues" }));
    }
    if (!CLOSED_ISSUE_STATUSES.has(status) && numberValue(issue.estimated_hours) <= 0) {
      findings.push(finding({ key: `${id}:estimate`, domain: "workload", severity: "low", title: "ISSUE mở chưa có giờ ước tính", detail: `${label} chưa có estimated_hours nên Workload/Allocation có thể tính nhẹ hơn thực tế.`, entityType: "issue", entityId: id, entityLabel: label, expectedSource: "ISSUE estimated hours", fixHint: "Nhập Giờ ước tính trong ISSUE để tải việc chính xác hơn.", href: "/issues" }));
    }
  }

  for (const stage of stages) {
    const id = text(stage.id);
    const label = text(stage.name, text(stage.code, id));
    const startDate = dateKey(stage.start_date);
    const endDate = dateKey(stage.end_date);
    const ownerId = nullableText(stage.owner_person_id);
    if (startDate && endDate && isAfter(startDate, endDate)) {
      findings.push(finding({ key: id, domain: "plan", severity: "critical", title: "Stage có ngày bắt đầu sau ngày kết thúc", detail: `Stage "${label}" đang có khoảng ngày không hợp lệ.`, entityType: "project_stage", entityId: id, entityLabel: label, expectedSource: "Project Stages", fixHint: "Sửa lại Từ ngày/Đến ngày của Stage trong màn Kế hoạch.", href: "/plan" }));
    }
    if (ownerId && !activePersonById.has(ownerId)) {
      findings.push(finding({ key: `${id}:owner`, domain: "plan", severity: "medium", title: "Stage gắn owner không active", detail: `Stage "${label}" đang gắn owner không còn active trong Project Team.`, entityType: "project_stage", entityId: id, entityLabel: label, expectedSource: "Project Team / People", fixHint: "Chọn lại owner cho Stage.", href: "/plan" }));
    }
  }

  for (const milestone of milestones) {
    const id = text(milestone.id);
    const label = text(milestone.title, id);
    const stageId = nullableText(milestone.stage_id);
    const ownerId = nullableText(milestone.owner_person_id);
    const dueDate = dateKey(milestone.due_date);
    const stage = stageId ? stageById.get(stageId) : null;
    if (stageId && !stage) {
      findings.push(finding({ key: id, domain: "plan", severity: "high", title: "Milestone gắn Stage không tồn tại", detail: `Milestone "${label}" đang trỏ tới stage_id không còn trong Project.`, entityType: "project_milestone", entityId: id, entityLabel: label, expectedSource: "Project Stages", fixHint: "Chọn lại Stage hoặc bỏ liên kết Stage của Milestone.", href: "/plan" }));
    }
    if (stage && (isBefore(dueDate, dateKey(stage.start_date)) || isAfter(dueDate, dateKey(stage.end_date)))) {
      findings.push(finding({ key: `${id}:range`, domain: "plan", severity: "medium", title: "Milestone nằm ngoài khoảng Stage", detail: `Milestone "${label}" có due date ngoài Từ ngày/Đến ngày của Stage.`, entityType: "project_milestone", entityId: id, entityLabel: label, expectedSource: "Project Stages", fixHint: "Điều chỉnh due date hoặc khoảng ngày Stage.", href: "/plan" }));
    }
    if (ownerId && !activePersonById.has(ownerId)) {
      findings.push(finding({ key: `${id}:owner`, domain: "plan", severity: "medium", title: "Milestone gắn owner không active", detail: `Milestone "${label}" đang gắn owner không còn active.`, entityType: "project_milestone", entityId: id, entityLabel: label, expectedSource: "Project Team / People", fixHint: "Chọn lại owner cho Milestone.", href: "/plan" }));
    }
  }

  for (const task of tasks) {
    const id = text(task.id);
    const label = text(task.title, id);
    const stageId = nullableText(task.stage_id);
    const ownerId = nullableText(task.owner_person_id);
    const dueDate = dateKey(task.due_date);
    const stage = stageId ? stageById.get(stageId) : null;
    if (stageId && !stage) {
      findings.push(finding({ key: id, domain: "plan", severity: "high", title: "Task gắn Stage không tồn tại", detail: `Task "${label}" đang trỏ tới stage_id không còn trong Project.`, entityType: "project_plan_task", entityId: id, entityLabel: label, expectedSource: "Project Stages", fixHint: "Chọn lại Stage hoặc bỏ liên kết Stage của Task.", href: "/plan" }));
    }
    if (stage && (isBefore(dueDate, dateKey(stage.start_date)) || isAfter(dueDate, dateKey(stage.end_date)))) {
      findings.push(finding({ key: `${id}:range`, domain: "plan", severity: "medium", title: "Task nằm ngoài khoảng Stage", detail: `Task "${label}" có due date ngoài Từ ngày/Đến ngày của Stage.`, entityType: "project_plan_task", entityId: id, entityLabel: label, expectedSource: "Project Stages", fixHint: "Điều chỉnh due date task hoặc ngày Stage để timeline khớp.", href: "/plan" }));
    }
    if (ownerId && !activePersonById.has(ownerId)) {
      findings.push(finding({ key: `${id}:owner`, domain: "workload", severity: "high", title: "Task gắn nhân sự không active", detail: `Task "${label}" đang gắn owner không còn active nên Workload/Allocation bị lệch.`, entityType: "project_plan_task", entityId: id, entityLabel: label, expectedSource: "Project Team / People", fixHint: "Chọn lại owner cho task trong Kế hoạch.", href: "/plan" }));
    }
  }

  for (const person of people.filter((row) => row.person_type === "asc" && row.is_active !== false)) {
    const id = text(person.id);
    const label = text(person.full_name, id);
    const departmentId = nullableText(person.department_id);
    if (departmentId && !activeDepartments.has(departmentId)) {
      findings.push(finding({ key: id, domain: "workload", severity: "medium", title: "Nhân sự gắn phòng ban không active", detail: `Nhân sự "${label}" đang trỏ tới phòng ban không còn active.`, entityType: "person", entityId: id, entityLabel: label, expectedSource: "Danh mục phòng ban", fixHint: "Cập nhật phòng ban nhân sự trong Master Project Console.", href: "/settings/projects" }));
    }
    if (numberValue(person.capacity_hours_per_week) <= 0) {
      findings.push(finding({ key: `${id}:capacity`, domain: "workload", severity: "medium", title: "Nhân sự chưa có capacity/tuần", detail: `Nhân sự "${label}" chưa có capacity_hours_per_week hợp lệ.`, entityType: "person", entityId: id, entityLabel: label, expectedSource: "Resource Allocation Foundation", fixHint: "Nhập capacity giờ/tuần để Workload đánh giá quá tải đúng.", href: "/workload" }));
    }
    const target = numberValue(person.allocation_target_percent, 100);
    if (target <= 0 || target > 100) {
      findings.push(finding({ key: `${id}:target`, domain: "workload", severity: "low", title: "Allocation target chưa hợp lệ", detail: `Nhân sự "${label}" có allocation_target_percent=${target}.`, entityType: "person", entityId: id, entityLabel: label, expectedSource: "Resource Allocation Foundation", fixHint: "Đặt target trong khoảng 1-100%.", href: "/workload" }));
    }
  }

  const contractValue = moneyValue(project.contract_value);
  const revenueTotal = financeMonths.reduce((sum, row) => sum + moneyValue(row.revenue_amount), 0);
  const monthSeen = new Set<string>();
  for (const month of financeMonths) {
    const id = text(month.id);
    const label = dateOnly(month.month_date) ?? id;
    const key = dateOnly(month.month_date);
    if (key && monthSeen.has(key)) {
      findings.push(finding({ key: id, domain: "finance", severity: "high", title: "Finance có tháng bị trùng", detail: `Tháng ${label} xuất hiện nhiều hơn một dòng, tổng revenue có thể bị cộng sai.`, entityType: "project_financial_month", entityId: id, entityLabel: label, expectedSource: "Project Financial Months", fixHint: "Xóa hoặc gộp dòng tháng trùng trong Tài chính.", href: "/finance" }));
    }
    if (key) monthSeen.add(key);
    for (const field of ["forecast_percent", "actual_percent"] as const) {
      const percent = numberValue(month[field]);
      if (percent < 0 || percent > 100) {
        findings.push(finding({ key: `${id}:${field}`, domain: "finance", severity: "medium", title: "Finance percent nằm ngoài 0-100", detail: `${field} của tháng ${label} đang là ${percent}%.`, entityType: "project_financial_month", entityId: id, entityLabel: label, expectedSource: "Project Financial Months", fixHint: "Nhập lại forecast/actual percent trong khoảng 0-100%.", href: "/finance" }));
      }
    }
  }
  if (contractValue > 0 && revenueTotal > contractValue) {
    findings.push(finding({ key: "revenue-over-contract", domain: "finance", severity: "high", title: "Revenue vượt giá trị hợp đồng", detail: `Tổng revenue ${Math.round(revenueTotal).toLocaleString("vi-VN")} đ đang lớn hơn giá trị hợp đồng ${Math.round(contractValue).toLocaleString("vi-VN")} đ.`, entityType: "project_finance_summary", entityId: text(project.id), entityLabel: text(project.code), expectedSource: "Contract Value / Monthly Revenue", fixHint: "Rà lại revenue từng tháng hoặc giá trị hợp đồng trong hồ sơ Project.", href: "/finance" }));
  }

  const sortedFindings = sortFindings(findings);
  const critical = sortedFindings.filter((item) => item.severity === "critical").length;
  const high = sortedFindings.filter((item) => item.severity === "high").length;
  const status = statusForFindings(sortedFindings);
  const score = scoreForFindings(sortedFindings);
  const summary = status === "clean"
    ? "Dữ liệu Project đang nhất quán: danh mục và các màn nghiệp vụ cùng tham chiếu một nguồn."
    : status === "blocked"
      ? `Có ${critical} lỗi critical cần xử lý trước khi dùng số liệu để báo cáo hoặc điều phối.`
      : `Có ${sortedFindings.length} điểm cần rà lại để Plan, ISSUE, PLHĐ, Finance và Workload khớp nhau.`;

  return {
    source: "database",
    projectId,
    projectCode: text(project.code, "PROJECT"),
    generatedAt: new Date().toISOString(),
    status,
    score,
    summary,
    metrics: {
      issues: issues.length,
      modules: moduleIds.size,
      departments: activeDepartments.size,
      people: people.filter((row) => row.person_type === "asc" && row.is_active !== false).length,
      stages: stages.length,
      milestones: milestones.length,
      tasks: tasks.length,
      financialMonths: financeMonths.length,
      findings: sortedFindings.length,
      critical,
      high,
    },
    domains: domainSummaries(sortedFindings),
    findings: sortedFindings,
  };
}
