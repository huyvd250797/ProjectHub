import type { ProjectRole } from "@/lib/issues/types";

export const DOCUMENT_CATEGORIES = ["minutes", "contract", "guide", "requirement", "report", "other"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_LINK_TYPES = ["project", "issue", "contract_item", "department", "resource", "other"] as const;
export type DocumentLinkType = (typeof DOCUMENT_LINK_TYPES)[number];

export type ProjectDocument = {
  id: string;
  projectId: string;
  title: string;
  originalFileName: string;
  category: DocumentCategory;
  description: string | null;
  linkType: DocumentLinkType;
  linkedEntityId: string | null;
  linkedEntityLabel: string | null;
  mimeType: string;
  sizeBytes: number;
  driveFileId: string;
  versionNo: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentSummary = {
  total: number;
  minutes: number;
  reports: number;
  totalBytes: number;
  latestAt: string | null;
};

export type DocumentListData = {
  source: "database" | "demo";
  projectId: string;
  role: ProjectRole;
  canUpload: boolean;
  canManage: boolean;
  driveReady: boolean;
  summary: DocumentSummary;
  rows: ProjectDocument[];
};

export type DocumentApiResponse =
  | { ok: true; data: DocumentListData }
  | { ok: false; code: string; message: string };

export type UploadSessionResponse =
  | {
      ok: true;
      sessionId: string;
      uploadToken: string;
      uploadUrl: string;
      expiresAt: string;
    }
  | { ok: false; code: string; message: string };

export type DocumentMutationResponse =
  | { ok: true; document: ProjectDocument; message?: string }
  | { ok: false; code: string; message: string };
