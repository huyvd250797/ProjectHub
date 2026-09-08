import type { SupabaseClient } from "@supabase/supabase-js";
import { ISSUE_WORKLOAD_SELECT, normalizeIssue } from "@/lib/issues/server";
import type { IssueRow, ProjectRole } from "@/lib/issues/types";
import { loadProjectPlan } from "@/lib/planning/server";
import type { ProjectMilestone, ProjectPlanReminder, ProjectPlanTask } from "@/lib/planning/types";
import type {
  WorkloadCalendarBucket,
  WorkloadData,
  WorkloadIssueItem,
  WorkloadLevel,
  WorkloadMember,
  WorkloadMemberItem,
  WorkloadRisk,
} from "@/lib/workload/types";

const CLOSED_ISSUE_STATUSES = ["resolved", "released", "no_action", "not_feasible"];
const WEEK_DAYS = 7;
const DEFAULT_CAPACITY_HOURS_PER_WEEK = 40;
const DEFAULT_ALLOCATION_TARGET_PERCENT = 100;

export const WORKLOAD_SOURCE_TABLES = [
  "people",
  "issues.assignee_person_id",
  "project_plan_tasks",
  "project_milestones",
  "project_plan_reminders",
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

function todayOnly() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number) {
  const date = new Date(`${base}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function isDueSoon(value: string | null, today: string) {
  return Boolean(value && value >= today && value <= addDays(today, WEEK_DAYS));
}

function isOverdue(value: string | null, today: string) {
  return Boolean(value && value < today);
}

function issuePriorityWeight(priority: string | null) {
  const normalized = String(priority ?? "").toUpperCase();
  if (normalized === "A" || normalized === "CRITICAL") return 5;
  if (normalized === "B" || normalized === "HIGH") return 3;
  if (normalized === "C" || normalized === "MEDIUM") return 2;
  return 1;
}

function taskPriorityWeight(priority: string | null) {
  if (priority === "critical") return 5;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
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

function emptyMember(raw: Record<string, unknown>, departmentName: string | null): WorkloadMember {
  const capacityHoursPerWeek = boundedNumber(raw.capacity_hours_per_week, DEFAULT_CAPACITY_HOURS_PER_WEEK, 0, 168);
  const allocationTargetPercent = boundedNumber(raw.allocation_target_percent, DEFAULT_ALLOCATION_TARGET_PERCENT, 0, 200);
  const effectiveCapacityHours = Math.round(capacityHoursPerWeek * allocationTargetPercent) / 100;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.full_name ?? "Chưa đặt tên"),
    title: nullableText(raw.title),
    email: nullableText(raw.email),
    role: projectRoleLabel(nullableText(raw.project_role)),
    departmentName,
    issueCount: 0,
    openIssues: 0,
    overdueIssues: 0,
    dueSoonIssues: 0,
    taskCount: 0,
    openTasks: 0,
    blockedTasks: 0,
    overdueTasks: 0,
    dueSoonTasks: 0,
    milestoneCount: 0,
    openMilestones: 0,
    overdueMilestones: 0,
    reminderCount: 0,
    openReminders: 0,
    overdueReminders: 0,
    dueSoonWork: 0,
    totalOpenWork: 0,
    capacityHoursPerWeek,
    allocationTargetPercent,
    effectiveCapacityHours,
    plannedHours: 0,
    issueEstimatedHours: 0,
    taskEstimatedHours: 0,
    milestoneEstimatedHours: 0,
    reminderEstimatedHours: 0,
    allocationPercent: 0,
    availableHours: 0,
    overloadHours: 0,
    capacityScore: 0,
    focusScore: 0,
    level: "low",
    recommendation: "Còn capacity tốt, nên ưu tiên giao việc mới hoặc hỗ trợ người quá tải.",
    nextDueDate: null,
    items: [],
    issueItems: [],
  };
}

function addItem(member: WorkloadMember, item: WorkloadMemberItem) {
  member.items.push(item);
  if (item.dueDate && (!member.nextDueDate || item.dueDate < member.nextDueDate)) member.nextDueDate = item.dueDate;
}

function levelFor(member: WorkloadMember): WorkloadLevel {
  if (member.overloadHours > 0 || member.allocationPercent >= 100 || member.overdueIssues + member.overdueTasks + member.blockedTasks >= 4) return "overloaded";
  if (member.allocationPercent >= 85 || member.capacityScore >= 85) return "high";
  if (member.allocationPercent >= 50 || member.capacityScore >= 50) return "normal";
  return "low";
}

function recommendationFor(member: WorkloadMember) {
  if (member.level === "overloaded" && member.overloadHours > 0) return `Cần giảm tải ngay: vượt ${member.overloadHours.toLocaleString("vi-VN")}h so với capacity tuần hoặc có rủi ro quá hạn/blocked.`;
  if (member.level === "overloaded") return "Cần xử lý rủi ro quá hạn/blocked trước khi nhận thêm việc mới.";
  if (member.level === "high") return `Đã dùng ${member.allocationPercent}%, còn ${member.availableHours.toLocaleString("vi-VN")}h; chỉ nên nhận việc nhỏ.`;
  if (member.level === "normal") return `Còn ${member.availableHours.toLocaleString("vi-VN")}h capacity, có thể nhận thêm việc vừa phải.`;
  return `Còn ${member.availableHours.toLocaleString("vi-VN")}h capacity, phù hợp nhận việc mới hoặc hỗ trợ nhóm quá tải.`;
}

function finalizeMember(member: WorkloadMember) {
  const priorityPressure = member.items.reduce((sum, item) => {
    if (item.type === "issue") return sum + issuePriorityWeight(item.priority);
    if (item.type === "task" || item.type === "reminder") return sum + taskPriorityWeight(item.priority);
    return sum;
  }, 0);
  member.totalOpenWork = member.openIssues + member.openTasks + member.openMilestones + member.openReminders;
  member.dueSoonWork = member.dueSoonIssues + member.dueSoonTasks;
  member.plannedHours = Math.round((member.issueEstimatedHours + member.taskEstimatedHours + member.milestoneEstimatedHours + member.reminderEstimatedHours) * 100) / 100;
  member.allocationPercent = member.effectiveCapacityHours > 0 ? Math.round((member.plannedHours / member.effectiveCapacityHours) * 100) : member.plannedHours > 0 ? 100 : 0;
  member.availableHours = Math.round(Math.max(0, member.effectiveCapacityHours - member.plannedHours) * 100) / 100;
  member.overloadHours = Math.round(Math.max(0, member.plannedHours - member.effectiveCapacityHours) * 100) / 100;
  member.capacityScore = Math.min(100, Math.round(
    member.allocationPercent * 0.72 +
    member.overdueIssues * 8 +
    member.overdueTasks * 10 +
    member.overdueMilestones * 8 +
    member.overdueReminders * 5 +
    member.blockedTasks * 12 +
    member.dueSoonIssues * 4 +
    member.dueSoonTasks * 5 +
    priorityPressure,
  ));
  member.focusScore = Math.min(100, Math.round(
    member.overdueIssues * 12 +
    member.overdueTasks * 14 +
    member.overdueMilestones * 10 +
    member.overdueReminders * 6 +
    member.blockedTasks * 16 +
    member.dueSoonWork * 3,
  ));
  member.level = levelFor(member);
  member.recommendation = recommendationFor(member);
  member.items = member.items.sort((a, b) => String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31")));
  member.issueItems = member.issueItems.sort((a, b) => String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31")) || Number(a.issueNo ?? 0) - Number(b.issueNo ?? 0));
}

function applyIssue(member: WorkloadMember, issue: IssueRow, today: string) {
  const dueDate = dateOnly(issue.dueDate);
  const estimatedHours = issueEstimatedHours(issue);
  member.issueCount += 1;
  member.openIssues += 1;
  member.issueEstimatedHours += estimatedHours;
  if (isOverdue(dueDate, today)) member.overdueIssues += 1;
  if (isDueSoon(dueDate, today)) member.dueSoonIssues += 1;
  const issueItem: WorkloadIssueItem = {
    id: issue.id,
    issueNo: issue.issueNo,
    content: issue.content,
    statusCode: issue.statusCode,
    priorityCode: issue.priorityCode,
    moduleName: issue.moduleName,
    departmentName: issue.departmentName,
    dueDate,
    jiraUrl: issue.jiraUrl,
    estimatedHours,
  };
  member.issueItems.push(issueItem);
  addItem(member, {
    id: issue.id,
    type: "issue",
    title: issue.issueNo ? `ISSUE #${issue.issueNo}: ${issue.content}` : issue.content,
    status: issue.statusCode,
    priority: issue.priorityCode,
    dueDate,
    estimatedHours,
    href: issue.dueDate && issue.dueDate < today ? "/issues?overdue=1" : "/issues",
  });
}

function applyTask(member: WorkloadMember, task: ProjectPlanTask, today: string) {
  const dueDate = dateOnly(task.dueDate);
  const estimatedHours = taskEstimatedHours(task);
  member.taskCount += 1;
  member.openTasks += 1;
  member.taskEstimatedHours += estimatedHours;
  if (task.status === "blocked") member.blockedTasks += 1;
  if (isOverdue(dueDate, today)) member.overdueTasks += 1;
  if (isDueSoon(dueDate, today)) member.dueSoonTasks += 1;
  addItem(member, {
    id: task.id,
    type: "task",
    title: task.stageName ? `${task.stageName} • ${task.title}` : task.title,
    status: task.status,
    priority: task.priority,
    dueDate,
    estimatedHours,
    href: "/plan",
  });
}

function applyMilestone(member: WorkloadMember, milestone: ProjectMilestone, today: string) {
  const dueDate = dateOnly(milestone.dueDate);
  member.milestoneCount += 1;
  member.openMilestones += 1;
  member.milestoneEstimatedHours += 1;
  if (isOverdue(dueDate, today) || milestone.status === "missed") member.overdueMilestones += 1;
  addItem(member, {
    id: milestone.id,
    type: "milestone",
    title: milestone.stageName ? `${milestone.stageName} • ${milestone.title}` : milestone.title,
    status: milestone.status,
    priority: null,
    dueDate,
    estimatedHours: 1,
    href: "/plan",
  });
}

function applyReminder(member: WorkloadMember, reminder: ProjectPlanReminder, today: string) {
  const dueDate = dateOnly(reminder.snoozedUntil ?? reminder.remindAt);
  member.reminderCount += 1;
  member.openReminders += 1;
  member.reminderEstimatedHours += 0.25;
  if (isOverdue(dueDate, today)) member.overdueReminders += 1;
  addItem(member, {
    id: reminder.id,
    type: "reminder",
    title: reminder.entityTitle ? `${reminder.title} • ${reminder.entityTitle}` : reminder.title,
    status: reminder.status,
    priority: reminder.priority,
    dueDate,
    estimatedHours: 0.25,
    href: "/plan",
  });
}

function buildSuggestions(members: WorkloadMember[]) {
  return members
    .filter((member) => member.level === "low" || member.level === "normal")
    .sort((a, b) => b.availableHours - a.availableHours || a.allocationPercent - b.allocationPercent || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      departmentName: member.departmentName,
      level: member.level,
      capacityScore: member.capacityScore,
      allocationPercent: member.allocationPercent,
      availableHours: member.availableHours,
      reason: member.level === "low"
        ? `Còn ${member.availableHours.toLocaleString("vi-VN")}h capacity trong tuần, phù hợp nhận việc mới.`
        : `Còn ${member.availableHours.toLocaleString("vi-VN")}h capacity, có thể nhận thêm việc ngắn hạn nếu cùng chuyên môn.`,
    }));
}

function buildRisks(members: WorkloadMember[], unassignedIssues: number): WorkloadRisk[] {
  const risks: WorkloadRisk[] = members
    .filter((member) => member.level === "overloaded" || member.overdueIssues || member.blockedTasks)
    .sort((a, b) => b.focusScore - a.focusScore)
    .slice(0, 6)
    .map((member) => ({
      id: `member-${member.id}`,
      title: member.level === "overloaded" ? "Nhân sự quá tải" : "Tải việc cần chú ý",
      summary: `${member.name} đang dùng ${member.plannedHours.toLocaleString("vi-VN")}h/${member.effectiveCapacityHours.toLocaleString("vi-VN")}h (${member.allocationPercent}%), ${member.overdueIssues + member.overdueTasks + member.overdueMilestones + member.overdueReminders} việc quá hạn và ${member.blockedTasks} task blocked.`,
      severity: member.level === "overloaded" ? "critical" : "warning",
      ownerName: member.name,
      href: "/issues?overdue=1",
    }));

  if (unassignedIssues > 0) {
    risks.unshift({
      id: "unassigned-issues",
      title: "ISSUE chưa có người phụ trách",
      summary: `${unassignedIssues} ISSUE đang mở nhưng chưa có assignee, cần phân công trước khi theo dõi capacity.`,
      severity: "warning",
      ownerName: null,
      href: "/issues?missingAssignee=1",
    });
  }

  return risks.slice(0, 8);
}

function bucketLabel(index: number) {
  if (index === 0) return "Tuần này";
  return `Tuần +${index}`;
}

function buildCalendarBuckets(members: WorkloadMember[], today: string): WorkloadCalendarBucket[] {
  return Array.from({ length: 4 }).map((_, index) => {
    const startDate = addDays(today, index * WEEK_DAYS);
    const endDate = addDays(startDate, WEEK_DAYS - 1);
    const allDueItems = members.flatMap((member) => member.items.map((item) => ({ ...item, memberLevel: member.level })));
    const bucketItems = allDueItems.filter((item) => item.dueDate && item.dueDate >= startDate && item.dueDate <= endDate);
    return {
      label: bucketLabel(index),
      startDate,
      endDate,
      dueItems: bucketItems.length,
      overloadedDueItems: bucketItems.filter((item) => item.memberLevel === "overloaded").length,
    };
  });
}

export async function loadWorkloadData(
  supabase: SupabaseClient,
  projectId: string,
  role: ProjectRole,
): Promise<WorkloadData> {
  const today = todayOnly();
  const [projectResult, plan, peopleResult, departmentsResult, issuesResult] = await Promise.all([
    supabase.from("projects").select("code").eq("id", projectId).maybeSingle(),
    loadProjectPlan(supabase, projectId, role),
    supabase
      .from("people")
      .select("id,full_name,title,email,project_role,department_id,capacity_hours_per_week,allocation_target_percent")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase.from("departments").select("id,name").eq("project_id", projectId).eq("is_active", true),
    supabase
      .from("issues")
      .select(ISSUE_WORKLOAD_SELECT)
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
  const members = new Map<string, WorkloadMember>();
  for (const rawPerson of (peopleResult.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const id = String(rawPerson.id ?? "");
    if (!id) continue;
    members.set(id, emptyMember(rawPerson, departments.get(String(rawPerson.department_id ?? "")) ?? null));
  }

  let unassignedIssues = 0;
  for (const issue of ((issuesResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizeIssue)) {
    if (issue.statusCode && CLOSED_ISSUE_STATUSES.includes(issue.statusCode)) continue;
    if (!issue.assigneeId) {
      unassignedIssues += 1;
      continue;
    }
    const member = members.get(issue.assigneeId);
    if (member) applyIssue(member, issue, today);
  }

  for (const task of plan.tasks) {
    if (task.status === "done" || !task.ownerId) continue;
    const member = members.get(task.ownerId);
    if (member) applyTask(member, task, today);
  }

  for (const milestone of plan.milestones) {
    if (milestone.status === "completed" || !milestone.ownerId) continue;
    const member = members.get(milestone.ownerId);
    if (member) applyMilestone(member, milestone, today);
  }

  for (const reminder of plan.reminders) {
    if (reminder.status === "done" || reminder.status === "cancelled" || !reminder.ownerId) continue;
    const member = members.get(reminder.ownerId);
    if (member) applyReminder(member, reminder, today);
  }

  const memberRows = [...members.values()];
  memberRows.forEach(finalizeMember);
  memberRows.sort((a, b) => b.capacityScore - a.capacityScore || a.name.localeCompare(b.name));

  const overloadedMembers = memberRows.filter((member) => member.level === "overloaded").length;
  const availableMembers = memberRows.filter((member) => member.level === "low" || member.level === "normal").length;
  const totalCapacity = memberRows.reduce((sum, member) => sum + member.capacityScore, 0);
  const totalCapacityHours = Math.round(memberRows.reduce((sum, member) => sum + member.effectiveCapacityHours, 0) * 100) / 100;
  const totalPlannedHours = Math.round(memberRows.reduce((sum, member) => sum + member.plannedHours, 0) * 100) / 100;
  const totalAllocation = memberRows.reduce((sum, member) => sum + member.allocationPercent, 0);
  const summary = {
    memberCount: memberRows.length,
    overloadedMembers,
    availableMembers,
    totalOpenWork: memberRows.reduce((sum, member) => sum + member.totalOpenWork, 0),
    overdueWork: memberRows.reduce((sum, member) => sum + member.overdueIssues + member.overdueTasks + member.overdueMilestones + member.overdueReminders, 0),
    blockedTasks: memberRows.reduce((sum, member) => sum + member.blockedTasks, 0),
    dueSoonWork: memberRows.reduce((sum, member) => sum + member.dueSoonWork, 0),
    averageCapacity: memberRows.length ? Math.round(totalCapacity / memberRows.length) : 0,
    totalCapacityHours,
    totalPlannedHours,
    averageAllocation: memberRows.length ? Math.round(totalAllocation / memberRows.length) : 0,
    availableHours: Math.round(memberRows.reduce((sum, member) => sum + member.availableHours, 0) * 100) / 100,
    overloadHours: Math.round(memberRows.reduce((sum, member) => sum + member.overloadHours, 0) * 100) / 100,
  };

  return {
    source: "database",
    projectId,
    projectCode: String(projectResult.data.code ?? plan.projectCode ?? ""),
    generatedAt: new Date().toISOString(),
    summary,
    members: memberRows,
    suggestions: buildSuggestions(memberRows),
    risks: buildRisks(memberRows, unassignedIssues),
    calendar: buildCalendarBuckets(memberRows, today),
  };
}
