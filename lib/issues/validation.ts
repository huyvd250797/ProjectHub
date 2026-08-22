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

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result : null;
}

function uuidOrNull(value: unknown, field: string, errors: Record<string, string>) {
  const result = text(value);
  if (!result) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    errors[field] = "Giá trị không hợp lệ.";
    return null;
  }
  return result;
}

function dateOrNull(value: unknown, field: string, errors: Record<string, string>) {
  const result = text(value);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    errors[field] = "Ngày không hợp lệ.";
    return null;
  }
  return result;
}

function urlOrNull(value: unknown, errors: Record<string, string>) {
  const result = text(value);
  if (!result) return null;
  try {
    const parsed = new URL(result);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    return result;
  } catch {
    errors.jiraUrl = "Link Jira phải là URL http/https hợp lệ.";
    return null;
  }
}

export function parseIssueInput(raw: unknown, requireProject = true) {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const content = text(body.content);
  if (!content) errors.content = "Nội dung ISSUE là bắt buộc.";
  if (content && content.length > 10000) errors.content = "Nội dung ISSUE quá dài.";

  const projectId = uuidOrNull(body.projectId, "projectId", errors);
  if (requireProject && !projectId) errors.projectId = errors.projectId ?? "Thiếu project.";

  const input: IssueInput = {
    projectId: projectId ?? "",
    content: content ?? "",
    statusCode: text(body.statusCode),
    customerStatusCode: text(body.customerStatusCode),
    priorityCode: text(body.priorityCode),
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
