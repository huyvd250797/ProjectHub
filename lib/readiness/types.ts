export type ReadinessStatus = "pass" | "warn" | "fail";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  message: string;
  durationMs?: number;
};

export type ReadinessData = {
  app: "ASC WORKING";
  version: "1.3.2";
  projectId: string;
  generatedAt: string;
  overall: "ready" | "attention" | "blocked";
  checks: ReadinessCheck[];
  metrics: {
    issues: number;
    modules: number;
    departments: number;
    resources: number;
    missingAssignee: number;
    missingModule: number;
    missingDepartment: number;
    overdue: number;
  };
};

export type ReadinessApiResponse =
  | { ok: true; data: ReadinessData }
  | { ok: false; code: string; message: string };
