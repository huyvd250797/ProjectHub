export type DashboardSource = "database" | "demo";

export type DashboardProject = {
  id: string;
  code: string;
  slug: string;
  name: string;
  organizationName: string;
  contractNo: string | null;
  contractValue: number | null;
  contractDate: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: "active" | "paused" | "completed" | "archived";
};

export type DashboardStage = {
  id: string;
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  progress: number;
};

export type DashboardDepartment = {
  id: string;
  name: string;
  total: number;
  done: number;
  handedOver: number;
  remaining: number;
  progress: number;
};

export type DashboardMember = {
  id: string;
  name: string;
  assigned: number;
  completed: number;
  remaining: number;
  progress: number;
};

export type DashboardData = {
  source: DashboardSource;
  generatedAt: string;
  project: DashboardProject;
  summary: {
    totalIssues: number;
    modules: number;
    subsystems: number;
    departments: number;
    contractDetails: number;
  };
  issueKpis: {
    waitingCustomer: number;
    waiting: number;
    processing: number;
    resolved: number;
    released: number;
    handedOver: number;
    notHandedOver: number;
    overdue: number;
  };
  attention: {
    overdue: number;
    missingAssignee: number;
    missingModule: number;
    missingDepartment: number;
    nearDue: number;
  };
  contract: {
    handoverProgress: number;
    handedOver: number;
    remaining: number;
  };
  schedule: {
    durationDays: number | null;
    elapsedDays: number | null;
    remainingDays: number | null;
    timeProgress: number | null;
    health: "on_track" | "near_deadline" | "overdue" | "not_scheduled";
  };
  stages: DashboardStage[];
  departments: DashboardDepartment[];
  members: DashboardMember[];
};

export type DashboardApiResponse =
  | { ok: true; data: DashboardData }
  | { ok: false; code: string; message: string };
