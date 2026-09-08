import type { SupabaseClient } from "@supabase/supabase-js";
import { ISSUE_SELECT, normalizeIssue } from "@/lib/issues/server";
import type { IssueRow, ProjectRole } from "@/lib/issues/types";
import { loadProjectPlan } from "@/lib/planning/server";
import type { ProjectPlanTask } from "@/lib/planning/types";
import type {
  ResourceScheduleData,
  ResourceScheduleItem,
  ResourceScheduleLevel,
  ResourceScheduleMember,
  ResourceScheduleMemberWeek,
  ResourceScheduleWeek,
  ResourceScheduleWorkType,
} from "@/lib/resource-scheduling/types";

const CLOSED_ISSUE_STATUSES = ["resolved", "released", "no_action", "not_feasible"];
const CLOSED_TASK_STATUSES = ["done"];
const WEEK_DAYS = 7;
const WEEK_COUNT = 6;
const DEFAULT_CAPACITY_HOURS_PER_WEEK = 40;
const DEFAULT_ALLOCATION_TARGET_PERCENT = 100;

export const RESOURCE_SCHEDULING_SOURCE_TABLES = [
  "people.capacity_hours_per_week",
  "people.allocation_target_percent",
  "issues.estimated_hours",
  "issues.assignee_person_id",
  "project_plan_tasks.estimated_hours",
  "project_plan_tasks.owner_person_id",
];

function nullableText(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return Math.max(min, Math.min(max, numberValue(value, fallback)));
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function todayOnly() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number) {
  const date = new Date(`${base}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekLabel(index: number) {
  if (index === 0) return "Tuần này";
  return `Tuần +${index}`;
}

function buildWeeks(today: string): ResourceScheduleWeek[] {
  return Array.from({ length: WEEK_COUNT }).map((_, index) => {
    const startDate = addDays(today, index * WEEK_DAYS);
    const endDate = addDays(startDate, WEEK_DAYS - 1);
    return { id: `${startDate}_${endDate}`, label: weekLabel(index), startDate, endDate };
  });
}

function issueEstimatedHours(issue: IssueRow) {
  if (issue.estimatedHours !== null && issue.estimatedHours !== undefined) return Math.max(0, issue.estimatedHours);
  const normalized = String(issue.priorityCode ?? "").toUpperCase();
  if (normalized === "A" || normalized === "CRITICAL") return 8;
  if (normalized === "B" || normalized === "HIGH") return 5;
  if (normalized === "C" || normalized === "MEDIUM") return 3;
  return 2;
}

function taskEstimatedHours(task: ProjectPlanTask) {
  if (task.estimatedHours !== null && task.estimatedHours !== undefined) return Math.max(0, task.estimatedHours);
  if (task.priority === "critical") return 8;
  if (task.priority === "high") return 6;
  if (task.priority === "medium") return 4;
  return 2;
}

function projectRoleLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "pm") return "PM";
  if (role === "member") return "Member";
  if (role === "viewer") return "Viewer";
  return null;
}

function levelFor(allocationPercent: number, overloadHours: number): ResourceScheduleLevel {
  if (overloadHours > 0 || allocationPercent >= 100) return "overloaded";
  if (allocationPercent >= 85) return "tight";
  if (allocationPercent >= 50) return "balanced";
  return "available";
}

function createWeek(weekId: string): ResourceScheduleMemberWeek {
  return {
    weekId,
    plannedHours: 0,
    allocationPercent: 0,
    availableHours: 0,
    overloadHours: 0,
    level: "available",
    items: [],
  };
}

function createMember(raw: Record<string, unknown>, departmentName: string | null, weeks: ResourceScheduleWeek[]): ResourceScheduleMember {
  const capacityHoursPerWeek = boundedNumber(raw.capacity_hours_per_week, DEFAULT_CAPACITY_HOURS_PER_WEEK, 0, 168);
  const allocationTargetPercent = boundedNumber(raw.allocation_target_percent, DEFAULT_ALLOCATION_TARGET_PERCENT, 0, 200);
  const effectiveCapacityHours = roundHours(capacityHoursPerWeek * allocationTargetPercent / 100);
  return {
    id: String(raw.id ?? ""),
    name: String(raw.full_name ?? "Chưa đặt tên"),
    title: nullableText(raw.title),
    role: projectRoleLabel(nullableText(raw.project_role)),
    departmentName,
    capacityHoursPerWeek,
    allocationTargetPercent,
    effectiveCapacityHours,
    totalPlannedHours: 0,
    totalAvailableHours: 0,
    totalOverloadHours: 0,
    averageAllocationPercent: 0,
    weeks: weeks.map((week) => createWeek(week.id)),
  };
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function weekIndexForDueDate(value: string | null, weeks: ResourceScheduleWeek[]) {
  if (!weeks.length) return -1;
  if (!value) return 0;
  const index = weeks.findIndex((week) => value >= week.startDate && value <= week.endDate);
  if (index >= 0) return index;
  if (value < weeks[0].startDate) return 0;
  return weeks.length - 1;
}

function addScheduledItem(member: ResourceScheduleMember, weeks: ResourceScheduleWeek[], item: ResourceScheduleItem) {
  const weekIndex = weekIndexForDueDate(item.dueDate, weeks);
  if (weekIndex < 0) return;
  const targetWeek = member.weeks[weekIndex];
  targetWeek.items.push(item);
  targetWeek.plannedHours = roundHours(targetWeek.plannedHours + item.estimatedHours);
}

function finalizeMember(member: ResourceScheduleMember) {
  let allocationTotal = 0;
  for (const week of member.weeks) {
    week.items.sort((a, b) => String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31")) || b.estimatedHours - a.estimatedHours);
    week.plannedHours = roundHours(week.plannedHours);
    week.allocationPercent = member.effectiveCapacityHours > 0 ? Math.round(week.plannedHours / member.effectiveCapacityHours * 100) : week.plannedHours > 0 ? 100 : 0;
    week.availableHours = roundHours(Math.max(0, member.effectiveCapacityHours - week.plannedHours));
    week.overloadHours = roundHours(Math.max(0, week.plannedHours - member.effectiveCapacityHours));
    week.level = levelFor(week.allocationPercent, week.overloadHours);
    allocationTotal += week.allocationPercent;
  }
  member.totalPlannedHours = roundHours(member.weeks.reduce((sum, week) => sum + week.plannedHours, 0));
  member.totalAvailableHours = roundHours(member.weeks.reduce((sum, week) => sum + week.availableHours, 0));
  member.totalOverloadHours = roundHours(member.weeks.reduce((sum, week) => sum + week.overloadHours, 0));
  member.averageAllocationPercent = member.weeks.length ? Math.round(allocationTotal / member.weeks.length) : 0;
}

function issueToScheduleItem(issue: IssueRow): ResourceScheduleItem {
  return {
    id: issue.id,
    type: "issue",
    code: issue.issueNo ? `#${issue.issueNo}` : "ISSUE",
    title: issue.content,
    status: issue.statusCode,
    priority: issue.priorityCode,
    dueDate: dateOnly(issue.dueDate),
    estimatedHours: issueEstimatedHours(issue),
    ownerId: issue.assigneeId,
    ownerName: issue.assigneeName,
    moduleName: issue.moduleName,
    departmentName: issue.departmentName,
    stageName: null,
    jiraUrl: issue.jiraUrl,
  };
}

function taskToScheduleItem(task: ProjectPlanTask): ResourceScheduleItem {
  return {
    id: task.id,
    type: "task",
    code: "TASK",
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: dateOnly(task.dueDate),
    estimatedHours: taskEstimatedHours(task),
    ownerId: task.ownerId,
    ownerName: task.ownerName,
    moduleName: null,
    departmentName: null,
    stageName: task.stageName,
    jiraUrl: null,
  };
}

function sortQueue(items: ResourceScheduleItem[]) {
  return items.sort((a, b) => String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31")) || b.estimatedHours - a.estimatedHours || a.title.localeCompare(b.title));
}

export async function loadResourceScheduleData(
  supabase: SupabaseClient,
  projectId: string,
  role: ProjectRole,
  scheduleStartDate?: string | null,
): Promise<ResourceScheduleData> {
  const today = scheduleStartDate && /^\d{4}-\d{2}-\d{2}$/.test(scheduleStartDate) ? scheduleStartDate : todayOnly();
  const weeks = buildWeeks(today);
  const [projectResult, plan, peopleResult, departmentsResult, issuesResult] = await Promise.all([
    supabase.from("projects").select("code").eq("id", projectId).maybeSingle(),
    loadProjectPlan(supabase, projectId, role),
    supabase
      .from("people")
      .select("id,full_name,title,project_role,department_id,capacity_hours_per_week,allocation_target_percent")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase.from("departments").select("id,name").eq("project_id", projectId).eq("is_active", true),
    supabase
      .from("issues")
      .select(ISSUE_SELECT)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .limit(5000),
  ]);

  const failure = [projectResult, peopleResult, departmentsResult, issuesResult].find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  if (!projectResult.data) throw new Error("Project không tồn tại hoặc bạn không có quyền truy cập.");

  const departments = new Map(
    ((departmentsResult.data ?? []) as unknown as Array<Record<string, unknown>>)
      .map((department) => [String(department.id ?? ""), String(department.name ?? "")]),
  );
  const members = new Map<string, ResourceScheduleMember>();
  for (const rawPerson of (peopleResult.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const id = String(rawPerson.id ?? "");
    if (!id) continue;
    members.set(id, createMember(rawPerson, departments.get(String(rawPerson.department_id ?? "")) ?? null, weeks));
  }

  const unassignedItems: ResourceScheduleItem[] = [];
  for (const issue of ((issuesResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizeIssue)) {
    if (issue.statusCode && CLOSED_ISSUE_STATUSES.includes(issue.statusCode)) continue;
    const item = issueToScheduleItem(issue);
    if (!issue.assigneeId) unassignedItems.push(item);
    else {
      const member = members.get(issue.assigneeId);
      if (member) addScheduledItem(member, weeks, item);
    }
  }

  for (const task of plan.tasks) {
    if (CLOSED_TASK_STATUSES.includes(task.status)) continue;
    const item = taskToScheduleItem(task);
    if (!task.ownerId) unassignedItems.push(item);
    else {
      const member = members.get(task.ownerId);
      if (member) addScheduledItem(member, weeks, item);
    }
  }

  const memberRows = [...members.values()];
  memberRows.forEach(finalizeMember);
  memberRows.sort((a, b) => b.totalOverloadHours - a.totalOverloadHours || b.averageAllocationPercent - a.averageAllocationPercent || a.name.localeCompare(b.name));
  const summary = {
    memberCount: memberRows.length,
    assignableItems: memberRows.reduce((sum, member) => sum + member.weeks.reduce((weekSum, week) => weekSum + week.items.length, 0), 0),
    unassignedItems: unassignedItems.length,
    overloadedSlots: memberRows.reduce((sum, member) => sum + member.weeks.filter((week) => week.level === "overloaded").length, 0),
    totalPlannedHours: roundHours(memberRows.reduce((sum, member) => sum + member.totalPlannedHours, 0)),
    totalAvailableHours: roundHours(memberRows.reduce((sum, member) => sum + member.totalAvailableHours, 0)),
    totalOverloadHours: roundHours(memberRows.reduce((sum, member) => sum + member.totalOverloadHours, 0)),
  };

  return {
    source: "database",
    projectId,
    projectCode: String(projectResult.data.code ?? plan.projectCode ?? ""),
    generatedAt: new Date().toISOString(),
    weeks,
    members: memberRows,
    unassignedItems: sortQueue(unassignedItems),
    summary,
  };
}

export async function assignResourceScheduleItem(
  supabase: SupabaseClient,
  projectId: string,
  itemType: ResourceScheduleWorkType,
  itemId: string,
  assigneeId: string | null,
  actorId: string,
) {
  let assigneeName: string | null = null;
  if (assigneeId) {
    const { data: person, error } = await supabase
      .from("people")
      .select("id,full_name")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .eq("is_active", true)
      .eq("id", assigneeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!person) throw new Error("Người phụ trách không còn thuộc Project.");
    assigneeName = String(person.full_name ?? "");
  }

  const result = itemType === "issue"
    ? await supabase
      .from("issues")
      .update({ assignee_person_id: assigneeId, assignee_name_raw: assigneeName })
      .eq("project_id", projectId)
      .eq("id", itemId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle()
    : await supabase
      .from("project_plan_tasks")
      .update({ owner_person_id: assigneeId, updated_by: actorId })
      .eq("project_id", projectId)
      .eq("id", itemId)
      .select("id")
      .maybeSingle();

  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error(itemType === "issue" ? "Không tìm thấy ISSUE để phân công." : "Không tìm thấy task để phân công.");

  const auditPayload = {
    project_id: projectId,
    item_type: itemType,
    item_id: itemId,
    assignee_person_id: assigneeId,
    changed_by: actorId,
  };
  await supabase.from("resource_assignment_events").insert(auditPayload);

  return assigneeName;
}
