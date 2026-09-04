import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoCommandCenter } from "@/lib/command-center/demo";
import type { CommandCenterAction, CommandCenterApiResponse, CommandCenterData } from "@/lib/command-center/types";
import { prioritySeverity } from "@/lib/command-center/types";
import { normalizeIssue, ISSUE_SELECT } from "@/lib/issues/server";
import { isPlanningMigrationMissing, loadProjectPlan } from "@/lib/planning/server";
import type { ProjectPlanData } from "@/lib/planning/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CLOSED_ISSUE_STATUSES = ["resolved", "released", "no_action", "not_feasible"];

function todayOnly() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function severityWeight(value: CommandCenterAction["severity"]) {
  if (value === "critical") return 3;
  if (value === "warning") return 2;
  return 1;
}

async function countRows(query: unknown) {
  const { count, error } = await query as { count: number | null; error: { message: string } | null };
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function buildCards(data: CommandCenterData["metrics"], score: number): CommandCenterData["cards"] {
  return [
    { label: "Health Score", value: score, note: "Tổng hợp tiến độ, ISSUE, task và reminder", tone: score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose" },
    { label: "Execution", value: `${data.executionProgress}%`, note: `Plan progress ${data.projectProgress}%`, tone: "cyan" },
    { label: "Open Issues", value: data.openIssues, note: `${data.overdueIssues} issue quá hạn`, tone: data.overdueIssues ? "rose" : "violet" },
    { label: "Blocked Tasks", value: data.blockedTasks, note: "Task đang bị chặn", tone: data.blockedTasks ? "rose" : "emerald" },
    { label: "Smart Reminders", value: data.openReminders, note: `${data.overdueReminders} reminder quá hạn`, tone: data.overdueReminders ? "rose" : "amber" },
    { label: "PLHĐ Scope", value: data.modules, note: `${data.contractDetails} chi tiết • ${data.departments} phòng ban`, tone: "emerald" },
  ];
}

function buildHealth(score: number, plan: ProjectPlanData) {
  return {
    score,
    label: score >= 80 ? "ON TRACK" : score >= 60 ? "NEEDS ATTENTION" : "AT RISK",
    planHealth: plan.summary.health,
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Project Command Center." } satisfies CommandCenterApiResponse, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoCommandCenter(projectId) } satisfies CommandCenterApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies CommandCenterApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies CommandCenterApiResponse, { status: 403 });

  try {
    const today = todayOnly();
    const nextWeek = addDays(7);
    const issueClosedFilter = `(${CLOSED_ISSUE_STATUSES.join(",")})`;
    const [projectResult, plan, modules, details, departments, totalIssues, closedIssues, overdueIssues, missingAssignee, issueRows] = await Promise.all([
      supabase.from("projects").select("id,code,slug,name,organization_name,status,start_date,due_date").eq("id", projectId).maybeSingle(),
      loadProjectPlan(supabase, projectId, role),
      countRows(supabase.from("contract_items").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("item_type", "module")),
      countRows(supabase.from("contract_detail_items").select("id", { count: "exact", head: true }).eq("project_id", projectId)),
      countRows(supabase.from("departments").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_active", true)),
      countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null)),
      countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).in("status_code", CLOSED_ISSUE_STATUSES)),
      countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).lt("due_date", today).not("status_code", "in", issueClosedFilter)),
      countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("assignee_person_id", null)),
      supabase
        .from("issues")
        .select(ISSUE_SELECT)
        .eq("project_id", projectId)
        .is("archived_at", null)
        .not("status_code", "in", issueClosedFilter)
        .lte("due_date", nextWeek)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(8),
    ]);

    if (projectResult.error) throw new Error(projectResult.error.message);
    if (issueRows.error) throw new Error(issueRows.error.message);
    const projectRow = projectResult.data;
    if (!projectRow) return NextResponse.json({ ok: false, code: "PROJECT_NOT_FOUND", message: "Không tìm thấy project." } satisfies CommandCenterApiResponse, { status: 404 });

    const openIssues = Math.max(0, totalIssues - closedIssues);
    const metrics: CommandCenterData["metrics"] = {
      projectProgress: plan.summary.overallProgress,
      executionProgress: plan.summary.executionProgress,
      openIssues,
      overdueIssues,
      blockedTasks: plan.summary.blockedTasks,
      openReminders: plan.summary.openReminders,
      overdueReminders: plan.summary.overdueReminders,
      modules,
      departments,
      contractDetails: details,
    };
    const score = Math.max(0, Math.min(100, Math.round(
      metrics.projectProgress * 0.35 +
      metrics.executionProgress * 0.35 +
      Math.max(0, 100 - overdueIssues * 5 - plan.summary.overdueTasks * 5 - plan.summary.blockedTasks * 8 - plan.summary.overdueReminders * 4 - missingAssignee * 2) * 0.3,
    )));

    const issueActions: CommandCenterAction[] = ((issueRows.data ?? []) as unknown as Array<Record<string, unknown>>)
      .map(normalizeIssue)
      .map((issue) => ({
        id: `issue-${issue.id}`,
        type: "issue",
        title: issue.issueNo ? `ISSUE #${issue.issueNo}: ${issue.content}` : issue.content,
        detail: issue.moduleName ? `Module ${issue.moduleName}` : "ISSUE chưa gắn module",
        dueDate: issue.dueDate,
        ownerName: issue.assigneeName,
        severity: issue.dueDate && issue.dueDate < today ? "critical" : "warning",
        href: issue.dueDate && issue.dueDate < today ? "/issues?overdue=1" : "/issues?nearDue=7",
      }));

    const planActions: CommandCenterAction[] = [
      ...plan.tasks
        .filter((task) => task.status === "blocked" || (task.status !== "done" && dateOnly(task.dueDate) && dateOnly(task.dueDate)! <= nextWeek))
        .map((task) => ({
          id: `task-${task.id}`,
          type: "task" as const,
          title: task.title,
          detail: task.stageName ? `Task thuộc stage ${task.stageName}` : "Task chưa gắn stage",
          dueDate: task.dueDate,
          ownerName: task.ownerName,
          severity: task.status === "blocked" ? "critical" as const : prioritySeverity(task.priority),
          href: "/plan",
        })),
      ...plan.reminders
        .filter((reminder) => reminder.status === "open" || reminder.status === "snoozed")
        .map((reminder) => ({
          id: `reminder-${reminder.id}`,
          type: "reminder" as const,
          title: reminder.title,
          detail: reminder.entityTitle ? `Nhắc cho ${reminder.entityTitle}` : "Nhắc việc thủ công",
          dueDate: dateOnly(reminder.snoozedUntil ?? reminder.remindAt),
          ownerName: reminder.ownerName,
          severity: dateOnly(reminder.snoozedUntil ?? reminder.remindAt) && dateOnly(reminder.snoozedUntil ?? reminder.remindAt)! < today ? "critical" as const : prioritySeverity(reminder.priority),
          href: "/plan",
        })),
      ...plan.milestones
        .filter((milestone) => milestone.status !== "completed" && milestone.dueDate <= nextWeek)
        .map((milestone) => ({
          id: `milestone-${milestone.id}`,
          type: "milestone" as const,
          title: milestone.title,
          detail: milestone.stageName ? `Milestone thuộc stage ${milestone.stageName}` : "Milestone độc lập",
          dueDate: milestone.dueDate,
          ownerName: milestone.ownerName,
          severity: milestone.dueDate < today || milestone.status === "missed" ? "critical" as const : "warning" as const,
          href: "/plan",
        })),
    ];

    const actions = [...issueActions, ...planActions]
      .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity) || String(a.dueDate ?? "9999").localeCompare(String(b.dueDate ?? "9999")))
      .slice(0, 10);

    const data: CommandCenterData = {
      source: "database",
      generatedAt: new Date().toISOString(),
      project: {
        id: String(projectRow.id),
        code: String(projectRow.code),
        name: String(projectRow.name),
        organizationName: projectRow.organization_name ? String(projectRow.organization_name) : null,
        status: String(projectRow.status ?? "active"),
        startDate: dateOnly(projectRow.start_date),
        dueDate: dateOnly(projectRow.due_date),
      },
      health: buildHealth(score, plan),
      metrics,
      cards: buildCards(metrics, score),
      actions,
      risks: [
        ...plan.smartAlerts.map((alert) => ({ id: alert.id, title: alert.title, summary: alert.summary, severity: alert.severity, href: "/plan" })),
        ...(missingAssignee ? [{ id: "missing-assignee", title: "ISSUE thiếu người phụ trách", summary: `${missingAssignee} ISSUE chưa có assignee, cần phân công để tránh trôi việc.`, severity: "warning" as const, href: "/issues?missingAssignee=1" }] : []),
      ].slice(0, 8),
      stages: plan.stages.map((stage) => ({ id: stage.id, code: stage.code, name: stage.name, status: stage.status, progress: stage.progress, startDate: stage.startDate, endDate: stage.endDate })),
      milestones: plan.milestones.slice(0, 8).map((milestone) => ({ id: milestone.id, title: milestone.title, status: milestone.status, dueDate: milestone.dueDate, ownerName: milestone.ownerName })),
      quickLinks: [
        { label: "Master Plan", href: "/plan", description: "Điều phối stage, timeline, task, milestone, reminder" },
        { label: "ISSUE Control", href: "/issues", description: "Xử lý backlog, overdue và trạng thái khách hàng" },
        { label: "PLHĐ Scope", href: "/contract", description: "Đối chiếu phạm vi module và chi tiết PLHĐ" },
        { label: "Portfolio", href: "/portfolio", description: "Nhìn sức khỏe toàn bộ project có quyền truy cập" },
      ],
    };

    return NextResponse.json({ ok: true, data } satisfies CommandCenterApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Project Command Center.";
    const missing = isPlanningMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V170_MIGRATION_REQUIRED" : "COMMAND_CENTER_QUERY_FAILED",
      message: missing ? "Project Command Center cần dữ liệu Plan/Execution/Reminder đến V1.8.0 trước khi tổng hợp." : message,
    } satisfies CommandCenterApiResponse, { status: missing ? 503 : 500 });
  }
}
