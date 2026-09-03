import type {
  MasterPlanInput,
  MasterPlanStatus,
  MilestoneInput,
  MilestoneStatus,
  PlanScheduleMode,
  ProjectStageStatus,
  StageInput,
} from "@/lib/planning/types";

type ParseResult<T> =
  | { ok: true; input: T }
  | { ok: false; errors: Record<string, string> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const normalized = requiredText(value);
  return normalized || null;
}

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function optionalUuid(value: unknown) {
  const normalized = nullableText(value);
  return normalized && UUID_PATTERN.test(normalized) ? normalized : normalized;
}

function parseNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function parseMasterPlanInput(value: unknown): ParseResult<MasterPlanInput> {
  const body = record(value);
  const errors: Record<string, string> = {};
  const projectId = requiredText(body.projectId);
  const title = requiredText(body.title);
  const objective = nullableText(body.objective);
  const startDate = requiredText(body.startDate);
  const targetEndDate = nullableText(body.targetEndDate);
  const scheduleMode = requiredText(body.scheduleMode) as PlanScheduleMode;
  const status = requiredText(body.status) as MasterPlanStatus;
  const notes = nullableText(body.notes);

  if (!UUID_PATTERN.test(projectId)) errors.projectId = "Project không hợp lệ.";
  if (title.length < 2 || title.length > 160) errors.title = "Tên Master Plan cần từ 2 đến 160 ký tự.";
  if (objective && objective.length > 2_000) errors.objective = "Mục tiêu tối đa 2.000 ký tự.";
  if (!validDate(startDate)) errors.startDate = "Ngày bắt đầu không hợp lệ.";
  if (targetEndDate && !validDate(targetEndDate)) errors.targetEndDate = "Ngày mục tiêu không hợp lệ.";
  if (targetEndDate && validDate(startDate) && validDate(targetEndDate) && targetEndDate < startDate) errors.targetEndDate = "Ngày mục tiêu phải từ ngày bắt đầu trở đi.";
  if (!(["calendar_days", "business_days"] as string[]).includes(scheduleMode)) errors.scheduleMode = "Cách tính ngày không hợp lệ.";
  if (!(["draft", "active", "on_hold", "completed"] as string[]).includes(status)) errors.status = "Trạng thái Master Plan không hợp lệ.";
  if (notes && notes.length > 4_000) errors.notes = "Ghi chú tối đa 4.000 ký tự.";

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, input: { projectId, title, objective, startDate, targetEndDate, scheduleMode, status, notes, recalculate: body.recalculate !== false } };
}

export function parseStageInput(value: unknown): ParseResult<StageInput> {
  const body = record(value);
  const errors: Record<string, string> = {};
  const projectId = requiredText(body.projectId);
  const code = requiredText(body.code).toUpperCase();
  const name = requiredText(body.name);
  const description = nullableText(body.description);
  const durationDays = parseNumber(body.durationDays, 0);
  const status = requiredText(body.status) as ProjectStageStatus;
  const progress = parseNumber(body.progress, status === "completed" ? 100 : 0);
  const color = requiredText(body.color).toUpperCase();
  const ownerId = optionalUuid(body.ownerId);
  const sortOrder = body.sortOrder === null || body.sortOrder === undefined || body.sortOrder === "" ? null : parseNumber(body.sortOrder, -1);

  if (!UUID_PATTERN.test(projectId)) errors.projectId = "Project không hợp lệ.";
  if (!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code)) errors.code = "Mã stage gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới; tối đa 40 ký tự.";
  if (name.length < 2 || name.length > 160) errors.name = "Tên stage cần từ 2 đến 160 ký tự.";
  if (description && description.length > 1_500) errors.description = "Mô tả tối đa 1.500 ký tự.";
  if (durationDays < 1 || durationDays > 3_650) errors.durationDays = "Số ngày phải từ 1 đến 3.650.";
  if (!(["not_started", "in_progress", "blocked", "completed"] as string[]).includes(status)) errors.status = "Trạng thái stage không hợp lệ.";
  if (progress < 0 || progress > 100) errors.progress = "Tiến độ phải từ 0 đến 100%.";
  if (!/^#[0-9A-F]{6}$/.test(color)) errors.color = "Màu stage phải ở định dạng #RRGGBB.";
  if (ownerId && !UUID_PATTERN.test(ownerId)) errors.ownerId = "Người phụ trách không hợp lệ.";
  if (sortOrder !== null && (sortOrder < 0 || sortOrder > 100_000)) errors.sortOrder = "Thứ tự stage không hợp lệ.";

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, input: { projectId, code, name, description, durationDays, status, progress: status === "completed" ? 100 : progress, color, ownerId, sortOrder, recalculate: body.recalculate !== false } };
}

export function parseMilestoneInput(value: unknown): ParseResult<MilestoneInput> {
  const body = record(value);
  const errors: Record<string, string> = {};
  const projectId = requiredText(body.projectId);
  const title = requiredText(body.title);
  const description = nullableText(body.description);
  const dueDate = requiredText(body.dueDate);
  const status = requiredText(body.status) as MilestoneStatus;
  const stageId = optionalUuid(body.stageId);
  const ownerId = optionalUuid(body.ownerId);
  const sortOrder = body.sortOrder === null || body.sortOrder === undefined || body.sortOrder === "" ? null : parseNumber(body.sortOrder, -1);

  if (!UUID_PATTERN.test(projectId)) errors.projectId = "Project không hợp lệ.";
  if (title.length < 2 || title.length > 180) errors.title = "Tên milestone cần từ 2 đến 180 ký tự.";
  if (description && description.length > 1_500) errors.description = "Mô tả tối đa 1.500 ký tự.";
  if (!validDate(dueDate)) errors.dueDate = "Ngày milestone không hợp lệ.";
  if (!(["pending", "at_risk", "completed", "missed"] as string[]).includes(status)) errors.status = "Trạng thái milestone không hợp lệ.";
  if (stageId && !UUID_PATTERN.test(stageId)) errors.stageId = "Stage liên kết không hợp lệ.";
  if (ownerId && !UUID_PATTERN.test(ownerId)) errors.ownerId = "Người phụ trách không hợp lệ.";
  if (sortOrder !== null && (sortOrder < 0 || sortOrder > 100_000)) errors.sortOrder = "Thứ tự milestone không hợp lệ.";

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, input: { projectId, title, description, dueDate, status, stageId, ownerId, sortOrder } };
}
