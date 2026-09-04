import { createDemoDashboard } from "@/lib/dashboard/demo";
import { demoProjects } from "@/lib/projects";
import { createDemoPlan } from "@/lib/planning/demo";
import type { CommandCenterData } from "@/lib/command-center/types";
import { prioritySeverity } from "@/lib/command-center/types";

export function createDemoCommandCenter(projectId: string): CommandCenterData {
  const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
  const dashboard = createDemoDashboard(project);
  const plan = createDemoPlan(project.id, project.code);
  const riskPenalty = dashboard.attention.overdue * 5 + plan.summary.blockedTasks * 10 + plan.summary.overdueReminders * 6;
  const score = Math.max(0, Math.min(100, Math.round(plan.summary.executionProgress * 0.5 + dashboard.contract.handoverProgress * 0.5 - riskPenalty)));

  const actions = [
    ...plan.tasks
      .filter((task) => task.status !== "done")
      .slice(0, 4)
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
      .slice(0, 3)
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type: "reminder" as const,
        title: reminder.title,
        detail: reminder.entityTitle ? `Nhắc cho ${reminder.entityTitle}` : "Nhắc việc thủ công",
        dueDate: reminder.snoozedUntil ?? reminder.remindAt,
        ownerName: reminder.ownerName,
        severity: prioritySeverity(reminder.priority),
        href: "/plan",
      })),
  ].slice(0, 7);

  return {
    source: "demo",
    generatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      organizationName: project.organizationName,
      status: project.status,
      startDate: dashboard.project.startDate,
      dueDate: dashboard.project.dueDate,
    },
    health: {
      score,
      label: score >= 80 ? "ON TRACK" : score >= 60 ? "NEEDS ATTENTION" : "AT RISK",
      planHealth: plan.summary.health,
    },
    metrics: {
      projectProgress: plan.summary.overallProgress,
      executionProgress: plan.summary.executionProgress,
      openIssues: dashboard.summary.totalIssues - dashboard.issueKpis.resolved - dashboard.issueKpis.released,
      overdueIssues: dashboard.issueKpis.overdue,
      blockedTasks: plan.summary.blockedTasks,
      openReminders: plan.summary.openReminders,
      overdueReminders: plan.summary.overdueReminders,
      modules: dashboard.summary.modules,
      departments: dashboard.summary.departments,
      contractDetails: dashboard.summary.contractDetails,
    },
    cards: [
      { label: "Health Score", value: score, note: "Tổng hợp plan, handover và rủi ro", tone: score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose" },
      { label: "Execution", value: `${plan.summary.executionProgress}%`, note: `${plan.summary.completedTasks}/${plan.summary.taskCount} task hoàn tất`, tone: "cyan" },
      { label: "Open Issues", value: dashboard.summary.totalIssues - dashboard.issueKpis.resolved - dashboard.issueKpis.released, note: `${dashboard.issueKpis.overdue} issue quá hạn`, tone: dashboard.issueKpis.overdue ? "rose" : "violet" },
      { label: "Reminders", value: plan.summary.openReminders, note: `${plan.summary.overdueReminders} reminder quá hạn`, tone: plan.summary.overdueReminders ? "rose" : "amber" },
      { label: "PLHĐ Scope", value: dashboard.summary.modules, note: `${dashboard.summary.contractDetails} chi tiết PLHĐ`, tone: "emerald" },
      { label: "Milestones", value: `${plan.summary.completedMilestones}/${plan.summary.milestoneCount}`, note: `${plan.summary.overdueMilestones} milestone trễ`, tone: plan.summary.overdueMilestones ? "rose" : "cyan" },
    ],
    actions,
    risks: plan.smartAlerts.slice(0, 6).map((alert) => ({
      id: alert.id,
      title: alert.title,
      summary: alert.summary,
      severity: alert.severity,
      href: "/plan",
    })),
    stages: plan.stages.map((stage) => ({
      id: stage.id,
      code: stage.code,
      name: stage.name,
      status: stage.status,
      progress: stage.progress,
      startDate: stage.startDate,
      endDate: stage.endDate,
    })),
    milestones: plan.milestones.slice(0, 6).map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      dueDate: milestone.dueDate,
      ownerName: milestone.ownerName,
    })),
    quickLinks: [
      { label: "Mở Master Plan", href: "/plan", description: "Cập nhật stage, task, reminder và milestone" },
      { label: "Xem ISSUE", href: "/issues", description: "Lọc các việc đang chờ xử lý hoặc quá hạn" },
      { label: "Kiểm tra PLHĐ", href: "/contract", description: "Đối chiếu phạm vi module và chi tiết PLHĐ" },
      { label: "Portfolio", href: "/portfolio", description: "So sánh rủi ro toàn bộ project" },
    ],
  };
}
