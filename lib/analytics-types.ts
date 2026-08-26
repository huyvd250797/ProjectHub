export type AnalyticsSource = "database" | "demo";

export type AnalyticsTrendPoint = {
  period: string;
  label: string;
  created: number;
  resolved: number;
};

export type AnalyticsBreakdown = {
  code: string;
  label: string;
  value: number;
  percent: number;
};

export type AnalyticsRiskRow = {
  id: string;
  name: string;
  total: number;
  open: number;
  overdue: number;
  highPriority: number;
  progress: number;
  riskScore: number;
};

export type AnalyticsMemberRow = AnalyticsRiskRow & {
  email: string | null;
};

export type ProjectAnalyticsData = {
  source: AnalyticsSource;
  generatedAt: string;
  projectId: string;
  projectCode: string;
  range: { from: string | null; to: string; days: number | null };
  health: {
    score: number;
    status: "healthy" | "watch" | "critical" | "no_data";
    issueScore: number;
    deliveryScore: number;
    overdueScore: number;
    dataQualityScore: number;
    scheduleScore: number;
  };
  summary: {
    total: number;
    open: number;
    resolved: number;
    released: number;
    handedOver: number;
    overdue: number;
    highPriorityOpen: number;
    createdInRange: number;
    resolvedInRange: number;
    avgAgeDays: number;
    avgResolutionDays: number;
  };
  backlogAging: Array<{ code: string; label: string; value: number; percent: number }>;
  statusDistribution: AnalyticsBreakdown[];
  priorityDistribution: AnalyticsBreakdown[];
  trend: AnalyticsTrendPoint[];
  topModules: AnalyticsRiskRow[];
  topDepartments: AnalyticsRiskRow[];
  members: AnalyticsMemberRow[];
  attention: {
    missingModule: number;
    missingDepartment: number;
    missingAssignee: number;
    nearDue: number;
  };
};

export type ProjectAnalyticsApiResponse =
  | { ok: true; data: ProjectAnalyticsData }
  | { ok: false; code: string; message: string };
