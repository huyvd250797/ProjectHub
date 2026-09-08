export type EnterpriseSuiteSource = "database" | "demo";
export type EnterpriseTone = "cyan" | "emerald" | "amber" | "rose" | "violet";
export type EnterpriseGateStatus = "ready" | "attention" | "blocked";

export type EnterpriseProject = {
  id: string;
  code: string;
  name: string;
  organizationName: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
};

export type EnterpriseKpi = {
  id: string;
  label: string;
  value: number | string;
  note: string;
  tone: EnterpriseTone;
};

export type EnterpriseGateAction = {
  label: string;
  href: string;
};

export type EnterpriseGate = {
  id: string;
  title: string;
  status: EnterpriseGateStatus;
  score: number;
  summary: string;
  actions: EnterpriseGateAction[];
};

export type EnterpriseOperatingPillar = {
  id: string;
  title: string;
  owner: string;
  cadence: string;
  metric: string;
  href: string;
};

export type EnterprisePriorityAction = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  href: string;
};

export type EnterpriseSuiteData = {
  source: EnterpriseSuiteSource;
  project: EnterpriseProject;
  generatedAt: string;
  maturityScore: number;
  maturityLevel: string;
  executiveSummary: string;
  kpis: EnterpriseKpi[];
  gates: EnterpriseGate[];
  operatingModel: EnterpriseOperatingPillar[];
  priorityActions: EnterprisePriorityAction[];
};

export type EnterpriseSuiteApiResponse =
  | { ok: true; data: EnterpriseSuiteData }
  | { ok: false; code: string; message: string };
