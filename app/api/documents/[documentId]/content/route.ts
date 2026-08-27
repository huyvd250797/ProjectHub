import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { fetchDriveFileContent, GoogleDriveError } from "@/lib/documents/google-drive";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeAsciiFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 160) || "document";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Demo Mode không có file thật." }, { status: 404 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  const { data: document } = await supabase
    .from("project_documents")
    .select("id,project_id,title,original_file_name,mime_type,drive_file_id,archived_at")
    .eq("id", documentId)
    .is("archived_at", null)
    .maybeSingle();
  if (!document) return NextResponse.json({ ok: false, message: "Không tìm thấy tài liệu." }, { status: 404 });
  const role = await getEffectiveProjectRole(supabase, String(document.project_id), user.id);
  if (!role) return NextResponse.json({ ok: false, message: "Bạn không có quyền xem tài liệu này." }, { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetchDriveFileContent(String(document.drive_file_id), request.headers.get("range"));
  } catch (error) {
    const driveError = error instanceof GoogleDriveError ? error : null;
    return NextResponse.json(
      { ok: false, code: driveError?.code ?? "DRIVE_CONTENT_FAILED", message: error instanceof Error ? error.message : "Không kết nối được Google Drive." },
      { status: driveError?.status ?? 502 },
    );
  }
  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ ok: false, message: `Google Drive không trả được nội dung file (${upstream.status}).` }, { status: 502 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const fileName = String(document.original_file_name || document.title || "document");
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || String(document.mime_type) || "application/octet-stream");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${safeAsciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
