import "server-only";
import ExcelJS from "exceljs";
import type { CellValue, Worksheet } from "exceljs";
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

function scalar(value: CellValue): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (["string", "number", "boolean"].includes(typeof value)) {
    return value as string | number | boolean;
  }

  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) {
      return scalar(value.result as CellValue);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return typeof value.text === "string" ? value.text : value.hyperlink;
    }
  }

  return String(value);
}

function text(value: CellValue) {
  const resolved = scalar(value);
  return resolved === null ? "" : String(resolved).trim();
}

function findSheet(workbook: ExcelJS.Workbook, expectedName: string) {
  const exact = workbook.getWorksheet(expectedName);
  if (exact) return exact;
  const target = normalizeName(expectedName);
  return workbook.worksheets.find((sheet) => normalizeName(sheet.name) === target);
}

function unique(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function countDuplicateNonEmpty(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
}

function collectRows(sheet: Worksheet, startRow: number, contentColumn: number) {
  const rows: number[] = [];
  for (let row = startRow; row <= sheet.actualRowCount; row += 1) {
    if (text(sheet.getCell(row, contentColumn).value)) rows.push(row);
  }
  return rows;
}

export async function inspectAscWorkingWorkbook(
  buffer: Buffer,
  fileName: string,
): Promise<ImportDryRunResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const messages: ImportMessage[] = [];
  const sheetMap = new Map(EXPECTED_SHEETS.map(([name]) => [name, findSheet(workbook, name)]));

  for (const [name] of EXPECTED_SHEETS) {
    if (!sheetMap.get(name)) {
      messages.push({ severity: "error", code: "MISSING_SHEET", message: `Không tìm thấy sheet bắt buộc: ${name}`, sheet: name });
    }
  }

  const dashboard = sheetMap.get("DASHBOARD");
  const issueSheet = sheetMap.get("ISSUE");
  const contractSheet = sheetMap.get("PLHĐ");
  const detailSheet = sheetMap.get("PLHĐ - Chi tiết");
  const peopleSheet = sheetMap.get("Nhân sự trường");
  const memberSheet = sheetMap.get("Member");
  const statusSheet = sheetMap.get("TrangThai");
  const releaseSheet = sheetMap.get("Version release");
  const resourceSheet = sheetMap.get("LinkRemoteServer");

  // The current EPU workbook treats ISSUE row 4 as the official data boundary
  // (Dashboard/PLHĐ/Phòng ban formulas also start from row 4). Row 3 is checked
  // separately so no hidden pre-range data is silently ignored.
  const issueRows = issueSheet ? collectRows(issueSheet, 4, 2) : [];
  if (issueSheet && text(issueSheet.getCell(3, 2).value)) {
    messages.push({
      severity: "warning",
      code: "ISSUE_PRE_RANGE_ROW",
      message: "ISSUE dòng 3 có nội dung nhưng các công thức nghiệp vụ hiện tại bắt đầu từ dòng 4. Dry-run không tính dòng 3 vào 313 ISSUE chính; cần PM xác nhận trước khi Apply Import.",
      sheet: "ISSUE",
      row: 3,
    });
  }
  const issues = issueRows.map((row) => ({
    row,
    content: text(issueSheet!.getCell(row, 2).value),
    status: text(issueSheet!.getCell(row, 3).value),
    customerStatus: text(issueSheet!.getCell(row, 4).value),
    priority: text(issueSheet!.getCell(row, 5).value),
    stage: text(issueSheet!.getCell(row, 6).value),
    jira: text(issueSheet!.getCell(row, 7).value),
    releaseDate: scalar(issueSheet!.getCell(row, 8).value),
    dueDate: scalar(issueSheet!.getCell(row, 9).value),
    module: text(issueSheet!.getCell(row, 10).value),
    response: text(issueSheet!.getCell(row, 11).value),
    department: text(issueSheet!.getCell(row, 12).value),
    requester: text(issueSheet!.getCell(row, 13).value),
    assignee: text(issueSheet!.getCell(row, 14).value),
    note: text(issueSheet!.getCell(row, 15).value),
  }));

  const contractRows = contractSheet ? collectRows(contractSheet, 3, 3) : [];
  const contractItems = contractRows
    .map((row) => ({
      row,
      code: text(contractSheet!.getCell(row, 2).value),
      name: text(contractSheet!.getCell(row, 3).value),
      type: text(contractSheet!.getCell(row, 4).value),
      department: text(contractSheet!.getCell(row, 11).value),
      status: text(contractSheet!.getCell(row, 12).value),
    }))
    .filter((item) => ["module", "phan he", "phân hệ"].includes(normalizeName(item.type)));

  const modules = contractItems.filter((item) => normalizeName(item.type) === "module");
  const subsystems = contractItems.filter((item) => normalizeName(item.type) === "phan he");
  const moduleNames = new Set(modules.map((item) => normalizeName(item.name)));

  const detailRows = detailSheet ? collectRows(detailSheet, 3, 3) : [];
  const customerPeopleRows = peopleSheet ? collectRows(peopleSheet, 3, 3) : [];
  const departments = peopleSheet
    ? unique(customerPeopleRows.map((row) => text(peopleSheet.getCell(row, 2).value)))
    : [];
  const memberRows = memberSheet ? collectRows(memberSheet, 3, 3) : [];
  const releaseRows = releaseSheet ? collectRows(releaseSheet, 2, 2) : [];
  const resourceRows = resourceSheet ? collectRows(resourceSheet, 3, 1) : [];

  const issueStatuses: string[] = [];
  const customerStatuses: string[] = [];
  const moduleStatuses: string[] = [];
  const priorities: string[] = [];
  if (statusSheet) {
    for (let row = 2; row <= statusSheet.actualRowCount; row += 1) {
      const a = text(statusSheet.getCell(row, 3).value);
      const b = text(statusSheet.getCell(row, 7).value);
      const c = text(statusSheet.getCell(row, 11).value);
      const d = text(statusSheet.getCell(row, 14).value);
      if (a) issueStatuses.push(a);
      if (b) customerStatuses.push(b);
      if (c) moduleStatuses.push(c);
      if (d) priorities.push(d);
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
  if (unknownIssueModules.length) {
    messages.push({ severity: "warning", code: "UNKNOWN_MODULE", message: `${unknownIssueModules.length} tên Module trong ISSUE chưa match chính xác với PLHĐ.` });
  }
  if (duplicateJiraLinks) {
    messages.push({ severity: "warning", code: "DUPLICATE_JIRA", message: `Phát hiện ${duplicateJiraLinks} Jira link trùng lặp.` });
  }

  const sensitiveColumnsExcluded = ["Pass remote", "Password máy", "password", "password SQL"];
  if (resourceSheet) {
    messages.push({
      severity: "info",
      code: "SECRETS_EXCLUDED",
      message: "Import POC chỉ đọc metadata của LinkRemoteServer; các cột password/secret bị loại khỏi payload và không ghi database.",
      sheet: "LinkRemoteServer",
    });
  }

  const sheets = EXPECTED_SHEETS.map(([name, mappedTo]) => {
    const sheet = sheetMap.get(name);
    return {
      name,
      found: Boolean(sheet),
      rows: sheet?.actualRowCount ?? 0,
      mappedTo,
      notes: name === "LinkRemoteServer" ? "Secret columns excluded" : undefined,
    };
  });

  const sourceProject = {
    code: dashboard ? text(dashboard.getCell("C7").value) || "EPU" : "EPU",
    organizationName: dashboard ? text(dashboard.getCell("C2").value) : "",
    contractNo: dashboard ? text(dashboard.getCell("C8").value) : "",
    status: dashboard ? text(dashboard.getCell("C10").value) : "",
  };

  const canImport = messages.every((message) => message.severity !== "error");

  return {
    fileName,
    fileSize: buffer.byteLength,
    sourceProject,
    canImport,
    sheets,
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
