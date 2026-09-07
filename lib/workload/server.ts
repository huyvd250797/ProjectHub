import type { SupabaseClient } from "@supabase/supabase-js";
import { ISSUE_SELECT, normalizeIssue } from "@/lib/issues/server";
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

function projectRoleLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "pm") return "PM";
  if (role === "member") return "Member";
  if (role === "viewer") return "Viewer";
  return null;
}

function emptyMember(raw: Record<string, unknown>, departmentName: string | null): WorkloadMember {
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
  if (member.capacityScore >= 85 || member.overdueIssues + member.overdueTasks + member.blockedTasks >= 4) return "overloaded";
  if (member.capacityScore >= 65) return "high";
  if (member.capacityScore >= 30) return "normal";
  return "low";
}

function recommendationFor(level: WorkloadLevel) {
  if (level === "overloaded") return "Cần giảm tải ngay: chuyển bớt ISSUE/task quá hạn hoặc blocked.";
  if (level === "high") return "Theo dõi sát, chỉ nhận thêm việc nhỏ hoặc cùng module.";
  if (level === "normal") return "Có thể nhận thêm việc vừa phải nếu cùng chuyên môn.";
  return "Còn capacity tốt, phù hợp nhận việc mới hoặc hỗ trợ nhóm quá tải.";
}

function finalizeMember(member: WorkloadMember) {
  const priorityPressure = member.items.reduce((sum, item) => {
    if (item.type === "issue") return sum + issuePriorityWeight(item.priority);
    if (item.type === "task" || item.type === "reminder") return sum + taskPriorityWeight(item.priority);
    return sum;
  }, 0);
  member.totalOpenWork = member.openIssues + member.openTasks + member.openMilestones + member.openReminders;
  member.dueSoonWork = member.dueSoonIssues + member.dueSoonTasks;
  member.capacityScore = Math.min(100, Math.round(
    member.openIssues * 8 +
    member.openTasks * 10 +
    member.openMilestones * 6 +
    member.openReminders * 4 +
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
  member.recommendation = recommendationFor(member.level);
  member.items = member.items.sort((a, b) => String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31")));
  member.issueItems = member.issueItems.sort((a, b) => String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31")) || Number(a.issueNo ?? 0) - Number(b.issueNo ?? 0));
}

function applyIssue(member: WorkloadMember, issue: IssueRow, today: string) {
  const dueDate = dateOnly(issue.dueDate);
  member.issueCount += 1;
  member.openIssues += 1;
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
  };
  member.issueItems.push(issueItem);
  addItem(member, {
    id: issue.id,
    type: "issue",
    title: issue.issueNo ? `ISSUE #${issue.issueNo}: ${issue.content}` : issue.content,
    status: issue.statusCode,
    priority: issue.priorityCode,
    dueDate,
    href: issue.dueDate && issue.dueDate < today ? "/issues?overdue=1" : "/issues",
  });
}

function applyTask(member: WorkloadMember, task: ProjectPlanTask, today: string) {
  const dueDate = dateOnly(task.dueDate);
  member.taskCount += 1;
  member.openTasks += 1;
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
    href: "/plan",
  });
}

function applyMilestone(member: WorkloadMember, milestone: ProjectMilestone, today: string) {
  const dueDate = dateOnly(milestone.dueDate);
  member.milestoneCount += 1;
  member.openMilestones += 1;
  if (isOverdue(dueDate, today) || milestone.status === "missed") member.overdueMilestones += 1;
  addItem(member, {
    id: milestone.id,
    type: "milestone",
    title: milestone.stageName ? `${milestone.stageName} • ${milestone.title}` : milestone.title,
    status: milestone.status,
    priority: null,
    dueDate,
    href: "/plan",
  });
}

function applyReminder(member: WorkloadMember, reminder: ProjectPlanReminder, today: string) {
  const dueDate = dateOnly(reminder.snoozedUntil ?? reminder.remindAt);
  member.reminderCount += 1;
  member.openReminders += 1;
  if (isOverdue(dueDate, today)) member.overdueReminders += 1;
  addItem(member, {
    id: reminder.id,
    type: "reminder",
    title: reminder.entityTitle ? `${reminder.title} • ${reminder.entityTitle}` : reminder.title,
    status: reminder.status,
    priority: reminder.priority,
    dueDate,
    href: "/plan",
  });
}

function buildSuggestions(members: WorkloadMember[]) {
  return members
    .filter((member) => member.level === "low" || member.level === "normal")
    .sort((a, b) => a.capacityScore - b.capacityScore || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      departmentName: member.departmentName,
      level: member.level,
      capacityScore: member.capacityScore,
      reason: member.level === "low"
        ? "Capacity thấp và không có tín hiệu quá tải, phù hợp nhận việc mới."
        : "Tải việc đang ổn định, có thể nhận thêm việc ngắn hạn nếu cùng chuyên môn.",
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
      summary: `${member.name} đang ${member.capacityScore}% capacity, ${member.overdueIssues + member.overdueTasks + member.overdueMilestones + member.overdueReminders} việc quá hạn và ${member.blockedTasks} task blocked.`,
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
      .select("id,full_name,title,email,project_role,department_id")
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
  const summary = {
    memberCount: memberRows.length,
    overloadedMembers,
    availableMembers,
    totalOpenWork: memberRows.reduce((sum, member) => sum + member.totalOpenWork, 0),
    overdueWork: memberRows.reduce((sum, member) => sum + member.overdueIssues + member.overdueTasks + member.overdueMilestones + member.overdueReminders, 0),
    blockedTasks: memberRows.reduce((sum, member) => sum + member.blockedTasks, 0),
    dueSoonWork: memberRows.reduce((sum, member) => sum + member.dueSoonWork, 0),
    averageCapacity: memberRows.length ? Math.round(totalCapacity / memberRows.length) : 0,
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
