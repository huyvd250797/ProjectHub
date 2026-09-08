export type DataIntegritySource = "database" | "demo";
export type DataIntegritySeverity = "critical" | "high" | "medium" | "low";
export type DataIntegrityStatus = "clean" | "attention" | "blocked";
export type DataIntegrityDomain = "catalog" | "issue" | "plan" | "finance" | "workload";

export type DataIntegrityFinding = {
  id: string;
  domain: DataIntegrityDomain;
  severity: DataIntegritySeverity;
  title: string;
  detail: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  expectedSource: string;
  fixHint: string;
  href: string;
};

export type DataIntegrityDomainSummary = {
  domain: DataIntegrityDomain;
  label: string;
  status: DataIntegrityStatus;
  findingCount: number;
  criticalCount: number;
  highCount: number;
};

export type DataIntegrityMetrics = {
  issues: number;
  modules: number;
  departments: number;
  people: number;
  stages: number;
  milestones: number;
  tasks: number;
  financialMonths: number;
  findings: number;
  critical: number;
  high: number;
};

export type DataIntegrityReport = {
  source: DataIntegritySource;
  projectId: string;
  projectCode: string;
  generatedAt: string;
  status: DataIntegrityStatus;
  score: number;
  summary: string;
  metrics: DataIntegrityMetrics;
  domains: DataIntegrityDomainSummary[];
  findings: DataIntegrityFinding[];
};

export type DataIntegrityApiResponse =
  | { ok: true; data: DataIntegrityReport }
  | { ok: false; code: string; message: string };
