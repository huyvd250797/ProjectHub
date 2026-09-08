import type { ProjectRole } from "@/lib/issues/types";

export type CopilotSource = "database" | "demo";
export type CopilotDomain = "project" | "timeline" | "issue" | "workload" | "finance" | "report";
export type CopilotSeverity = "good" | "info" | "warning" | "critical";

export type CopilotProject = {
  id: string;
  code: string;
  name: string;
  organizationName: string | null;
  status: string | null;
  startDate: string | null;
  dueDate: string | null;
};

export type CopilotMetric = {
  label: string;
  value: number | string;
  note: string;
  severity: CopilotSeverity;
};

export type CopilotAction = {
  id: string;
  title: string;
  detail: string;
  reason: string;
  domain: CopilotDomain;
  severity: CopilotSeverity;
  href: string;
  dueDate: string | null;
  ownerName: string | null;
};

export type CopilotRisk = {
  id: string;
  title: string;
  summary: string;
  domain: CopilotDomain;
  severity: CopilotSeverity;
  href: string;
};

export type CopilotReportSection = {
  title: string;
  body: string;
};

export type CopilotPrompt = {
  id: string;
  title: string;
  prompt: string;
};

export type CopilotData = {
  source: CopilotSource;
  role: ProjectRole;
  project: CopilotProject;
  generatedAt: string;
  healthScore: number;
  healthLabel: string;
  confidence: number;
  executiveSummary: string;
  summaryBullets: string[];
  metrics: CopilotMetric[];
  risks: CopilotRisk[];
  actions: CopilotAction[];
  reportDraft: {
    title: string;
    sections: CopilotReportSection[];
    plainText: string;
  };
  prompts: CopilotPrompt[];
};

export type CopilotApiResponse =
  | { ok: true; data: CopilotData }
  | { ok: false; code: string; message: string };
