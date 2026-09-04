import type { PlanHealth, PlanTaskPriority, SmartPlanAlertSeverity } from "@/lib/planning/types";

export type CommandCenterSource = "database" | "demo";

export type CommandCenterActionType = "issue" | "task" | "milestone" | "reminder" | "stage" | "system";
export type CommandCenterActionSeverity = "info" | "warning" | "critical";

export type CommandCenterProject = {
  id: string;
  code: string;
  name: string;
  organizationName: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
};

export type CommandCenterMetric = {
  label: string;
  value: number | string;
  note: string;
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet";
};

export type CommandCenterAction = {
  id: string;
  type: CommandCenterActionType;
  title: string;
  detail: string;
  dueDate: string | null;
  ownerName: string | null;
  severity: CommandCenterActionSeverity;
  href: string;
};

export type CommandCenterRisk = {
  id: string;
  title: string;
  summary: string;
  severity: SmartPlanAlertSeverity;
  href: string;
};

export type CommandCenterStage = {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
};

export type CommandCenterMilestone = {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  ownerName: string | null;
};

export type CommandCenterData = {
  source: CommandCenterSource;
  generatedAt: string;
  project: CommandCenterProject;
  health: {
    score: number;
    label: string;
    planHealth: PlanHealth;
  };
  metrics: {
    projectProgress: number;
    executionProgress: number;
    openIssues: number;
    overdueIssues: number;
    blockedTasks: number;
    openReminders: number;
    overdueReminders: number;
    modules: number;
    departments: number;
    contractDetails: number;
  };
  cards: CommandCenterMetric[];
  actions: CommandCenterAction[];
  risks: CommandCenterRisk[];
  stages: CommandCenterStage[];
  milestones: CommandCenterMilestone[];
  quickLinks: Array<{ label: string; href: string; description: string }>;
};

export type CommandCenterApiResponse =
  | { ok: true; data: CommandCenterData }
  | { ok: false; code: string; message: string };

export function prioritySeverity(priority: PlanTaskPriority): CommandCenterActionSeverity {
  if (priority === "critical") return "critical";
  if (priority === "high") return "warning";
  return "info";
}
