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
  userId: string;
  email: string | null;
  displayName: string | null;
  role: ProjectRole;
  isActive: boolean;
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
  | { ok: true; member?: MasterProjectMember; removedUserId?: string }
  | { ok: false; code: string; message: string };
