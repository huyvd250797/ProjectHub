import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createResumableUploadSession, GoogleDriveError, googleDriveReady } from "@/lib/documents/google-drive";
import {
  cleanText,
  createUploadToken,
  isCategory,
  isLinkType,
  MAX_DOCUMENT_SIZE,
  resolveProjectDriveFolder,
  sanitizeFileName,
  UPLOAD_SESSION_TTL_MS,
  uuidOrNull,
} from "@/lib/documents/server";
import type { UploadSessionResponse } from "@/lib/documents/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BLOCKED_EXTENSIONS = [".exe", ".msi", ".bat", ".cmd", ".com", ".ps1", ".sh", ".php", ".jar"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, code: "DEMO_READONLY", message: "Demo Mode không tải file lên Google Drive." } satisfies UploadSessionResponse,
      { status: 409 },
    );
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies UploadSessionResponse,
      { status: 401 },
    );
  }
  if (!googleDriveReady()) {
    return NextResponse.json(
      { ok: false, code: "GOOGLE_DRIVE_NOT_CONFIGURED", message: "Chưa cấu hình Google Drive OAuth trên server." } satisfies UploadSessionResponse,
      { status: 503 },
    );
  }

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const projectId = cleanText(raw.projectId, 100);
  const rawFileName = cleanText(raw.fileName, 240);
  const fileName = rawFileName ? sanitizeFileName(rawFileName) : null;
  const mimeType = cleanText(raw.mimeType, 200) ?? "application/octet-stream";
  const sizeBytes = Number(raw.sizeBytes ?? 0);
  const title = cleanText(raw.title, 240) ?? fileName;
  const category = isCategory(raw.category) ? raw.category : "other";
  const linkType = isLinkType(raw.linkType) ? raw.linkType : "project";
  const description = cleanText(raw.description, 4000);
  const linkedEntityId = uuidOrNull(raw.linkedEntityId);
  const linkedEntityLabel = cleanText(raw.linkedEntityLabel, 300);

  if (!projectId || !fileName || !title || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_FAILED", message: "Project, tên file, tiêu đề và kích thước file là bắt buộc." } satisfies UploadSessionResponse,
      { status: 400 },
    );
  }
  if (sizeBytes > MAX_DOCUMENT_SIZE) {
    return NextResponse.json(
      { ok: false, code: "FILE_TOO_LARGE", message: "V1.4.0 hỗ trợ tối đa 250 MB cho mỗi file." } satisfies UploadSessionResponse,
      { status: 413 },
    );
  }
  if (BLOCKED_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension))) {
    return NextResponse.json(
      { ok: false, code: "FILE_TYPE_BLOCKED", message: "Không cho phép tải file thực thi hoặc script lên Project Documents." } satisfies UploadSessionResponse,
      { status: 400 },
    );
  }

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role || role === "viewer") {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Viewer không có quyền tải tài liệu lên." } satisfies UploadSessionResponse,
      { status: 403 },
    );
  }
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,code,name")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError || !project) {
    return NextResponse.json(
      { ok: false, code: "PROJECT_NOT_FOUND", message: "Không tìm thấy Project hoặc không có quyền truy cập." } satisfies UploadSessionResponse,
      { status: 404 },
    );
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Cần SUPABASE_SERVICE_ROLE_KEY để quản lý phiên upload an toàn." } satisfies UploadSessionResponse,
      { status: 503 },
    );
  }

  const sessionId = randomUUID();
  const { token: uploadToken, hash: uploadTokenHash } = createUploadToken();
  const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL_MS).toISOString();

  try {
    const folderId = await resolveProjectDriveFolder(supabase, projectId, String(project.code), String(project.name));
    const { error: sessionError } = await service.from("project_document_upload_sessions").insert({
      id: sessionId,
      project_id: projectId,
      user_id: user.id,
      upload_token_hash: uploadTokenHash,
      drive_folder_id: folderId,
      original_file_name: fileName,
      title,
      category,
      description,
      linked_entity_type: linkType,
      linked_entity_id: linkedEntityId,
      linked_entity_label: linkedEntityLabel,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      expires_at: expiresAt,
    });
    if (sessionError) throw new Error(`Không lưu được phiên upload: ${sessionError.message}`);

    try {
      const uploadUrl = await createResumableUploadSession({
        fileName,
        mimeType,
        sizeBytes,
        folderId,
        projectId,
        sessionId,
      });
      return NextResponse.json(
        { ok: true, sessionId, uploadToken, uploadUrl, expiresAt } satisfies UploadSessionResponse,
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      await service.from("project_document_upload_sessions").delete().eq("id", sessionId);
      throw error;
    }
  } catch (error) {
    const driveError = error instanceof GoogleDriveError ? error : null;
    return NextResponse.json(
      {
        ok: false,
        code: driveError?.code ?? "UPLOAD_SESSION_FAILED",
        message: error instanceof Error ? error.message : "Không khởi tạo được phiên upload.",
      } satisfies UploadSessionResponse,
      { status: driveError?.status ?? 500 },
    );
  }
}
