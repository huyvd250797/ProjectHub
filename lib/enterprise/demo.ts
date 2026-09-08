import { createDemoCommandCenter } from "@/lib/command-center/demo";
import { createDemoPortfolio } from "@/lib/portfolio/demo";
import { createDemoWorkload } from "@/lib/workload/demo";
import type { EnterpriseSuiteData } from "@/lib/enterprise/types";

function gateStatus(score: number) {
  if (score >= 80) return "ready" as const;
  if (score >= 55) return "attention" as const;
  return "blocked" as const;
}

export function createDemoEnterpriseSuite(projectId: string): EnterpriseSuiteData {
  const command = createDemoCommandCenter(projectId);
  const workload = createDemoWorkload(projectId);
  const portfolio = createDemoPortfolio();
  const projectPortfolio = portfolio.projects.find((project) => project.id === projectId);

  const dataQualityScore = Math.max(60, 100 - command.metrics.openIssues * 2);
  const deliveryScore = Math.max(35, Math.round(command.health.score * 0.78 + command.metrics.executionProgress * 0.22));
  const resourceScore = Math.max(20, 100 - workload.summary.overloadedMembers * 18 - workload.summary.averageAllocation / 3);
  const reportingScore = projectPortfolio ? Math.max(55, 100 - projectPortfolio.alertScore * 8) : 72;
  const scopeScore = command.metrics.modules > 0 ? 86 : 48;
  const maturityScore = Math.round((dataQualityScore + deliveryScore + resourceScore + reportingScore + scopeScore) / 5);

  return {
    source: "demo",
    generatedAt: new Date().toISOString(),
    project: command.project,
    maturityScore,
    maturityLevel: maturityScore >= 80 ? "Enterprise Ready" : maturityScore >= 60 ? "Managed" : "Needs Standardization",
    executiveSummary: "Demo V3.0.0 gom project health, dữ liệu vận hành, tải việc và reporting readiness vào một màn điều hành PMO.",
    kpis: [
      { id: "maturity", label: "Maturity Score", value: maturityScore, note: "Điểm chuẩn hóa quản trị dự án", tone: maturityScore >= 80 ? "emerald" : "amber" },
      { id: "project-health", label: "Project Health", value: command.health.score, note: command.health.label, tone: command.health.score >= 80 ? "emerald" : command.health.score >= 60 ? "amber" : "rose" },
      { id: "open-issues", label: "Open ISSUE", value: command.metrics.openIssues, note: `${command.metrics.overdueIssues} quá hạn`, tone: command.metrics.overdueIssues ? "rose" : "cyan" },
      { id: "resource", label: "Overloaded", value: workload.summary.overloadedMembers, note: `${workload.summary.availableMembers} người còn capacity`, tone: workload.summary.overloadedMembers ? "rose" : "emerald" },
      { id: "plan", label: "Execution", value: `${command.metrics.executionProgress}%`, note: `${command.metrics.blockedTasks} task blocked`, tone: command.metrics.blockedTasks ? "amber" : "cyan" },
      { id: "scope", label: "Scope Items", value: command.metrics.contractDetails, note: `${command.metrics.modules} module PLHĐ`, tone: "violet" },
    ],
    gates: [
      { id: "data", title: "Data Quality Gate", status: gateStatus(dataQualityScore), score: dataQualityScore, summary: "ISSUE, assignee, module, phòng ban và dữ liệu gốc cần đủ để hệ thống trở thành source of truth.", actions: [{ label: "Chuẩn hóa ISSUE", href: "/issues" }, { label: "Danh mục dự án", href: "/contract" }] },
      { id: "delivery", title: "Delivery Control Gate", status: gateStatus(deliveryScore), score: deliveryScore, summary: "Master Plan, stage, milestone và task execution cần được cập nhật đều để kiểm soát tiến độ.", actions: [{ label: "Mở Plan", href: "/plan" }, { label: "Command Center", href: "/command-center" }] },
      { id: "resource", title: "Resource Control Gate", status: gateStatus(resourceScore), score: resourceScore, summary: "Capacity, planned hours và overload cần rõ ràng trước khi giao thêm việc.", actions: [{ label: "Workload", href: "/workload" }, { label: "Allocation", href: "/resource-scheduling" }] },
      { id: "report", title: "Executive Reporting Gate", status: gateStatus(reportingScore), score: reportingScore, summary: "Dữ liệu quản trị cần đủ tốt để xuất báo cáo tuần/tháng và giải trình rủi ro.", actions: [{ label: "Báo cáo", href: "/reports" }, { label: "Portfolio", href: "/portfolio" }] },
      { id: "scope", title: "Scope Governance Gate", status: gateStatus(scopeScore), score: scopeScore, summary: "PLHĐ cần là phạm vi chuẩn trước khi tracking module/function và nghiệm thu.", actions: [{ label: "PLHĐ", href: "/contract" }] },
    ],
    operatingModel: [
      { id: "plan", title: "Plan Governance", owner: "PM", cadence: "Weekly", metric: "Stage progress, milestone hit rate", href: "/plan" },
      { id: "execution", title: "Execution Control", owner: "PM/Team Lead", cadence: "Daily", metric: "Open ISSUE, overdue, blocked task", href: "/issues" },
      { id: "resource", title: "Resource Allocation", owner: "PMO", cadence: "Weekly", metric: "Allocation %, overload hours", href: "/resource-scheduling" },
      { id: "reporting", title: "Executive Reporting", owner: "PM/BA", cadence: "Weekly/Monthly", metric: "Health score, risk trend", href: "/reports" },
    ],
    priorityActions: command.actions.slice(0, 8).map((action) => ({
      id: action.id,
      title: action.title,
      detail: action.detail,
      severity: action.severity,
      href: action.href,
    })),
  };
}
