import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialData } from "@/lib/finance/types";
import { loadFinancialData } from "@/lib/finance/server";
import { ISSUE_SELECT, normalizeIssue } from "@/lib/issues/server";
import type { IssueRow, ProjectRole } from "@/lib/issues/types";
import { isPlanningMigrationMissing, loadProjectPlan } from "@/lib/planning/server";
import type { ProjectPlanData } from "@/lib/planning/types";
import { loadWorkloadData } from "@/lib/workload/server";
import type { WorkloadData, WorkloadRiskSeverity } from "@/lib/workload/types";
import type { CopilotAction, CopilotData, CopilotMetric, CopilotProject, CopilotRisk, CopilotSeverity } from "@/lib/copilot/types";

const CLOSED_ISSUE_STATUSES = ["resolved", "released", "no_action", "not_feasible"];

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  organization_name: string | null;
  status: string | null;
  start_date: string | null;
  due_date: string | null;
};

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

function money(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function severityWeight(value: CopilotSeverity) {
  if (value === "critical") return 4;
  if (value === "warning") return 3;
  if (value === "info") return 2;
  return 1;
}

function asSeverity(value: WorkloadRiskSeverity): CopilotSeverity {
  if (value === "critical") return "critical";
  if (value === "warning") return "warning";
  return "info";
}

function scoreLabel(score: number) {
  if (score >= 85) return "Ổn định";
  if (score >= 70) return "Cần theo dõi";
  if (score >= 55) return "Có rủi ro";
  return "Cần xử lý ngay";
}

function projectFromRow(row: ProjectRow): CopilotProject {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    organizationName: row.organization_name ?? null,
    status: row.status ?? null,
    startDate: dateOnly(row.start_date),
    dueDate: dateOnly(row.due_date),
  };
}

function buildHealthScore(plan: ProjectPlanData, workload: WorkloadData, finance: FinancialData, openIssues: number, overdueIssues: number) {
  const scheduleScore = Math.max(0, 100 - plan.summary.overdueTasks * 6 - plan.summary.overdueMilestones * 10 - plan.summary.blockedTasks * 8 - plan.summary.smartAlertCount * 3);
  const workloadScore = Math.max(0, 100 - workload.summary.overloadedMembers * 15 - workload.summary.overloadHours * 2 - workload.summary.overdueWork * 4);
  const financeProgress = finance.summary.contractValue > 0 ? Math.min(100, Math.round((finance.summary.revenueAmount / finance.summary.contractValue) * 100)) : 0;
  const financeGap = Math.max(0, finance.summary.actualPercent - financeProgress);
  const financeScore = Math.max(0, 100 - financeGap * 2 - (finance.summary.projectedMarginPercent < 15 ? 12 : 0));
  const issueScore = Math.max(0, 100 - overdueIssues * 6 - Math.max(0, openIssues - 20));
  return Math.round(plan.summary.executionProgress * 0.25 + scheduleScore * 0.25 + workloadScore * 0.22 + financeScore * 0.18 + issueScore * 0.1);
}

function buildMetrics(plan: ProjectPlanData, workload: WorkloadData, finance: FinancialData, totalIssues: number, openIssues: number, overdueIssues: number): CopilotMetric[] {
  const revenueProgress = finance.summary.contractValue > 0 ? Math.round((finance.summary.revenueAmount / finance.summary.contractValue) * 100) : 0;
  return [
    { label: "Health Score", value: buildHealthScore(plan, workload, finance, openIssues, overdueIssues), note: "Tổng hợp timeline, workload, finance và ISSUE", severity: "info" },
    { label: "Execution", value: `${plan.summary.executionProgress}%`, note: `${plan.summary.completedTasks}/${plan.summary.taskCount} task hoàn tất`, severity: plan.summary.blockedTasks || plan.summary.overdueTasks ? "warning" : "good" },
    { label: "ISSUE", value: openIssues, note: `${totalIssues} tổng • ${overdueIssues} quá hạn`, severity: overdueIssues ? "critical" : openIssues ? "info" : "good" },
    { label: "Workload", value: `${workload.summary.averageAllocation}%`, note: `${workload.summary.overloadedMembers} quá tải • còn ${workload.summary.availableHours.toLocaleString("vi-VN")}h`, severity: workload.summary.overloadedMembers ? "critical" : workload.summary.averageAllocation >= 85 ? "warning" : "good" },
    { label: "Revenue", value: `${revenueProgress}%`, note: `${money(finance.summary.revenueAmount)} / ${money(finance.summary.contractValue)}`, severity: revenueProgress + 10 < finance.summary.actualPercent ? "warning" : "good" },
    { label: "Profit", value: money(finance.summary.projectedProfitAmount), note: `Margin ${finance.summary.projectedMarginPercent.toLocaleString("vi-VN")}%`, severity: finance.summary.projectedProfitAmount < 0 ? "critical" : finance.summary.projectedMarginPercent < 15 ? "warning" : "good" },
  ];
}

function buildRisks(plan: ProjectPlanData, workload: WorkloadData, finance: FinancialData, openIssues: number, overdueIssues: number): CopilotRisk[] {
  const revenueProgress = finance.summary.contractValue > 0 ? Math.round((finance.summary.revenueAmount / finance.summary.contractValue) * 100) : 0;
  const risks: CopilotRisk[] = [
    ...plan.smartAlerts.slice(0, 6).map((alert) => ({
      id: `plan-${alert.id}`,
      title: alert.title,
      summary: alert.summary,
      domain: "timeline" as const,
      severity: alert.severity === "critical" ? "critical" as const : alert.severity === "warning" ? "warning" as const : "info" as const,
      href: "/plan",
    })),
    ...workload.risks.slice(0, 5).map((risk) => ({
      id: `workload-${risk.id}`,
      title: risk.title,
      summary: risk.summary,
      domain: "workload" as const,
      severity: asSeverity(risk.severity),
      href: risk.href,
    })),
  ];

  if (overdueIssues > 0) {
    risks.push({
      id: "issue-overdue",
      title: "ISSUE quá hạn",
      summary: `${overdueIssues}/${openIssues} ISSUE đang mở đã quá hạn. Cần xử lý trước các việc mới để bảo vệ tiến độ bàn giao.`,
      domain: "issue",
      severity: "critical",
      href: "/issues?overdue=1",
    });
  }
  if (revenueProgress + 10 < finance.summary.actualPercent) {
    risks.push({
      id: "finance-revenue-gap",
      title: "Revenue thấp hơn Actual",
      summary: `Actual đang ${finance.summary.actualPercent}% nhưng revenue mới ghi nhận ${revenueProgress}%. Cần kiểm tra nghiệm thu, invoice hoặc kế hoạch ghi nhận doanh thu.`,
      domain: "finance",
      severity: "warning",
      href: "/finance",
    });
  }
  if (finance.summary.projectedProfitAmount < 0 || finance.summary.projectedMarginPercent < 15) {
    risks.push({
      id: "finance-margin-risk",
      title: "Biên lợi nhuận cần theo dõi",
      summary: `Margin hiện tại ${finance.summary.projectedMarginPercent.toLocaleString("vi-VN")}%, profit ${money(finance.summary.projectedProfitAmount)}. Cần kiểm soát chi phí nhân sự và chi phí khác.`,
      domain: "finance",
      severity: finance.summary.projectedProfitAmount < 0 ? "critical" : "warning",
      href: "/finance",
    });
  }

  return risks.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity)).slice(0, 10);
}

function buildActions(plan: ProjectPlanData, workload: WorkloadData, finance: FinancialData, nearDueIssues: IssueRow[]): CopilotAction[] {
  const today = todayOnly();
  const actions: CopilotAction[] = nearDueIssues.map((issue) => ({
    id: `issue-${issue.id}`,
    title: issue.issueNo ? `Xử lý ISSUE #${issue.issueNo}` : "Xử lý ISSUE",
    detail: issue.content,
    reason: issue.dueDate && issue.dueDate < today ? "ISSUE đã quá hạn, cần ưu tiên xử lý." : "ISSUE đến hạn gần, cần kiểm soát trước khi trễ.",
    domain: "issue",
    severity: issue.dueDate && issue.dueDate < today ? "critical" : "warning",
    href: issue.dueDate && issue.dueDate < today ? "/issues?overdue=1" : "/issues?nearDue=7",
    dueDate: issue.dueDate,
    ownerName: issue.assigneeName,
  }));

  for (const task of plan.tasks.filter((item) => item.status === "blocked" || (item.status !== "done" && item.dueDate && item.dueDate <= addDays(7))).slice(0, 8)) {
    actions.push({
      id: `task-${task.id}`,
      title: task.status === "blocked" ? "Gỡ blocker task" : "Đẩy tiến độ task",
      detail: task.stageName ? `${task.stageName} • ${task.title}` : task.title,
      reason: task.status === "blocked" ? "Task blocked đang làm giảm health score." : "Task nằm trong nhóm đến hạn 7 ngày tới.",
      domain: "timeline",
      severity: task.status === "blocked" || task.priority === "critical" ? "critical" : task.priority === "high" ? "warning" : "info",
      href: "/plan",
      dueDate: task.dueDate,
      ownerName: task.ownerName,
    });
  }

  for (const suggestion of workload.suggestions.slice(0, 3)) {
    actions.push({
      id: `capacity-${suggestion.memberId}`,
      title: `Cân nhắc giao thêm việc cho ${suggestion.name}`,
      detail: suggestion.reason,
      reason: "Copilot phát hiện nhân sự còn capacity để hỗ trợ người quá tải hoặc nhận task mới.",
      domain: "workload",
      severity: "info",
      href: "/resource-scheduling",
      dueDate: null,
      ownerName: suggestion.name,
    });
  }

  const revenueProgress = finance.summary.contractValue > 0 ? Math.round((finance.summary.revenueAmount / finance.summary.contractValue) * 100) : 0;
  if (revenueProgress + 10 < finance.summary.actualPercent) {
    actions.push({
      id: "finance-revenue-action",
      title: "Rà soát forecast, actual và revenue",
      detail: `Actual ${finance.summary.actualPercent}% nhưng revenue mới ${revenueProgress}%.`,
      reason: "Cần tránh lệch dòng tiền so với tiến độ nghiệm thu.",
      domain: "finance",
      severity: "warning",
      href: "/finance",
      dueDate: null,
      ownerName: null,
    });
  }

  return actions.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity) || String(a.dueDate ?? "9999-12-31").localeCompare(String(b.dueDate ?? "9999-12-31"))).slice(0, 12);
}

function buildExecutiveSummary(project: CopilotProject, plan: ProjectPlanData, workload: WorkloadData, finance: FinancialData, totalIssues: number, openIssues: number, overdueIssues: number) {
  const revenueProgress = finance.summary.contractValue > 0 ? Math.round((finance.summary.revenueAmount / finance.summary.contractValue) * 100) : 0;
  const headline = `${project.code} đang ở mức ${scoreLabel(buildHealthScore(plan, workload, finance, openIssues, overdueIssues)).toLowerCase()}, execution ${plan.summary.executionProgress}% và còn ${openIssues}/${totalIssues} ISSUE đang mở.`;
  return [
    headline,
    `Timeline có ${plan.summary.blockedTasks} task blocked, ${plan.summary.overdueTasks} task quá hạn và ${plan.summary.overdueMilestones} milestone trễ.`,
    `Workload trung bình ${workload.summary.averageAllocation}%, ${workload.summary.overloadedMembers} nhân sự quá tải, còn ${workload.summary.availableHours.toLocaleString("vi-VN")}h capacity khả dụng.`,
    `Finance ghi nhận forecast ${finance.summary.forecastPercent}%, actual ${finance.summary.actualPercent}%, revenue ${revenueProgress}% giá trị hợp đồng.`,
  ];
}

function buildReport(project: CopilotProject, bullets: string[], risks: CopilotRisk[], actions: CopilotAction[], finance: FinancialData) {
  const sections = [
    { title: "1. Tóm tắt điều hành", body: bullets.join("\n") },
    { title: "2. Rủi ro chính", body: risks.length ? risks.slice(0, 5).map((risk) => `- ${risk.title}: ${risk.summary}`).join("\n") : "- Chưa ghi nhận rủi ro nổi bật." },
    { title: "3. Việc cần xử lý", body: actions.length ? actions.slice(0, 6).map((action) => `- ${action.title}: ${action.detail}${action.ownerName ? ` (${action.ownerName})` : ""}`).join("\n") : "- Chưa có hành động ưu tiên." },
    { title: "4. Tài chính", body: `Forecast ${finance.summary.forecastPercent}% (${money(finance.summary.forecastAmount)}), Actual ${finance.summary.actualPercent}% (${money(finance.summary.actualAmount)}), Revenue ${money(finance.summary.revenueAmount)}, Profit ${money(finance.summary.projectedProfitAmount)}, Margin ${finance.summary.projectedMarginPercent.toLocaleString("vi-VN")}%.` },
  ];
  return {
    title: `Báo cáo nhanh dự án ${project.code}`,
    sections,
    plainText: [`Báo cáo nhanh dự án ${project.code}`, "", ...sections.flatMap((section) => [section.title, section.body, ""])].join("\n").trim(),
  };
}

function buildPrompts(project: CopilotProject): CopilotData["prompts"] {
  return [
    { id: "weekly-report", title: "Viết báo cáo tuần", prompt: `Viết báo cáo tuần cho dự án ${project.code}, tập trung vào tiến độ, rủi ro, workload và finance.` },
    { id: "risk-plan", title: "Đề xuất xử lý rủi ro", prompt: `Dựa trên rủi ro hiện tại của ${project.code}, đề xuất 5 việc cần làm ngay trong tuần này.` },
    { id: "boss-summary", title: "Tóm tắt cho Boss", prompt: `Tóm tắt tình hình ${project.code} trong 5 gạch đầu dòng ngắn gọn cho cấp quản lý.` },
  ];
}

async function countRows(query: unknown) {
  const { count, error } = await query as { count: number | null; error: { message: string } | null };
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function buildProjectCopilotData(input: {
  source: CopilotData["source"];
  role: ProjectRole;
  project: CopilotProject;
  plan: ProjectPlanData;
  workload: WorkloadData;
  finance: FinancialData;
  totalIssues: number;
  openIssues: number;
  overdueIssues: number;
  nearDueIssues: IssueRow[];
}): CopilotData {
  const healthScore = buildHealthScore(input.plan, input.workload, input.finance, input.openIssues, input.overdueIssues);
  const metrics = buildMetrics(input.plan, input.workload, input.finance, input.totalIssues, input.openIssues, input.overdueIssues);
  const risks = buildRisks(input.plan, input.workload, input.finance, input.openIssues, input.overdueIssues);
  const actions = buildActions(input.plan, input.workload, input.finance, input.nearDueIssues);
  const summaryBullets = buildExecutiveSummary(input.project, input.plan, input.workload, input.finance, input.totalIssues, input.openIssues, input.overdueIssues);
  return {
    source: input.source,
    role: input.role,
    project: input.project,
    generatedAt: new Date().toISOString(),
    healthScore,
    healthLabel: scoreLabel(healthScore),
    confidence: Math.min(98, 62 + metrics.filter((metric) => metric.value !== 0 && metric.value !== "0%").length * 5),
    executiveSummary: summaryBullets[0] ?? "Copilot chưa có đủ dữ liệu để tóm tắt dự án.",
    summaryBullets,
    metrics: metrics.map((metric) => metric.label === "Health Score" ? { ...metric, value: healthScore } : metric),
    risks,
    actions,
    reportDraft: buildReport(input.project, summaryBullets, risks, actions, input.finance),
    prompts: buildPrompts(input.project),
  };
}

export function isCopilotMigrationMissing(message: string) {
  return isPlanningMigrationMissing(message) || /project_financial_months|capacity_hours_per_week|allocation_target_percent|estimated_hours|actual_hours|schema cache|relation .* does not exist/i.test(message);
}

export async function loadProjectCopilotData(supabase: SupabaseClient, projectId: string, role: ProjectRole): Promise<CopilotData> {
  const today = todayOnly();
  const nextWeek = addDays(7);
  const issueClosedFilter = `(${CLOSED_ISSUE_STATUSES.join(",")})`;
  const [projectResult, plan, workload, finance, totalIssues, closedIssues, overdueIssues, issueRows] = await Promise.all([
    supabase.from("projects").select("id,code,name,organization_name,status,start_date,due_date").eq("id", projectId).maybeSingle(),
    loadProjectPlan(supabase, projectId, role),
    loadWorkloadData(supabase, projectId, role),
    loadFinancialData(supabase, projectId, role),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).in("status_code", CLOSED_ISSUE_STATUSES)),
    countRows(supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).lt("due_date", today).not("status_code", "in", issueClosedFilter)),
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
  if (!projectResult.data) throw new Error("Project không tồn tại hoặc bạn không có quyền truy cập.");
  return buildProjectCopilotData({
    source: "database",
    role,
    project: projectFromRow(projectResult.data as ProjectRow),
    plan,
    workload,
    finance,
    totalIssues,
    openIssues: Math.max(0, totalIssues - closedIssues),
    overdueIssues,
    nearDueIssues: ((issueRows.data ?? []) as unknown as Array<Record<string, unknown>>).map(normalizeIssue),
  });
}
