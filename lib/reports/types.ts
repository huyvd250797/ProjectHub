export type ReportPeriodType = "week" | "month" | "30d" | "90d" | "all" | "custom";

export type ExecutiveRiskRow = {
  id: string;
  name: string;
  open: number;
  overdue: number;
  highPriority: number;
  riskScore: number;
};

export type ExecutiveMemberRow = ExecutiveRiskRow & {
  email: string | null;
  total: number;
  progress: number;
};

export type ExecutiveReportSnapshot = {
  id: string;
  reportKey: string;
  title: string | null;
  periodType: ReportPeriodType;
  periodStart: string | null;
  periodEnd: string;
  pmComment: string | null;
  nextPlan: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  metrics: {
    healthScore: number;
    open: number;
    overdue: number;
    highPriorityOpen: number;
    handoverProgress: number;
    resolvedInRange: number;
    createdInRange: number;
  };
};

export type ExecutiveReportData = {
  source: "database" | "demo";
  generatedAt: string;
  role: "admin" | "pm" | "member" | "viewer";
  canSaveSnapshot: boolean;
  snapshotFeatureReady: boolean;
  project: {
    id: string;
    code: string;
    name: string;
    organizationName: string;
    status: "active" | "paused" | "completed" | "archived";
    contractNo: string | null;
    contractValue: number | null;
    contractDate: string | null;
    startDate: string | null;
    dueDate: string | null;
  };
  period: {
    type: ReportPeriodType;
    from: string | null;
    to: string;
    label: string;
  };
  health: {
    score: number;
    status: "healthy" | "watch" | "critical" | "no_data";
  };
  summary: {
    total: number;
    open: number;
    resolved: number;
    released: number;
    overdue: number;
    highPriorityOpen: number;
    createdInRange: number;
    resolvedInRange: number;
    handedOver: number;
    handoverProgress: number;
    avgAgeDays: number;
    avgResolutionDays: number;
  };
  schedule: {
    timeProgress: number | null;
    remainingDays: number | null;
    health: "on_track" | "near_deadline" | "overdue" | "not_scheduled";
  };
  attention: {
    missingModule: number;
    missingDepartment: number;
    missingAssignee: number;
    nearDue: number;
  };
  topModules: ExecutiveRiskRow[];
  topDepartments: ExecutiveRiskRow[];
  members: ExecutiveMemberRow[];
  previousSnapshot: ExecutiveReportSnapshot | null;
  snapshots: ExecutiveReportSnapshot[];
};

export type ExecutiveReportApiResponse =
  | { ok: true; data: ExecutiveReportData }
  | { ok: false; code: string; message: string };

export type ReportSnapshotMutationResponse =
  | { ok: true; snapshot: ExecutiveReportSnapshot }
  | { ok: false; code: string; message: string };
