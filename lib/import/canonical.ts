import * as XLSX from "xlsx";
import type {
  CanonicalProjectPayload,
  ImportDryRunResult,
  ImportMessage,
  SheetProfile,
} from "@/lib/import/types";

export const IMPORT_TEMPLATE_VERSION = "0.9.2";

const CANONICAL_SHEETS = [
  ["PROJECT", "projects"],
  ["GIAI ĐOẠN", "project_stages"],
  ["PHÒNG BAN", "departments"],
  ["NHÂN SỰ", "people"],
  ["PLHĐ", "contract_items"],
  ["PLHĐ CHI TIẾT", "contract_detail_items"],
  ["ISSUE", "issues"],
  ["RELEASE", "release_versions"],
  ["RESOURCE", "remote_resources metadata only"],
] as const;

type SelectedProject = { id: string; code: string } | null;
type Row = Record<string, unknown>;

export function normalizeImportName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSheet(workbook: XLSX.WorkBook, name: string) {
  const normalized = normalizeImportName(name);
  const actual = workbook.SheetNames.find(
    (item) => normalizeImportName(item) === normalized,
  );
  return actual ? workbook.Sheets[actual] : undefined;
}

function rowCount(sheet?: XLSX.WorkSheet) {
  if (!sheet?.["!ref"]) return 0;
  return XLSX.utils.decode_range(sheet["!ref"]).e.r + 1;
}

function rows(sheet?: XLSX.WorkSheet): Row[] {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    defval: "",
    raw: true,
  });
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nullableString(value: unknown) {
  const resolved = stringValue(value);
  return resolved ? resolved : null;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return null;
  const parsed = numberValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeImportName(stringValue(value));
  return ["true", "1", "yes", "y", "co", "x", "sensitive"].includes(normalized);
}

function dateValue(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const raw = stringValue(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const vi = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (vi) {
    return `${vi[3]}-${vi[2].padStart(2, "0")}-${vi[1].padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function readMeta(workbook: XLSX.WorkBook) {
  const meta = rows(getSheet(workbook, "__META"));
  const map = new Map(meta.map((row) => [stringValue(row.key), stringValue(row.value)]));
  return {
    templateVersion: map.get("template_version") ?? "",
    projectId: map.get("project_id") ?? "",
    projectCode: map.get("project_code") ?? "",
  };
}

export function isCanonicalImportWorkbook(arrayBuffer: ArrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  return Boolean(getSheet(workbook, "__META") && getSheet(workbook, "PROJECT"));
}

function pushDuplicateKeyMessages(
  messages: ImportMessage[],
  sheetName: string,
  sheetRows: Row[],
) {
  const seen = new Set<string>();
  sheetRows.forEach((row, index) => {
    const key = stringValue(row.key);
    if (!key) return;
    const normalized = normalizeImportName(key);
    if (seen.has(normalized)) {
      messages.push({
        severity: "error",
        code: "DUPLICATE_IMPORT_KEY",
        sheet: sheetName,
        row: index + 2,
        message: `${sheetName}: key '${key}' bị trùng. Key phải duy nhất trong từng sheet.`,
      });
    }
    seen.add(normalized);
  });
}

function requiredKey(
  messages: ImportMessage[],
  sheet: string,
  rowIndex: number,
  row: Row,
  contentFields: string[],
) {
  const hasContent = contentFields.some((field) => stringValue(row[field]));
  const key = stringValue(row.key);
  if (hasContent && !key) {
    messages.push({
      severity: "error",
      code: "MISSING_IMPORT_KEY",
      sheet,
      row: rowIndex + 2,
      message: `${sheet}: dòng có dữ liệu nhưng chưa có key.`,
    });
  }
  return key;
}

export function parseCanonicalImportWorkbook(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  selectedProject: SelectedProject,
): { result: ImportDryRunResult; payload: CanonicalProjectPayload } {
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    cellFormula: true,
  });
  const messages: ImportMessage[] = [];
  const meta = readMeta(workbook);

  if (meta.templateVersion !== IMPORT_TEMPLATE_VERSION) {
    messages.push({
      severity: "error",
      code: "TEMPLATE_VERSION_MISMATCH",
      message: `Template version '${meta.templateVersion || "không xác định"}' không phải ${IMPORT_TEMPLATE_VERSION}. Hãy tải mẫu mới từ ASC WORKING.`,
    });
  }

  if (!selectedProject) {
    messages.push({
      severity: "error",
      code: "PROJECT_REQUIRED",
      message: "Cần chọn Project trước khi import.",
    });
  } else {
    if (meta.projectId && meta.projectId !== selectedProject.id) {
      messages.push({
        severity: "error",
        code: "PROJECT_ID_MISMATCH",
        message: `Template được tạo cho Project khác. Project trong template: ${meta.projectCode || meta.projectId}; Project đang chọn: ${selectedProject.code}.`,
      });
    }
    if (
      meta.projectCode &&
      normalizeImportName(meta.projectCode) !== normalizeImportName(selectedProject.code)
    ) {
      messages.push({
        severity: "error",
        code: "PROJECT_CODE_MISMATCH",
        message: `Mã Project trong template (${meta.projectCode}) không khớp Project đang chọn (${selectedProject.code}).`,
      });
    }
  }

  const sheetProfiles: SheetProfile[] = CANONICAL_SHEETS.map(([name, mappedTo]) => {
    const sheet = getSheet(workbook, name);
    if (!sheet) {
      messages.push({
        severity: "error",
        code: "MISSING_SHEET",
        sheet: name,
        message: `Không tìm thấy sheet bắt buộc: ${name}`,
      });
    }
    return { name, found: Boolean(sheet), rows: Math.max(0, rowCount(sheet) - 1), mappedTo };
  });

  const projectRows = rows(getSheet(workbook, "PROJECT"));
  const stageRows = rows(getSheet(workbook, "GIAI ĐOẠN"));
  const departmentRows = rows(getSheet(workbook, "PHÒNG BAN"));
  const peopleRows = rows(getSheet(workbook, "NHÂN SỰ"));
  const contractRows = rows(getSheet(workbook, "PLHĐ"));
  const detailRows = rows(getSheet(workbook, "PLHĐ CHI TIẾT"));
  const issueRows = rows(getSheet(workbook, "ISSUE"));
  const releaseRows = rows(getSheet(workbook, "RELEASE"));
  const resourceRows = rows(getSheet(workbook, "RESOURCE"));

  for (const [sheetName, data] of [
    ["GIAI ĐOẠN", stageRows],
    ["PHÒNG BAN", departmentRows],
    ["NHÂN SỰ", peopleRows],
    ["PLHĐ", contractRows],
    ["PLHĐ CHI TIẾT", detailRows],
    ["ISSUE", issueRows],
    ["RELEASE", releaseRows],
    ["RESOURCE", resourceRows],
  ] as const) {
    pushDuplicateKeyMessages(messages, sheetName, data);
  }

  const departmentKeys = new Set(
    departmentRows.map((row) => normalizeImportName(stringValue(row.key))).filter(Boolean),
  );
  const peopleKeys = new Set(
    peopleRows.map((row) => normalizeImportName(stringValue(row.key))).filter(Boolean),
  );
  const contractKeys = new Set(
    contractRows.map((row) => normalizeImportName(stringValue(row.key))).filter(Boolean),
  );

  const stages = stageRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "GIAI ĐOẠN", index, row, ["code", "name"]);
      const code = stringValue(row.code);
      const name = stringValue(row.name);
      if (importKey && (!code || !name)) {
        messages.push({ severity: "error", code: "INVALID_STAGE", sheet: "GIAI ĐOẠN", row: index + 2, message: "GIAI ĐOẠN cần code và name." });
      }
      return {
        importKey,
        code,
        name,
        startDate: dateValue(row.start_date),
        endDate: dateValue(row.end_date),
        status: nullableString(row.status),
        sortOrder: numberValue(row.sort_order),
      };
    })
    .filter((row) => row.importKey && row.code && row.name);

  const departments = departmentRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "PHÒNG BAN", index, row, ["name", "code"]);
      const name = stringValue(row.name);
      if (importKey && !name) {
        messages.push({ severity: "error", code: "INVALID_DEPARTMENT", sheet: "PHÒNG BAN", row: index + 2, message: "PHÒNG BAN cần name." });
      }
      return {
        importKey,
        code: nullableString(row.code),
        name,
        normalizedName: normalizeImportName(name),
      };
    })
    .filter((row) => row.importKey && row.name);

  const people = peopleRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "NHÂN SỰ", index, row, ["full_name", "email"]);
      const personTypeRaw = normalizeImportName(stringValue(row.person_type));
      const personType = personTypeRaw === "asc" ? "asc" : personTypeRaw === "customer" ? "customer" : null;
      const fullName = stringValue(row.full_name);
      const departmentKey = nullableString(row.department_key);
      if (importKey && (!personType || !fullName)) {
        messages.push({ severity: "error", code: "INVALID_PERSON", sheet: "NHÂN SỰ", row: index + 2, message: "NHÂN SỰ cần person_type = asc/customer và full_name." });
      }
      if (departmentKey && !departmentKeys.has(normalizeImportName(departmentKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_DEPARTMENT_KEY", sheet: "NHÂN SỰ", row: index + 2, message: `department_key '${departmentKey}' không có trong sheet PHÒNG BAN.` });
      }
      return {
        importKey,
        personType: (personType ?? "customer") as "asc" | "customer",
        departmentKey,
        fullName,
        title: nullableString(row.title),
        projectRole: nullableString(row.project_role),
        email: nullableString(row.email),
        zalo: nullableString(row.zalo),
        moduleNotes: nullableString(row.module_notes),
      };
    })
    .filter((row) => row.importKey && row.fullName);

  const itemTypes = new Set(["root", "subsystem", "module", "other"]);
  const contractItems = contractRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "PLHĐ", index, row, ["name", "code"]);
      const name = stringValue(row.name);
      const itemTypeRaw = normalizeImportName(stringValue(row.item_type)) || "module";
      const itemType = itemTypes.has(itemTypeRaw) ? itemTypeRaw : "other";
      const parentKey = nullableString(row.parent_key);
      const departmentKey = nullableString(row.department_key);
      if (parentKey && !contractKeys.has(normalizeImportName(parentKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_CONTRACT_PARENT", sheet: "PLHĐ", row: index + 2, message: `parent_key '${parentKey}' không có trong PLHĐ.` });
      }
      if (departmentKey && !departmentKeys.has(normalizeImportName(departmentKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_DEPARTMENT_KEY", sheet: "PLHĐ", row: index + 2, message: `department_key '${departmentKey}' không có trong PHÒNG BAN.` });
      }
      return {
        importKey,
        parentKey,
        code: nullableString(row.code),
        name,
        itemType: itemType as "root" | "subsystem" | "module" | "other",
        departmentKey,
        moduleStatusCode: nullableString(row.module_status_code),
        classification: nullableString(row.classification),
        sortOrder: numberValue(row.sort_order),
      };
    })
    .filter((row) => row.importKey && row.name);

  const detailKeys = new Set(
    detailRows.map((row) => normalizeImportName(stringValue(row.key))).filter(Boolean),
  );
  const contractDetails = detailRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "PLHĐ CHI TIẾT", index, row, ["content", "code"]);
      const parentKey = nullableString(row.parent_key);
      const contractItemKey = nullableString(row.contract_item_key);
      const content = stringValue(row.content);
      if (parentKey && !detailKeys.has(normalizeImportName(parentKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_DETAIL_PARENT", sheet: "PLHĐ CHI TIẾT", row: index + 2, message: `parent_key '${parentKey}' không có trong PLHĐ CHI TIẾT.` });
      }
      if (contractItemKey && !contractKeys.has(normalizeImportName(contractItemKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_CONTRACT_KEY", sheet: "PLHĐ CHI TIẾT", row: index + 2, message: `contract_item_key '${contractItemKey}' không có trong PLHĐ.` });
      }
      if (importKey && !content) {
        messages.push({ severity: "error", code: "INVALID_CONTRACT_DETAIL", sheet: "PLHĐ CHI TIẾT", row: index + 2, message: "PLHĐ CHI TIẾT cần content." });
      }
      return {
        importKey,
        parentKey,
        contractItemKey,
        code: nullableString(row.code),
        content,
        nodeType: nullableString(row.node_type),
        level: numberValue(row.level),
        sortOrder: numberValue(row.sort_order),
        note: nullableString(row.note),
      };
    })
    .filter((row) => row.importKey && row.content);

  const releases = releaseRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "RELEASE", index, row, ["release_date", "label"]);
      const releaseDate = dateValue(row.release_date);
      if (importKey && !releaseDate) {
        messages.push({ severity: "error", code: "INVALID_RELEASE_DATE", sheet: "RELEASE", row: index + 2, message: "RELEASE cần release_date hợp lệ." });
      }
      return {
        importKey,
        sequenceNo: nullableNumber(row.sequence_no),
        releaseDate: releaseDate ?? "",
        label: nullableString(row.label),
      };
    })
    .filter((row) => row.importKey && row.releaseDate);

  const issues = issueRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "ISSUE", index, row, ["content", "jira_url"]);
      const content = stringValue(row.content);
      const moduleKey = nullableString(row.module_key);
      const departmentKey = nullableString(row.department_key);
      const requesterKey = nullableString(row.requester_key);
      const assigneeKey = nullableString(row.assignee_key);
      if (importKey && !content) {
        messages.push({ severity: "error", code: "INVALID_ISSUE", sheet: "ISSUE", row: index + 2, message: "ISSUE cần content." });
      }
      if (moduleKey && !contractKeys.has(normalizeImportName(moduleKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_MODULE_KEY", sheet: "ISSUE", row: index + 2, message: `module_key '${moduleKey}' không có trong PLHĐ.` });
      }
      if (departmentKey && !departmentKeys.has(normalizeImportName(departmentKey))) {
        messages.push({ severity: "error", code: "UNKNOWN_DEPARTMENT_KEY", sheet: "ISSUE", row: index + 2, message: `department_key '${departmentKey}' không có trong PHÒNG BAN.` });
      }
      for (const [field, key] of [["requester_key", requesterKey], ["assignee_key", assigneeKey]] as const) {
        if (key && !peopleKeys.has(normalizeImportName(key))) {
          messages.push({ severity: "error", code: "UNKNOWN_PERSON_KEY", sheet: "ISSUE", row: index + 2, message: `${field} '${key}' không có trong NHÂN SỰ.` });
        }
      }
      return {
        importKey,
        content,
        statusCode: nullableString(row.status_code),
        customerStatusCode: nullableString(row.customer_status_code),
        priorityCode: nullableString(row.priority_code),
        stageCode: nullableString(row.stage_code),
        jiraUrl: nullableString(row.jira_url),
        releaseDate: dateValue(row.release_date),
        dueDate: dateValue(row.due_date),
        moduleKey,
        response: nullableString(row.response),
        departmentKey,
        requesterKey,
        assigneeKey,
        notes: nullableString(row.notes),
      };
    })
    .filter((row) => row.importKey && row.content);

  const remoteResources = resourceRows
    .map((row, index) => {
      const importKey = requiredKey(messages, "RESOURCE", index, row, ["name", "url_or_host"]);
      const name = stringValue(row.name);
      if (importKey && !name) {
        messages.push({ severity: "error", code: "INVALID_RESOURCE", sheet: "RESOURCE", row: index + 2, message: "RESOURCE cần name." });
      }
      return {
        importKey,
        name,
        resourceType: stringValue(row.resource_type) || "other",
        environment: nullableString(row.environment),
        urlOrHost: nullableString(row.url_or_host),
        remoteAddress: nullableString(row.remote_address),
        username: nullableString(row.username),
        notes: nullableString(row.notes),
        isSensitive: booleanValue(row.is_sensitive),
      };
    })
    .filter((row) => row.importKey && row.name);

  const projectRow = projectRows[0];
  const projectStatusRaw = normalizeImportName(stringValue(projectRow?.status) || "active");
  const projectStatus = ["active", "paused", "completed", "archived"].includes(projectStatusRaw)
    ? projectStatusRaw as "active" | "paused" | "completed" | "archived"
    : "active";
  const project = projectRow
    ? {
        name: stringValue(projectRow.project_name),
        organizationName: nullableString(projectRow.organization_name),
        contractNo: nullableString(projectRow.contract_no),
        contractValue: nullableNumber(projectRow.contract_value),
        contractDate: dateValue(projectRow.contract_date),
        startDate: dateValue(projectRow.start_date),
        dueDate: dateValue(projectRow.due_date),
        status: projectStatus,
      }
    : null;

  const sensitiveHeaders = Object.keys(resourceRows[0] ?? {}).filter((header) =>
    /password|secret|token|pass/i.test(header),
  );
  if (sensitiveHeaders.length) {
    messages.push({
      severity: "error",
      code: "SENSITIVE_COLUMN_NOT_ALLOWED",
      sheet: "RESOURCE",
      message: `RESOURCE không được chứa password/token/secret. Hãy nhập credential bằng Resource Vault sau import.`,
    });
  }

  const jiraLinks = issues.map((issue) => issue.jiraUrl).filter(Boolean) as string[];
  const jiraSet = new Set<string>();
  let duplicateJiraLinks = 0;
  for (const jira of jiraLinks) {
    const normalized = normalizeImportName(jira);
    if (jiraSet.has(normalized)) duplicateJiraLinks += 1;
    jiraSet.add(normalized);
  }

  const issuesMissingModule = issues.filter((issue) => !issue.moduleKey).length;
  const issuesMissingDepartment = issues.filter((issue) => !issue.departmentKey).length;
  const issuesMissingAssignee = issues.filter((issue) => !issue.assigneeKey).length;
  if (issuesMissingModule) messages.push({ severity: "warning", code: "ISSUE_MISSING_MODULE", message: `${issuesMissingModule} ISSUE chưa có module_key.` });
  if (issuesMissingDepartment) messages.push({ severity: "warning", code: "ISSUE_MISSING_DEPARTMENT", message: `${issuesMissingDepartment} ISSUE chưa có department_key.` });
  if (issuesMissingAssignee) messages.push({ severity: "warning", code: "ISSUE_MISSING_ASSIGNEE", message: `${issuesMissingAssignee} ISSUE chưa có assignee_key.` });
  if (duplicateJiraLinks) messages.push({ severity: "warning", code: "DUPLICATE_JIRA", message: `${duplicateJiraLinks} Jira URL bị trùng trong file.` });
  messages.push({ severity: "info", code: "SECRETS_EXCLUDED", sheet: "RESOURCE", message: "Template V0.9.2 không có cột password/token/secret. Credential phải nhập riêng qua Resource Vault để được mã hóa." });

  const payload: CanonicalProjectPayload = {
    projectId: selectedProject?.id ?? meta.projectId,
    projectCode: selectedProject?.code ?? meta.projectCode,
    templateVersion: meta.templateVersion,
    project,
    stages,
    departments,
    people,
    contractItems,
    contractDetails,
    releaseVersions: releases,
    issues,
    remoteResources,
  };

  const result: ImportDryRunResult = {
    fileName,
    fileSize: arrayBuffer.byteLength,
    format: "canonical_v092",
    templateVersion: meta.templateVersion,
    canApply: false,
    preview: null,
    selectedProject,
    sourceProject: {
      code: meta.projectCode,
      organizationName: project?.organizationName ?? "",
      contractNo: project?.contractNo ?? "",
      status: project?.status ?? "active",
    },
    canImport: messages.every((message) => message.severity !== "error"),
    sheets: sheetProfiles,
    summary: {
      issues: issues.length,
      modules: contractItems.filter((item) => item.itemType === "module").length,
      subsystems: contractItems.filter((item) => item.itemType === "subsystem").length,
      contractDetails: contractDetails.length,
      departments: departments.length,
      customerPeople: people.filter((person) => person.personType === "customer").length,
      ascMembers: people.filter((person) => person.personType === "asc").length,
      releaseVersions: releases.length,
      remoteResources: remoteResources.length,
      stages: stages.length,
    },
    quality: {
      issuesMissingModule,
      issuesMissingDepartment,
      issuesMissingAssignee,
      unknownIssueModules: 0,
      duplicateJiraLinks,
      sensitiveColumnsExcluded: ["password", "secret", "token"],
    },
    catalogs: {
      issueStatuses: [],
      customerStatuses: [],
      moduleStatuses: [],
      priorities: [],
    },
    samples: {
      issues: issues.slice(0, 3).map((issue) => ({ key: issue.importKey, content: issue.content, status: issue.statusCode, module: issue.moduleKey, department: issue.departmentKey, assignee: issue.assigneeKey })),
      modules: contractItems.filter((item) => item.itemType === "module").slice(0, 5).map((item) => ({ key: item.importKey, code: item.code, name: item.name, department: item.departmentKey, status: item.moduleStatusCode })),
    },
    messages,
  };

  return { result, payload };
}
