import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { cleanText, isCategory, isLinkType, logDocumentActivity, normalizeDocument, uuidOrNull } from "@/lib/documents/server";
import type { DocumentMutationResponse } from "@/lib/documents/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function context(documentId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies DocumentMutationResponse, { status: 409 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies DocumentMutationResponse, { status: 401 }) };
  const { data: document } = await supabase.from("project_documents").select("*").eq("id", documentId).maybeSingle();
  if (!document) return { error: NextResponse.json({ ok: false, code: "DOCUMENT_NOT_FOUND", message: "Không tìm thấy tài liệu." } satisfies DocumentMutationResponse, { status: 404 }) };
  const role = await getEffectiveProjectRole(supabase, String(document.project_id), user.id);
  if (role !== "admin" && role !== "pm") return { error: NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER/Admin/PM được quản lý tài liệu." } satisfies DocumentMutationResponse, { status: 403 }) };
  return { supabase, user, document };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const resolved = await context(documentId);
  if ("error" in resolved) return resolved.error;
  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}

  const payload: Record<string, unknown> = {};
  const title = cleanText(raw.title, 240);
  if (title) payload.title = title;
  if (raw.description === null || typeof raw.description === "string") payload.description = cleanText(raw.description, 4000);
  if (isCategory(raw.category)) payload.category = raw.category;
  if (isLinkType(raw.linkType)) payload.linked_entity_type = raw.linkType;
  if (raw.linkedEntityId === null || typeof raw.linkedEntityId === "string") payload.linked_entity_id = uuidOrNull(raw.linkedEntityId);
  if (raw.linkedEntityLabel === null || typeof raw.linkedEntityLabel === "string") payload.linked_entity_label = cleanText(raw.linkedEntityLabel, 300);
  if (raw.archived === false) {
    payload.archived_at = null;
    payload.archived_by = null;
  }
  if (!Object.keys(payload).length) {
    return NextResponse.json({ ok: false, code: "NO_CHANGES", message: "Không có thông tin cần cập nhật." } satisfies DocumentMutationResponse, { status: 400 });
  }

  const { data, error } = await resolved.supabase.from("project_documents").update(payload).eq("id", documentId).select("*").single();
  if (error || !data) return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message: `Không cập nhật được tài liệu: ${error?.message ?? "unknown"}` } satisfies DocumentMutationResponse, { status: 500 });
  await logDocumentActivity({ projectId: String(data.project_id), userId: resolved.user.id, documentId, title: String(data.title), action: raw.archived === false ? "restore" : "update" });
  return NextResponse.json({ ok: true, document: normalizeDocument(data), message: "Đã cập nhật tài liệu." } satisfies DocumentMutationResponse);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const resolved = await context(documentId);
  if ("error" in resolved) return resolved.error;
  const now = new Date().toISOString();
  const { data, error } = await resolved.supabase.from("project_documents").update({ archived_at: now, archived_by: resolved.user.id }).eq("id", documentId).select("*").single();
  if (error || !data) return NextResponse.json({ ok: false, code: "ARCHIVE_FAILED", message: `Không lưu trữ được tài liệu: ${error?.message ?? "unknown"}` } satisfies DocumentMutationResponse, { status: 500 });
  await logDocumentActivity({ projectId: String(data.project_id), userId: resolved.user.id, documentId, title: String(data.title), action: "archive" });
  return NextResponse.json({ ok: true, document: normalizeDocument(data), message: "Đã lưu trữ metadata; file gốc vẫn an toàn trên Google Drive." } satisfies DocumentMutationResponse);
}
