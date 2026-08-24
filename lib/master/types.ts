import type { ProjectRole } from "@/lib/issues/types";

export type MasterProjectRow = {
  id: string;
  code: string;
  slug: string;
  name: string;
  organizationName: string | null;
  status: "active" | "paused" | "completed" | "archived";
  contractNo: string | null;
  startDate: string | null;
  dueDate: string | null;
  memberCount: number;
  createdAt: string;
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
