import type { ProjectRole } from "@/lib/issues/types";

export type MasterProjectStatus = "active" | "paused" | "completed" | "archived";

export type MasterProjectRow = {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  organizationName: string | null;
  organizationCode: string | null;
  organizationAddress: string | null;
  status: MasterProjectStatus;
  contractNo: string | null;
  contractValue: number | null;
  contractDate: string | null;
  startDate: string | null;
  dueDate: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MasterProjectMember = {
  memberId: string;
  userId: string | null;
  personId: string;
  email: string | null;
  displayName: string | null;
  role: ProjectRole;
  isActive: boolean;
  loginLinked: boolean;
};

export type MasterProjectsResponse =
  | { ok: true; projects: MasterProjectRow[] }
  | { ok: false; code: string; message: string };

export type MasterProjectMutationResponse =
  | { ok: true; project: MasterProjectRow }
  | { ok: false; code: string; message: string };

export type MasterMembersResponse =
  | { ok: true; members: MasterProjectMember[] }
  | { ok: false; code: string; message: string };

export type MasterMemberMutationResponse =
  | { ok: true; member?: MasterProjectMember; removedMemberId?: string; assigneeSynced?: boolean; loginLinked?: boolean; message?: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };
