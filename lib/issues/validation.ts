export type IssueInput = {
  projectId: string;
  content: string;
  statusCode: string | null;
  customerStatusCode: string | null;
  priorityCode: string | null;
  stageCode: string | null;
  jiraUrl: string | null;
  releaseDate: string | null;
  dueDate: string | null;
  moduleId: string | null;
  departmentId: string | null;
  requesterId: string | null;
  assigneeId: string | null;
  response: string | null;
  notes: string | null;
};

export const ISSUE_FIELD_LABELS: Record<string, string> = {
  projectId: "Project",
  content: "Nội dung yêu cầu",
  statusCode: "Trạng thái",
  customerStatusCode: "Trạng thái khách hàng",
  priorityCode: "Ưu tiên",
  stageCode: "Giai đoạn",
  jiraUrl: "Link Jira",
  releaseDate: "Ngày release",
  dueDate: "Due Date",
  moduleId: "Module",
  departmentId: "Phòng ban",
  requesterId: "Nhân sự yêu cầu",
  assigneeId: "Phụ trách yêu cầu",
};

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result : null;
}

function uuidOrNull(value: unknown, field: string, errors: Record<string, string>) {
  const result = text(value);
  if (!result) return null;
  // PostgreSQL accepts UUID values in canonical 8-4-4-4-12 hexadecimal form
  // without requiring RFC version/variant bits. ASC WORKING has legacy seeded
  // Project IDs such as 00000000-0000-0000-0000-0000000000e1, so validation
  // must match PostgreSQL's accepted canonical representation instead of
  // rejecting valid database UUIDs based on version/variant nibble values.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) {
    errors[field] = `${ISSUE_FIELD_LABELS[field] ?? "Giá trị"} không hợp lệ. Vui lòng chọn lại từ danh sách.`;
    return null;
  }
  return result;
}

function dateOrNull(value: unknown, field: string, errors: Record<string, string>) {
  const result = text(value);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    errors[field] = `${ISSUE_FIELD_LABELS[field] ?? "Ngày"} không hợp lệ.`;
    return null;
  }
  return result;
}

function urlOrNull(value: unknown, errors: Record<string, string>) {
  const result = text(value);
  if (!result) return null;
  try {
    const parsed = new URL(result);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
    return result;
  } catch {
    errors.jiraUrl = "Link Jira phải là URL http/https hợp lệ.";
    return null;
  }
}

export function issueValidationMessage(errors: Record<string, string>) {
  const labels = Object.keys(errors).map((field) => ISSUE_FIELD_LABELS[field] ?? field);
  if (!labels.length) return "Dữ liệu ISSUE chưa hợp lệ.";
  return `Vui lòng kiểm tra: ${labels.join(", ")}.`;
}

export function parseIssueInput(raw: unknown, requireProject = true) {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const content = text(body.content);
  if (!content) errors.content = "Nội dung ISSUE là bắt buộc.";
  if (content && content.length > 10000) errors.content = "Nội dung ISSUE quá dài (tối đa 10.000 ký tự).";

  const projectId = uuidOrNull(body.projectId, "projectId", errors);
  if (requireProject && !projectId) errors.projectId = errors.projectId ?? "Chưa xác định Project để tạo ISSUE.";

  const statusCode = text(body.statusCode);
  const customerStatusCode = text(body.customerStatusCode);
  const priorityCode = text(body.priorityCode);
  if (!statusCode) errors.statusCode = "Vui lòng chọn Trạng thái.";
  if (!customerStatusCode) errors.customerStatusCode = "Vui lòng chọn Trạng thái khách hàng.";
  if (!priorityCode) errors.priorityCode = "Vui lòng chọn Ưu tiên.";

  const input: IssueInput = {
    projectId: projectId ?? "",
    content: content ?? "",
    statusCode,
    customerStatusCode,
    priorityCode,
    stageCode: text(body.stageCode),
    jiraUrl: urlOrNull(body.jiraUrl, errors),
    releaseDate: dateOrNull(body.releaseDate, "releaseDate", errors),
    dueDate: dateOrNull(body.dueDate, "dueDate", errors),
    moduleId: uuidOrNull(body.moduleId, "moduleId", errors),
    departmentId: uuidOrNull(body.departmentId, "departmentId", errors),
    requesterId: uuidOrNull(body.requesterId, "requesterId", errors),
    assigneeId: uuidOrNull(body.assigneeId, "assigneeId", errors),
    response: text(body.response),
    notes: text(body.notes),
  };

  return { ok: Object.keys(errors).length === 0, input, errors } as const;
}

export function parseIssuePatch(raw: unknown) {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const patch: Record<string, unknown> = {};

  if ("content" in body) {
    const value = text(body.content);
    if (!value) errors.content = "Nội dung ISSUE là bắt buộc.";
    else if (value.length > 10000) errors.content = "Nội dung ISSUE quá dài (tối đa 10.000 ký tự).";
    else patch.content = value;
  }
  if ("statusCode" in body) patch.status_code = text(body.statusCode);
  if ("customerStatusCode" in body) patch.customer_status_code = text(body.customerStatusCode);
  if ("priorityCode" in body) patch.priority_code = text(body.priorityCode);
  if ("stageCode" in body) patch.stage_code = text(body.stageCode);
  if ("jiraUrl" in body) patch.jira_url = urlOrNull(body.jiraUrl, errors);
  if ("releaseDate" in body) patch.release_date = dateOrNull(body.releaseDate, "releaseDate", errors);
  if ("dueDate" in body) patch.due_date = dateOrNull(body.dueDate, "dueDate", errors);
  if ("moduleId" in body) patch.module_id = uuidOrNull(body.moduleId, "moduleId", errors);
  if ("departmentId" in body) patch.department_id = uuidOrNull(body.departmentId, "departmentId", errors);
  if ("requesterId" in body) patch.requester_person_id = uuidOrNull(body.requesterId, "requesterId", errors);
  if ("assigneeId" in body) patch.assignee_person_id = uuidOrNull(body.assigneeId, "assigneeId", errors);
  if ("response" in body) patch.response = text(body.response);
  if ("notes" in body) patch.notes = text(body.notes);

  return { ok: Object.keys(errors).length === 0, patch, errors } as const;
}
