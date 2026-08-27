import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoDocumentList } from "@/lib/documents/demo";
import { googleDriveReady } from "@/lib/documents/google-drive";
import { normalizeDocument } from "@/lib/documents/server";
import type { DocumentApiResponse } from "@/lib/documents/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json(
      { ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies DocumentApiResponse,
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, data: createDemoDocumentList(projectId) } satisfies DocumentApiResponse);
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies DocumentApiResponse,
      { status: 401 },
    );
  }
  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project này." } satisfies DocumentApiResponse,
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("project_documents")
    .select("id,project_id,title,original_file_name,category,description,linked_entity_type,linked_entity_id,linked_entity_label,mime_type,size_bytes,drive_file_id,version_no,uploaded_by,created_at,updated_at,uploader:profiles!project_documents_uploaded_by_fkey(display_name,email)")
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    const missing = /project_documents|schema cache|relation .* does not exist/i.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        code: missing ? "V140_MIGRATION_REQUIRED" : "DOCUMENT_QUERY_FAILED",
        message: missing
          ? "Project Documents cần chạy migration V1.4.0."
          : `Không tải được tài liệu: ${error.message}`,
      } satisfies DocumentApiResponse,
      { status: missing ? 503 : 500 },
    );
  }

  const rows = (data ?? []).map((row) => normalizeDocument(row as unknown as Record<string, unknown>));
  return NextResponse.json(
    {
      ok: true,
      data: {
        source: "database",
        projectId,
        role,
        canUpload: role !== "viewer",
        canManage: role === "admin" || role === "pm",
        driveReady: googleDriveReady(),
        summary: {
          total: rows.length,
          minutes: rows.filter((row) => row.category === "minutes").length,
          reports: rows.filter((row) => row.category === "report").length,
          totalBytes: rows.reduce((sum, row) => sum + row.sizeBytes, 0),
          latestAt: rows[0]?.createdAt ?? null,
        },
        rows,
      },
    } satisfies DocumentApiResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}
