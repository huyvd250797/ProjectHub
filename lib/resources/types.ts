import type { ProjectRole } from "@/lib/issues/types";

export type ResourceType = "portal" | "server" | "database" | "folder" | "test" | "other";
export type ResourceEnvironment = "production" | "staging" | "test" | "development" | "other";

export type ResourceRow = {
  id: string;
  projectId: string;
  name: string;
  resourceType: string;
  environment: string | null;
  urlOrHost: string | null;
  remoteAddress: string | null;
  username: string | null;
  hasSecret: boolean;
  secretHint: string | null;
  notes: string | null;
  isSensitive: boolean;
  canReveal: boolean;
  canCopy: boolean;
  updatedAt: string;
};

export type ResourceSummary = {
  total: number;
  production: number;
  sensitive: number;
  withSecret: number;
};

export type ResourceData = {
  source: "database" | "demo";
  projectId: string;
  role: ProjectRole;
  canManage: boolean;
  canAudit: boolean;
  securityReady: boolean;
  summary: ResourceSummary;
  rows: ResourceRow[];
};

export type ResourceApiResponse =
  | { ok: true; data: ResourceData }
  | { ok: false; code: string; message: string };

export type ResourceMutationResponse =
  | { ok: true; resource: ResourceRow }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type ResourceActivity = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

export type ResourceDetailResponse =
  | { ok: true; resource: ResourceRow; activity: ResourceActivity[] }
  | { ok: false; code: string; message: string };

export type ResourceAccessResponse =
  | { ok: true; action: "reveal" | "copy" | "open_link"; secret?: string; hideAfterSeconds?: number }
  | { ok: false; code: string; message: string };
