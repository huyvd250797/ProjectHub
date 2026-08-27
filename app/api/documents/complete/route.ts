import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { getDriveFile, GoogleDriveError } from "@/lib/documents/google-drive";
import { hashUploadToken, logDocumentActivity, normalizeDocument } from "@/lib/documents/server";
import type { DocumentMutationResponse } from "@/lib/documents/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function equalHash(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const service = createServiceClient();
  if (!supabase || !service) {
    return NextResponse.json(
      { ok: false, code: "SERVER_NOT_READY", message: "Supabase hoặc Service Role chưa được cấu hình." } satisfies DocumentMutationResponse,
      { status: 503 },
    );
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies DocumentMutationResponse,
      { status: 401 },
    );
  }

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const sessionId = typeof raw.sessionId === "string" ? raw.sessionId.trim() : "";
  const uploadToken = typeof raw.uploadToken === "string" ? raw.uploadToken.trim() : "";
  const driveFileId = typeof raw.driveFileId === "string" ? raw.driveFileId.trim() : "";
  if (!sessionId || !uploadToken || !driveFileId) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_FAILED", message: "Thiếu thông tin hoàn tất upload." } satisfies DocumentMutationResponse,
      { status: 400 },
    );
  }

  const { data: session, error: sessionError } = await service
    .from("project_document_upload_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError || !session || session.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, code: "UPLOAD_SESSION_NOT_FOUND", message: "Phiên upload không tồn tại hoặc không thuộc người dùng hiện tại." } satisfies DocumentMutationResponse,
      { status: 404 },
    );
  }
  if (!equalHash(hashUploadToken(uploadToken), String(session.upload_token_hash))) {
    return NextResponse.json(
      { ok: false, code: "UPLOAD_TOKEN_INVALID", message: "Upload token không hợp lệ." } satisfies DocumentMutationResponse,
      { status: 403 },
    );
  }
  if (session.status === "completed" && session.document_id) {
    const { data: existing } = await service.from("project_documents").select("*").eq("id", session.document_id).maybeSingle();
    if (existing) return NextResponse.json({ ok: true, document: normalizeDocument(existing), message: "Tài liệu đã được ghi nhận trước đó." } satisfies DocumentMutationResponse);
  }
  if (session.status !== "pending" || new Date(session.expires_at).getTime() <= Date.now()) {
    await service.from("project_document_upload_sessions").update({ status: "expired" }).eq("id", sessionId).eq("status", "pending");
    return NextResponse.json(
      { ok: false, code: "UPLOAD_SESSION_EXPIRED", message: "Phiên upload đã hết hạn. Hãy tải file lại." } satisfies DocumentMutationResponse,
      { status: 410 },
    );
  }

  const role = await getEffectiveProjectRole(supabase, String(session.project_id), user.id);
  if (!role || role === "viewer") {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Bạn không còn quyền tải tài liệu lên Project này." } satisfies DocumentMutationResponse,
      { status: 403 },
    );
  }

  try {
    const driveFile = await getDriveFile(driveFileId);
    const expectedSize = Number(session.size_bytes);
    const actualSize = Number(driveFile.size ?? 0);
    const validParent = driveFile.parents?.includes(String(session.drive_folder_id));
    const validSession = driveFile.appProperties?.ascWorkingUploadSessionId === sessionId;
    if (driveFile.trashed || !validParent || !validSession || actualSize !== expectedSize) {
      return NextResponse.json(
        { ok: false, code: "DRIVE_FILE_VERIFICATION_FAILED", message: "File trên Google Drive không khớp phiên upload đã cấp." } satisfies DocumentMutationResponse,
        { status: 409 },
      );
    }

    const { data: document, error: insertError } = await service
      .from("project_documents")
      .insert({
        project_id: session.project_id,
        upload_session_id: sessionId,
        title: session.title,
        original_file_name: session.original_file_name,
        category: session.category,
        description: session.description,
        linked_entity_type: session.linked_entity_type,
        linked_entity_id: session.linked_entity_id,
        linked_entity_label: session.linked_entity_label,
        drive_file_id: driveFile.id,
        drive_folder_id: session.drive_folder_id,
        drive_md5_checksum: driveFile.md5Checksum ?? null,
        mime_type: driveFile.mimeType ?? session.mime_type,
        size_bytes: actualSize,
        uploaded_by: user.id,
      })
      .select("*")
      .single();
    if (insertError || !document) {
      if (insertError?.code === "23505") {
        const { data: existing } = await service.from("project_documents").select("*").eq("upload_session_id", sessionId).maybeSingle();
        if (existing) return NextResponse.json({ ok: true, document: normalizeDocument(existing) } satisfies DocumentMutationResponse);
      }
      throw new Error(`Không ghi được metadata tài liệu: ${insertError?.message ?? "unknown"}`);
    }

    await service.from("project_document_upload_sessions").update({
      status: "completed",
      drive_file_id: driveFile.id,
      document_id: document.id,
      completed_at: new Date().toISOString(),
    }).eq("id", sessionId);
    await logDocumentActivity({
      projectId: String(session.project_id),
      userId: user.id,
      documentId: String(document.id),
      title: String(document.title),
      action: "upload",
    });
    return NextResponse.json(
      { ok: true, document: normalizeDocument(document), message: "Đã lưu tài liệu vào Google Drive." } satisfies DocumentMutationResponse,
      { status: 201 },
    );
  } catch (error) {
    const driveError = error instanceof GoogleDriveError ? error : null;
    return NextResponse.json(
      {
        ok: false,
        code: driveError?.code ?? "DOCUMENT_COMPLETE_FAILED",
        message: error instanceof Error ? error.message : "Không hoàn tất được tài liệu.",
      } satisfies DocumentMutationResponse,
      { status: driveError?.status ?? 500 },
    );
  }
}
