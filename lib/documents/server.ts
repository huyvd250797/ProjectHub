import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureDriveProjectFolder } from "./google-drive";
import type { DocumentCategory, DocumentLinkType, ProjectDocument } from "./types";

export const MAX_DOCUMENT_SIZE = 250 * 1024 * 1024;
export const UPLOAD_SESSION_TTL_MS = 60 * 60 * 1000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOrNull(value: unknown) {
  const cleaned = cleanText(value, 100);
  return cleaned && UUID_PATTERN.test(cleaned) ? cleaned : null;
}

export function cleanText(value: unknown, max = 2000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/:*?"<>|]/g, "-").trim();
  return (cleaned || "document.bin").slice(0, 220);
}

export function createUploadToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashUploadToken(token) };
}

export function hashUploadToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isCategory(value: unknown): value is DocumentCategory {
  return ["minutes", "contract", "guide", "requirement", "report", "other"].includes(String(value));
}

export function isLinkType(value: unknown): value is DocumentLinkType {
  return ["project", "issue", "contract_item", "department", "resource", "other"].includes(String(value));
}

export function normalizeDocument(row: Record<string, unknown>): ProjectDocument {
  const profile = (row.uploader ?? row.profiles) as { display_name?: string | null; email?: string | null } | null | undefined;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? row.original_file_name ?? "Tài liệu"),
    originalFileName: String(row.original_file_name ?? "document"),
    category: isCategory(row.category) ? row.category : "other",
    description: row.description ? String(row.description) : null,
    linkType: isLinkType(row.linked_entity_type) ? row.linked_entity_type : "project",
    linkedEntityId: row.linked_entity_id ? String(row.linked_entity_id) : null,
    linkedEntityLabel: row.linked_entity_label ? String(row.linked_entity_label) : null,
    mimeType: String(row.mime_type ?? "application/octet-stream"),
    sizeBytes: Number(row.size_bytes ?? 0),
    driveFileId: String(row.drive_file_id ?? ""),
    versionNo: Number(row.version_no ?? 1),
    uploadedBy: row.uploaded_by ? String(row.uploaded_by) : null,
    uploadedByName: profile?.display_name || profile?.email || null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export async function resolveProjectDriveFolder(
  supabase: SupabaseClient,
  projectId: string,
  projectCode: string,
  projectName: string,
) {
  const service = createServiceClient();
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình.");
  const { data: existing } = await service
    .from("project_document_folders")
    .select("drive_folder_id")
    .eq("project_id", projectId)
    .maybeSingle();
  if (existing?.drive_folder_id) return String(existing.drive_folder_id);

  const driveFolderId = await ensureDriveProjectFolder(projectId, projectCode, projectName);
  const { error } = await service.from("project_document_folders").upsert({
    project_id: projectId,
    drive_folder_id: driveFolderId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Không lưu được mapping thư mục Drive: ${error.message}`);
  return driveFolderId;
}

export async function logDocumentActivity(input: {
  projectId: string;
  userId: string;
  documentId: string;
  title: string;
  action: "upload" | "update" | "archive" | "restore";
}) {
  const service = createServiceClient();
  if (!service) return;
  const labels = {
    upload: "Tải tài liệu lên",
    update: "Cập nhật tài liệu",
    archive: "Lưu trữ tài liệu",
    restore: "Khôi phục tài liệu",
  };
  await service.from("activity_events").insert({
    project_id: input.projectId,
    actor_id: input.userId,
    event_type: `document_${input.action}`,
    entity_type: "document",
    entity_id: input.documentId,
    title: labels[input.action],
    summary: input.title,
    href: "/documents",
    source_key: `document:${input.documentId}:${input.action}:${Date.now()}`,
    metadata: { documentTitle: input.title, action: input.action },
  });
}
