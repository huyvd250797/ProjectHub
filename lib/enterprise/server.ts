import type { SupabaseClient } from "@supabase/supabase-js";
import { ISSUE_SELECT, normalizeIssue } from "@/lib/issues/server";
import type { ProjectRole } from "@/lib/issues/types";
import { loadProjectPlan } from "@/lib/planning/server";
import { loadWorkloadData } from "@/lib/workload/server";
import type { EnterpriseGate, EnterpriseGateStatus, EnterprisePriorityAction, EnterpriseSuiteData } from "@/lib/enterprise/types";

const CLOSED_ISSUE_STATUSES = ["resolved", "released", "no_action", "not_feasible"];

function todayOnly() {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bounded(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gateStatus(score: number): EnterpriseGateStatus {
  if (score >= 80) return "ready";
  if (score >= 55) return "attention";
  return "blocked";
}

async function countRows(query: unknown) {
  const { count, error } = await query as { count: number | null; error: { message: string } | null };
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function gate(
  id: string,
  title: string,
  score: number,
  summary: string,
  actions: EnterpriseGate["actions"],
): EnterpriseGate {
  return { id, title, score: bounded(score), status: gateStatus(score), summary, actions };
}

function prioritySeverity(issue: ReturnType<typeof normalizeIssue>): EnterprisePriorityAction["severity"] {
  if (issue.dueDate && issue.dueDate < todayOnly()) return "critical";
  if (String(issue.priorityCode ?? "").toUpperCase() === "A") return "critical";
  if (String(issue.priorityCode ?? "").toUpperCase() === "B") return "warning";
  return "info";
}

export async function loadEnterpriseSuiteData(
  supabase: SupabaseClient,
  projectId: string,
  role: ProjectRole,
): Promise<EnterpriseSuiteData> {
  const today = todayOnly();
  const issueClosedFilter = `(${CLOSED_ISSUE_STATUSES.join(",")})`;
  const [projectResult, plan, workload, totalIssues, openIssues, overdueIssues, missingAssignee, missingModule, missingDepartment, modules, details, departments, reportSnapshots, issueRows] = await Promise.all([
    supabase.from("projects").select("id,code,name,organization_name,status,start_date,due_date").eq("id", projectId).maybeSingle(),
    loadProjectPlan(supabase, projectId, role),
    loadWorkloadData(supabase, projectId, role),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).not("status_code", "in", issueClosedFilter)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).lt("due_date", today).not("status_code", "in", issueClosedFilter)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("assignee_person_id", null)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("module_id", null)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("department_id", null)),
    countRows(supabase.from("contract_items").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("item_type", "module")),
    countRows(supabase.from("contract_detail_items").select("id", { count: "exact", head: true }).eq("project_id", projectId)),
    countRows(supabase.from("departments").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_active", true)),
    countRows(supabase.from("report_snapshots").select("id", { count: "exact", head: true }).eq("project_id", projectId)),
    supabase
      .from("issues")
      .select(ISSUE_SELECT)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .not("status_code", "in", issueClosedFilter)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(12),
  ]);

  if (projectResult.error) throw new Error(projectResult.error.message);
  if (issueRows.error) throw new Error(issueRows.error.message);
  if (!projectResult.data) throw new Error("Project không tồn tại hoặc bạn không có quyền truy cập.");

  const mappingGaps = missingAssignee + missingModule + missingDepartment;
  const dataQualityScore = bounded(100 - mappingGaps * 5 - (totalIssues === 0 ? 18 : 0));
  const deliveryScore = bounded(
    plan.summary.overallProgress * 0.34 +
    plan.summary.executionProgress * 0.42 +
    Math.max(0, 100 - plan.summary.overdueTasks * 8 - plan.summary.blockedTasks * 12 - plan.summary.overdueMilestones * 10) * 0.24,
  );
  const resourceScore = bounded(100 - workload.summary.overloadedMembers * 18 - workload.summary.overloadHours * 1.2 - workload.summary.averageAllocation * 0.15);
  const reportingScore = bounded(reportSnapshots > 0 ? 88 : 62 - overdueIssues * 3);
  const scopeScore = bounded((modules > 0 ? 45 : 0) + (details > 0 ? 30 : 0) + (departments > 0 ? 15 : 0) + (missingModule === 0 ? 10 : 0));
  const maturityScore = bounded((dataQualityScore + deliveryScore + resourceScore + reportingScore + scopeScore) / 5);

  const priorityActions: EnterprisePriorityAction[] = [
    ...((issueRows.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizeIssue).map((issue) => ({
      id: `issue-${issue.id}`,
      title: issue.issueNo ? `ISSUE #${issue.issueNo}: ${issue.content}` : issue.content,
      detail: `${issue.moduleName ?? "Chưa gắn module"} • ${issue.assigneeName ?? "Chưa có phụ trách"}${issue.dueDate ? ` • hạn ${issue.dueDate}` : ""}`,
      severity: prioritySeverity(issue),
      href: issue.dueDate && issue.dueDate < today ? "/issues?overdue=1" : "/issues",
    })),
    ...plan.tasks
      .filter((task) => task.status === "blocked")
      .slice(0, 5)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        detail: task.stageName ? `Task blocked trong stage ${task.stageName}` : "Task blocked chưa gắn stage",
        severity: "critical" as const,
        href: "/plan",
      })),
  ].slice(0, 10);

  const row = projectResult.data as Record<string, unknown>;
  return {
    source: "database",
    generatedAt: new Date().toISOString(),
    project: {
      id: String(row.id),
      code: String(row.code ?? workload.projectCode ?? ""),
      name: String(row.name ?? ""),
      organizationName: row.organization_name ? String(row.organization_name) : null,
      status: String(row.status ?? "active"),
      startDate: dateOnly(row.start_date),
      dueDate: dateOnly(row.due_date),
    },
    maturityScore,
    maturityLevel: maturityScore >= 80 ? "Enterprise Ready" : maturityScore >= 60 ? "Managed" : "Needs Standardization",
    executiveSummary: `V3.0.0 tổng hợp ${totalIssues.toLocaleString("vi-VN")} ISSUE, ${modules.toLocaleString("vi-VN")} module PLHĐ, ${plan.summary.stageCount.toLocaleString("vi-VN")} stage và ${workload.summary.memberCount.toLocaleString("vi-VN")} nhân sự để chuẩn hóa quản trị dự án.`,
    kpis: [
      { id: "maturity", label: "Maturity Score", value: maturityScore, note: "Điểm chuẩn hóa quản trị dự án", tone: maturityScore >= 80 ? "emerald" : maturityScore >= 60 ? "amber" : "rose" },
      { id: "open-issues", label: "Open ISSUE", value: openIssues, note: `${overdueIssues} quá hạn • ${mappingGaps} thiếu mapping`, tone: overdueIssues ? "rose" : "cyan" },
      { id: "delivery", label: "Execution", value: `${plan.summary.executionProgress}%`, note: `${plan.summary.blockedTasks} task blocked`, tone: plan.summary.blockedTasks ? "amber" : "emerald" },
      { id: "resource", label: "Overloaded", value: workload.summary.overloadedMembers, note: `${numberValue(workload.summary.overloadHours).toLocaleString("vi-VN")}h vượt capacity`, tone: workload.summary.overloadedMembers ? "rose" : "emerald" },
      { id: "scope", label: "Scope", value: details, note: `${modules} module • ${departments} phòng ban`, tone: scopeScore >= 80 ? "emerald" : "amber" },
      { id: "reporting", label: "Snapshots", value: reportSnapshots, note: "Executive report snapshot", tone: reportSnapshots ? "violet" : "amber" },
    ],
    gates: [
      gate("data", "Data Quality Gate", dataQualityScore, `${mappingGaps} dữ liệu ISSUE thiếu assignee/module/phòng ban.`, [{ label: "Chuẩn hóa ISSUE", href: "/issues" }, { label: "Danh mục dự án", href: "/contract" }]),
      gate("delivery", "Delivery Control Gate", deliveryScore, `${plan.summary.overallProgress}% progress, ${plan.summary.blockedTasks} blocked task, ${plan.summary.overdueTasks} task quá hạn.`, [{ label: "Mở Plan", href: "/plan" }, { label: "Command Center", href: "/command-center" }]),
      gate("resource", "Resource Control Gate", resourceScore, `${workload.summary.averageAllocation}% allocation trung bình, ${workload.summary.overloadedMembers} nhân sự quá tải.`, [{ label: "Workload", href: "/workload" }, { label: "Allocation", href: "/resource-scheduling" }]),
      gate("report", "Executive Reporting Gate", reportingScore, reportSnapshots ? `${reportSnapshots} snapshot báo cáo đã có.` : "Chưa có report snapshot để lưu dấu tình trạng dự án.", [{ label: "Báo cáo", href: "/reports" }, { label: "Portfolio", href: "/portfolio" }]),
      gate("scope", "Scope Governance Gate", scopeScore, `${modules} module, ${details} chức năng/chi tiết PLHĐ đang làm scope chuẩn.`, [{ label: "PLHĐ", href: "/contract" }]),
    ],
    operatingModel: [
      { id: "scope", title: "Scope Governance", owner: "BA/PM", cadence: "Khi import hoặc đổi PLHĐ", metric: "Module, chức năng, mapping ISSUE", href: "/contract" },
      { id: "plan", title: "Plan Governance", owner: "PM", cadence: "Hàng tuần", metric: "Stage progress, milestone hit rate", href: "/plan" },
      { id: "execution", title: "Execution Control", owner: "PM/Team Lead", cadence: "Hàng ngày", metric: "Open ISSUE, overdue, blocked task", href: "/issues" },
      { id: "resource", title: "Resource Allocation", owner: "PMO", cadence: "Hàng tuần", metric: "Allocation %, overload hours", href: "/resource-scheduling" },
      { id: "reporting", title: "Executive Reporting", owner: "PM/Steering", cadence: "Tuần/tháng", metric: "Health score, risk trend, snapshot", href: "/reports" },
    ],
    priorityActions,
  };
}
