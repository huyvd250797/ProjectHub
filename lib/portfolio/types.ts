export type PortfolioSource = "database" | "demo";
export type PortfolioHealth = "on_track" | "at_risk" | "late" | "completed" | "not_scheduled";

export type PortfolioProjectRow = {
  id: string;
  code: string;
  name: string;
  organizationName: string | null;
  status: "active" | "paused" | "completed" | "archived";
  contractValue: number | null;
  startDate: string | null;
  dueDate: string | null;
  health: PortfolioHealth;
  totalIssues: number;
  openIssues: number;
  overdueIssues: number;
  modules: number;
  stages: number;
  stageProgress: number;
  milestones: number;
  overdueMilestones: number;
  tasks: number;
  blockedTasks: number;
  overdueTasks: number;
  openReminders: number;
  overdueReminders: number;
  alertScore: number;
  nextDueDate: string | null;
};

export type PortfolioSummary = {
  projectCount: number;
  activeProjects: number;
  atRiskProjects: number;
  lateProjects: number;
  totalIssues: number;
  openIssues: number;
  overdueIssues: number;
  openReminders: number;
  overdueReminders: number;
  totalContractValue: number;
};

export type PortfolioData = {
  source: PortfolioSource;
  generatedAt: string;
  summary: PortfolioSummary;
  projects: PortfolioProjectRow[];
};

export type PortfolioApiResponse =
  | { ok: true; data: PortfolioData }
  | { ok: false; code: string; message: string };
