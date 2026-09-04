import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPlanSummary, buildSmartPlanAlerts, countScheduleDays } from "@/lib/planning/schedule";
import type {
  MasterPlan,
  MasterPlanStatus,
  MilestoneChecklistItem,
  MilestoneStatus,
  PlanReminderEntityType,
  PlanReminderStatus,
  PlanTaskPriority,
  PlanTaskStatus,
  PlanScheduleMode,
  ProjectMilestone,
  ProjectPlanData,
  ProjectPlanReminder,
  ProjectPlanTask,
  ProjectPlanStage,
  ProjectStageStatus,
  StageInput,
} from "@/lib/planning/types";
import type { ProjectRole } from "@/lib/issues/types";

function nullableText(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function relation(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value as Record<string, unknown>;
}

function masterStatus(value: unknown): MasterPlanStatus {
  return value === "active" || value === "on_hold" || value === "completed" ? value : "draft";
}

function scheduleMode(value: unknown): PlanScheduleMode {
  return value === "business_days" ? "business_days" : "calendar_days";
}

function stageStatus(value: unknown): ProjectStageStatus {
  return value === "in_progress" || value === "blocked" || value === "completed" ? value : "not_started";
}

function stageDateMode(value: unknown): ProjectPlanStage["dateMode"] {
  return value === "manual" ? "manual" : "auto";
}

function milestoneStatus(value: unknown): MilestoneStatus {
  return value === "at_risk" || value === "completed" || value === "missed" ? value : "pending";
}

function taskStatus(value: unknown): PlanTaskStatus {
  return value === "doing" || value === "blocked" || value === "done" ? value : "todo";
}

function taskPriority(value: unknown): PlanTaskPriority {
  return value === "low" || value === "high" || value === "critical" ? value : "medium";
}

function reminderEntityType(value: unknown): PlanReminderEntityType {
  return value === "stage" || value === "milestone" || value === "task" || value === "issue" ? value : "manual";
}

function reminderStatus(value: unknown): PlanReminderStatus {
  return value === "snoozed" || value === "done" || value === "cancelled" ? value : "open";
}

export function normalizeMasterPlan(raw: Record<string, unknown>): MasterPlan {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Master Plan"),
    objective: nullableText(raw.objective),
    startDate: String(raw.start_date ?? ""),
    targetEndDate: nullableText(raw.target_end_date),
    scheduleMode: scheduleMode(raw.schedule_mode),
    status: masterStatus(raw.status),
    notes: nullableText(raw.notes),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export function normalizePlanStage(raw: Record<string, unknown>): ProjectPlanStage {
  const owner = relation(raw.owner);
  return {
    id: String(raw.id ?? ""),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    description: nullableText(raw.description),
    durationDays: Math.max(1, numberValue(raw.duration_days, 1)),
    dateMode: stageDateMode(raw.date_mode),
    startDate: nullableText(raw.start_date),
    endDate: nullableText(raw.end_date),
    status: stageStatus(raw.status),
    progress: Math.max(0, Math.min(100, numberValue(raw.progress))),
    color: /^#[0-9A-F]{6}$/i.test(String(raw.color ?? "")) ? String(raw.color).toUpperCase() : "#22D3EE",
    ownerId: nullableText(raw.owner_person_id),
    ownerName: nullableText(owner?.full_name),
    sortOrder: numberValue(raw.sort_order),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export function normalizeMilestone(raw: Record<string, unknown>): ProjectMilestone {
  const stage = relation(raw.stage);
  const owner = relation(raw.owner);
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: nullableText(raw.description),
    dueDate: String(raw.due_date ?? ""),
    status: milestoneStatus(raw.status),
    stageId: nullableText(raw.stage_id),
    stageName: nullableText(stage?.name),
    ownerId: nullableText(raw.owner_person_id),
    ownerName: nullableText(owner?.full_name),
    sortOrder: numberValue(raw.sort_order),
    completedAt: nullableText(raw.completed_at),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export function normalizePlanTask(raw: Record<string, unknown>): ProjectPlanTask {
  const stage = relation(raw.stage);
  const owner = relation(raw.owner);
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: nullableText(raw.description),
    stageId: nullableText(raw.stage_id),
    stageName: nullableText(stage?.name),
    status: taskStatus(raw.status),
    priority: taskPriority(raw.priority),
    dueDate: nullableText(raw.due_date),
    completedAt: nullableText(raw.completed_at),
    ownerId: nullableText(raw.owner_person_id),
    ownerName: nullableText(owner?.full_name),
    sortOrder: numberValue(raw.sort_order),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export function normalizeChecklistItem(raw: Record<string, unknown>): MilestoneChecklistItem {
  const milestone = relation(raw.milestone);
  return {
    id: String(raw.id ?? ""),
    milestoneId: String(raw.milestone_id ?? ""),
    milestoneTitle: nullableText(milestone?.title),
    title: String(raw.title ?? ""),
    isDone: Boolean(raw.is_done),
    sortOrder: numberValue(raw.sort_order),
    completedAt: nullableText(raw.completed_at),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export function normalizePlanReminder(raw: Record<string, unknown>): ProjectPlanReminder {
  const owner = relation(raw.owner);
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: nullableText(raw.description),
    entityType: reminderEntityType(raw.entity_type),
    entityId: nullableText(raw.entity_id),
    entityTitle: nullableText(raw.entity_title),
    remindAt: String(raw.remind_at ?? ""),
    status: reminderStatus(raw.status),
    priority: taskPriority(raw.priority),
    snoozedUntil: nullableText(raw.snoozed_until),
    completedAt: nullableText(raw.completed_at),
    ownerId: nullableText(raw.owner_person_id),
    ownerName: nullableText(owner?.full_name),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export function isPlanningMigrationMissing(message: string) {
  return /project_master_plans|project_milestones|project_plan_tasks|project_milestone_checklist_items|project_plan_reminders|duration_days|owner_person_id|date_mode|recalculate_project_plan_v16[01]|schema cache|does not exist/i.test(message);
}

export async function loadProjectPlan(
  supabase: SupabaseClient,
  projectId: string,
  role: ProjectRole,
): Promise<ProjectPlanData> {
  const [projectResult, masterResult, stageResult, milestoneResult, taskResult, checklistResult, reminderResult, peopleResult] = await Promise.all([
    supabase.from("projects").select("code").eq("id", projectId).maybeSingle(),
    supabase
      .from("project_master_plans")
      .select("id,title,objective,start_date,target_end_date,schedule_mode,status,notes,created_at,updated_at")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_stages")
      .select("id,code,name,description,duration_days,date_mode,start_date,end_date,status,progress,color,owner_person_id,sort_order,created_at,updated_at,owner:people!project_stages_owner_person_id_fkey(id,full_name)")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true }),
    supabase
      .from("project_milestones")
      .select("id,title,description,due_date,status,stage_id,owner_person_id,sort_order,completed_at,created_at,updated_at,stage:project_stages!project_milestones_stage_id_fkey(id,name),owner:people!project_milestones_owner_person_id_fkey(id,full_name)")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_plan_tasks")
      .select("id,title,description,stage_id,status,priority,due_date,completed_at,owner_person_id,sort_order,created_at,updated_at,stage:project_stages!project_plan_tasks_stage_id_fkey(id,name),owner:people!project_plan_tasks_owner_person_id_fkey(id,full_name)")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_milestone_checklist_items")
      .select("id,milestone_id,title,is_done,sort_order,completed_at,created_at,updated_at,milestone:project_milestones!project_milestone_checklist_items_milestone_id_fkey(id,title)")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("project_plan_reminders")
      .select("id,title,description,entity_type,entity_id,entity_title,remind_at,status,priority,snoozed_until,completed_at,owner_person_id,created_at,updated_at,owner:people!project_plan_reminders_owner_person_id_fkey(id,full_name)")
      .eq("project_id", projectId)
      .order("remind_at", { ascending: true }),
    supabase
      .from("people")
      .select("id,full_name,title,project_role,email")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
  ]);

  const failure = [projectResult, masterResult, stageResult, milestoneResult, taskResult, checklistResult, reminderResult, peopleResult].find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  if (!projectResult.data) throw new Error("Project không tồn tại hoặc bạn không có quyền truy cập.");

  const masterPlan = masterResult.data ? normalizeMasterPlan(masterResult.data as unknown as Record<string, unknown>) : null;
  const stages = ((stageResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizePlanStage);
  const milestones = ((milestoneResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizeMilestone);
  const tasks = ((taskResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizePlanTask);
  const checklistItems = ((checklistResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizeChecklistItem);
  const reminders = ((reminderResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizePlanReminder);
  const smartAlerts = buildSmartPlanAlerts(stages, milestones, tasks, reminders);

  return {
    source: "database",
    projectId,
    projectCode: String(projectResult.data.code ?? ""),
    role,
    canEdit: role === "admin" || role === "pm",
    masterPlan,
    stages,
    milestones,
    tasks,
    checklistItems,
    reminders,
    smartAlerts,
    people: ((peopleResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((person) => ({
      value: String(person.id),
      label: String(person.full_name ?? "Thành viên"),
      description: [person.title, person.project_role ? String(person.project_role).toUpperCase() : null, person.email]
        .filter(Boolean)
        .map(String)
        .join(" • ") || null,
    })),
    summary: buildPlanSummary(masterPlan, stages, milestones, tasks, checklistItems, reminders, undefined, smartAlerts),
    generatedAt: new Date().toISOString(),
  };
}

export async function nextPlanningSortOrder(
  supabase: SupabaseClient,
  table: "project_stages" | "project_milestones",
  projectId: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return numberValue(data?.sort_order) + 10;
}

export async function nextPlanTaskSortOrder(supabase: SupabaseClient, projectId: string, stageId: string | null) {
  let query = supabase
    .from("project_plan_tasks")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  query = stageId ? query.eq("stage_id", stageId) : query.is("stage_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return numberValue(data?.sort_order) + 10;
}

export async function nextChecklistSortOrder(supabase: SupabaseClient, projectId: string, milestoneId: string) {
  const { data, error } = await supabase
    .from("project_milestone_checklist_items")
    .select("sort_order")
    .eq("project_id", projectId)
    .eq("milestone_id", milestoneId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return numberValue(data?.sort_order) + 10;
}

export async function planningOwnerExists(supabase: SupabaseClient, projectId: string, ownerId: string | null) {
  if (!ownerId) return true;
  const { data } = await supabase
    .from("people")
    .select("id")
    .eq("id", ownerId)
    .eq("project_id", projectId)
    .eq("person_type", "asc")
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

export async function planningStageExists(supabase: SupabaseClient, projectId: string, stageId: string | null) {
  if (!stageId) return true;
  const { data } = await supabase
    .from("project_stages")
    .select("id")
    .eq("id", stageId)
    .eq("project_id", projectId)
    .maybeSingle();
  return Boolean(data);
}

export async function planningMilestoneExists(supabase: SupabaseClient, projectId: string, milestoneId: string | null) {
  if (!milestoneId) return false;
  const { data } = await supabase
    .from("project_milestones")
    .select("id")
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .maybeSingle();
  return Boolean(data);
}

export async function planningIssueExists(supabase: SupabaseClient, projectId: string, issueId: string | null) {
  if (!issueId) return false;
  const { data } = await supabase
    .from("issues")
    .select("id")
    .eq("id", issueId)
    .eq("project_id", projectId)
    .maybeSingle();
  return Boolean(data);
}

export async function planningEntityExists(
  supabase: SupabaseClient,
  projectId: string,
  entityType: PlanReminderEntityType,
  entityId: string | null,
) {
  if (entityType === "manual") return entityId === null;
  if (!entityId) return false;
  if (entityType === "stage") return planningStageExists(supabase, projectId, entityId);
  if (entityType === "milestone") return planningMilestoneExists(supabase, projectId, entityId);
  if (entityType === "task") {
    const { data } = await supabase
      .from("project_plan_tasks")
      .select("id")
      .eq("id", entityId)
      .eq("project_id", projectId)
      .maybeSingle();
    return Boolean(data);
  }
  return planningIssueExists(supabase, projectId, entityId);
}

export async function planningScheduleMode(supabase: SupabaseClient, projectId: string): Promise<PlanScheduleMode> {
  const { data, error } = await supabase
    .from("project_master_plans")
    .select("schedule_mode")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.schedule_mode === "business_days" ? "business_days" : "calendar_days";
}

export async function resolveStageDuration(supabase: SupabaseClient, input: StageInput) {
  if (input.dateMode !== "manual" || !input.startDate || !input.endDate) return input.durationDays;
  const mode = await planningScheduleMode(supabase, input.projectId);
  return countScheduleDays(input.startDate, input.endDate, mode);
}

export async function recalculateProjectPlan(supabase: SupabaseClient, projectId: string) {
  const { error } = await supabase.rpc("recalculate_project_plan_v161", { p_project_id: projectId });
  if (error) throw new Error(error.message);
}
