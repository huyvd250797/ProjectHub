import * as XLSX from "xlsx";
import type { ImportDryRunResult, ImportMessage } from "@/lib/import/types";

const EXPECTED_SHEETS = [
  ["DASHBOARD", "projects + project_stages"],
  ["PLHĐ", "contract_items"],
  ["PLHĐ - Chi tiết", "contract_detail_items"],
  ["ISSUE", "issues"],
  ["Phòng ban", "derived dashboard view"],
  ["Nhân sự trường", "departments + people"],
  ["Member", "people (ASC)"],
  ["TrangThai", "status_catalog"],
  ["Version release", "release_versions"],
  ["LinkRemoteServer", "remote_resources metadata only"],
] as const;

type SelectedProject = { id: string; code: string } | null;

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSheet(workbook: XLSX.WorkBook, expectedName: string) {
  const exactName = workbook.SheetNames.find((name) => name === expectedName);
  if (exactName) return workbook.Sheets[exactName];
  const normalized = normalizeName(expectedName);
  const matched = workbook.SheetNames.find((name) => normalizeName(name) === normalized);
  return matched ? workbook.Sheets[matched] : undefined;
}

function rowCount(sheet?: XLSX.WorkSheet) {
  if (!sheet?.["!ref"]) return 0;
  return XLSX.utils.decode_range(sheet["!ref"]).e.r + 1;
}

function cell(sheet: XLSX.WorkSheet | undefined, row: number, column: number) {
  if (!sheet) return undefined;
  return sheet[XLSX.utils.encode_cell({ r: row - 1, c: column - 1 })];
}

function scalar(value: XLSX.CellObject | undefined): string | number | boolean | null {
  if (!value) return null;
  const raw = value.v;
  if (raw === null || raw === undefined) {
    return value.l?.Target ? value.l.Target : null;
  }
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "number" && value.t === "d") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  if (["string", "number", "boolean"].includes(typeof raw)) {
    return raw as string | number | boolean;
  }
  return String(raw);
}

function text(value: XLSX.CellObject | undefined) {
  const resolved = scalar(value);
  return resolved === null ? "" : String(resolved).trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function countDuplicateNonEmpty(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + (count - 1), 0);
}

function collectRows(sheet: XLSX.WorkSheet | undefined, startRow: number, contentColumn: number) {
  if (!sheet) return [] as number[];
  const rows: number[] = [];
  const end = rowCount(sheet);
  for (let row = startRow; row <= end; row += 1) {
    if (text(cell(sheet, row, contentColumn))) rows.push(row);
  }
  return rows;
}

export function inspectProjectWorkbook(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  selectedProject: SelectedProject,
): ImportDryRunResult {
  // SheetJS accepts ArrayBuffer directly, which avoids the Buffer generic type
  // incompatibility that can happen with ExcelJS on newer Node/@types versions.
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    cellFormula: true,
    cellText: false,
  });

  const messages: ImportMessage[] = [];
  const sheets = new Map(
    EXPECTED_SHEETS.map(([name]) => [name, getSheet(workbook, name)] as const),
  );

  for (const [name] of EXPECTED_SHEETS) {
    if (!sheets.get(name)) {
      messages.push({
        severity: "error",
        code: "MISSING_SHEET",
        message: `Không tìm thấy sheet bắt buộc: ${name}`,
        sheet: name,
      });
    }
  }

  const dashboard = sheets.get("DASHBOARD");
  const issueSheet = sheets.get("ISSUE");
  const contractSheet = sheets.get("PLHĐ");
  const detailSheet = sheets.get("PLHĐ - Chi tiết");
  const peopleSheet = sheets.get("Nhân sự trường");
  const memberSheet = sheets.get("Member");
  const statusSheet = sheets.get("TrangThai");
  const releaseSheet = sheets.get("Version release");
  const resourceSheet = sheets.get("LinkRemoteServer");

  // Current EPU template uses ISSUE row 4 as the official data boundary.
  // This is a template rule, not a global Project Hub assumption; future
  // template versions can make the boundary configurable.
  const issueRows = collectRows(issueSheet, 4, 2);
  if (issueSheet && text(cell(issueSheet, 3, 2))) {
    messages.push({
      severity: "warning",
      code: "ISSUE_PRE_RANGE_ROW",
      message:
        "ISSUE dòng 3 có nội dung nhưng template hiện tại bắt đầu dữ liệu chính từ dòng 4. Dry-run không tính dòng 3; cần PM xác nhận trước khi Apply Import.",
      sheet: "ISSUE",
      row: 3,
    });
  }

  const issues = issueRows.map((row) => ({
    row,
    content: text(cell(issueSheet, row, 2)),
    status: text(cell(issueSheet, row, 3)),
    customerStatus: text(cell(issueSheet, row, 4)),
    priority: text(cell(issueSheet, row, 5)),
    stage: text(cell(issueSheet, row, 6)),
    jira: text(cell(issueSheet, row, 7)),
    releaseDate: scalar(cell(issueSheet, row, 8)),
    dueDate: scalar(cell(issueSheet, row, 9)),
    module: text(cell(issueSheet, row, 10)),
    response: text(cell(issueSheet, row, 11)),
    department: text(cell(issueSheet, row, 12)),
    requester: text(cell(issueSheet, row, 13)),
    assignee: text(cell(issueSheet, row, 14)),
    note: text(cell(issueSheet, row, 15)),
  }));

  const contractRows = collectRows(contractSheet, 3, 3);
  const contractItems = contractRows
    .map((row) => ({
      row,
      code: text(cell(contractSheet, row, 2)),
      name: text(cell(contractSheet, row, 3)),
      type: text(cell(contractSheet, row, 4)),
      department: text(cell(contractSheet, row, 11)),
      status: text(cell(contractSheet, row, 12)),
    }))
    .filter((item) => ["module", "phan he"].includes(normalizeName(item.type)));

  const modules = contractItems.filter((item) => normalizeName(item.type) === "module");
  const subsystems = contractItems.filter((item) => normalizeName(item.type) === "phan he");
  const moduleNames = new Set(modules.map((item) => normalizeName(item.name)));

  const detailRows = collectRows(detailSheet, 3, 3);
  const customerPeopleRows = collectRows(peopleSheet, 3, 3);
  const departments = peopleSheet
    ? unique(customerPeopleRows.map((row) => text(cell(peopleSheet, row, 2))))
    : [];
  const memberRows = collectRows(memberSheet, 3, 3);
  const releaseRows = collectRows(releaseSheet, 2, 2);
  const resourceRows = collectRows(resourceSheet, 3, 1);

  const issueStatuses: string[] = [];
  const customerStatuses: string[] = [];
  const moduleStatuses: string[] = [];
  const priorities: string[] = [];
  if (statusSheet) {
    for (let row = 2; row <= rowCount(statusSheet); row += 1) {
      const issueStatus = text(cell(statusSheet, row, 3));
      const customerStatus = text(cell(statusSheet, row, 7));
      const moduleStatus = text(cell(statusSheet, row, 11));
      const priority = text(cell(statusSheet, row, 14));
      if (issueStatus) issueStatuses.push(issueStatus);
      if (customerStatus) customerStatuses.push(customerStatus);
      if (moduleStatus) moduleStatuses.push(moduleStatus);
      if (priority) priorities.push(priority);
    }
  }

  const unknownIssueModules = unique(
    issues
      .filter((issue) => issue.module && !moduleNames.has(normalizeName(issue.module)))
      .map((issue) => issue.module),
  );
  const issuesMissingModule = issues.filter((issue) => !issue.module).length;
  const issuesMissingDepartment = issues.filter((issue) => !issue.department).length;
  const issuesMissingAssignee = issues.filter((issue) => !issue.assignee).length;
  const duplicateJiraLinks = countDuplicateNonEmpty(issues.map((issue) => issue.jira));

  if (issuesMissingModule) {
    messages.push({ severity: "warning", code: "ISSUE_MISSING_MODULE", message: `${issuesMissingModule} ISSUE chưa có Module.` });
  }
  if (issuesMissingDepartment) {
    messages.push({ severity: "warning", code: "ISSUE_MISSING_DEPARTMENT", message: `${issuesMissingDepartment} ISSUE chưa có Phòng ban.` });
  }
  if (issuesMissingAssignee) {
    messages.push({ severity: "warning", code: "ISSUE_MISSING_ASSIGNEE", message: `${issuesMissingAssignee} ISSUE chưa có người phụ trách.` });
  }
  if (unknownIssueModules.length) {
    messages.push({ severity: "warning", code: "UNKNOWN_MODULE", message: `${unknownIssueModules.length} tên Module trong ISSUE chưa match chính xác với PLHĐ.` });
  }
  if (duplicateJiraLinks) {
    messages.push({ severity: "warning", code: "DUPLICATE_JIRA", message: `Phát hiện ${duplicateJiraLinks} Jira link trùng lặp.` });
  }

  const sourceProject = {
    code: dashboard ? text(cell(dashboard, 7, 3)) || "EPU" : "EPU",
    organizationName: dashboard ? text(cell(dashboard, 2, 3)) : "",
    contractNo: dashboard ? text(cell(dashboard, 8, 3)) : "",
    status: dashboard ? text(cell(dashboard, 10, 3)) : "",
  };

  if (
    selectedProject?.code &&
    sourceProject.code &&
    normalizeName(selectedProject.code) !== normalizeName(sourceProject.code)
  ) {
    messages.push({
      severity: "warning",
      code: "PROJECT_MISMATCH",
      message: `Workbook nhận diện project ${sourceProject.code} nhưng project đang chọn là ${selectedProject.code}. V0.2.0 chỉ cảnh báo; Apply Import sau này phải xác nhận project đích rõ ràng.`,
    });
  }

  const sensitiveColumnsExcluded = [
    "Pass remote",
    "Password máy",
    "password",
    "password SQL",
    "token / secret",
  ];
  if (resourceSheet) {
    messages.push({
      severity: "info",
      code: "SECRETS_EXCLUDED",
      message:
        "Import POC chỉ đọc metadata của LinkRemoteServer. Password/token/secret bị loại khỏi payload và không ghi database.",
      sheet: "LinkRemoteServer",
    });
  }

  const sheetProfiles = EXPECTED_SHEETS.map(([name, mappedTo]) => {
    const sheet = sheets.get(name);
    return {
      name,
      found: Boolean(sheet),
      rows: rowCount(sheet),
      mappedTo,
      notes: name === "LinkRemoteServer" ? "Secret columns excluded" : undefined,
    };
  });

  return {
    fileName,
    fileSize: arrayBuffer.byteLength,
    selectedProject,
    sourceProject,
    canImport: messages.every((message) => message.severity !== "error"),
    sheets: sheetProfiles,
    summary: {
      issues: issues.length,
      modules: modules.length,
      subsystems: subsystems.length,
      contractDetails: detailRows.length,
      departments: departments.length,
      customerPeople: customerPeopleRows.length,
      ascMembers: memberRows.length,
      releaseVersions: releaseRows.length,
      remoteResources: resourceRows.length,
    },
    quality: {
      issuesMissingModule,
      issuesMissingDepartment,
      issuesMissingAssignee,
      unknownIssueModules: unknownIssueModules.length,
      duplicateJiraLinks,
      sensitiveColumnsExcluded,
    },
    catalogs: {
      issueStatuses: unique(issueStatuses),
      customerStatuses: unique(customerStatuses),
      moduleStatuses: unique(moduleStatuses),
      priorities: unique(priorities),
    },
    samples: {
      issues: issues.slice(0, 3).map((issue) => ({
        row: issue.row,
        content: issue.content.slice(0, 180),
        status: issue.status,
        module: issue.module,
        department: issue.department,
        assignee: issue.assignee,
      })),
      modules: modules.slice(0, 5).map((module) => ({
        row: module.row,
        code: module.code,
        name: module.name,
        department: module.department,
        status: module.status,
      })),
    },
    messages,
  };
}
