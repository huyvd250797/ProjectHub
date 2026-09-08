import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoDataIntegrityReport } from "@/lib/data-integrity/demo";
import { isDataIntegritySourceMissing, loadDataIntegrityReport } from "@/lib/data-integrity/server";
import type { DataIntegrityApiResponse } from "@/lib/data-integrity/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId để chạy Data Integrity." } satisfies DataIntegrityApiResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoDataIntegrityReport(projectId) } satisfies DataIntegrityApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies DataIntegrityApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies DataIntegrityApiResponse, { status: 403 });

  try {
    const data = await loadDataIntegrityReport(supabase, projectId, role);
    return NextResponse.json({ ok: true, data } satisfies DataIntegrityApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không chạy được Data Integrity check.";
    const missing = isDataIntegritySourceMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "DATA_SOURCE_REQUIRED" : "DATA_INTEGRITY_QUERY_FAILED",
      message: missing ? "Data Integrity cần schema dữ liệu hiện có đến V3.2.3; bản V3.3.0 không thêm migration mới." : message,
    } satisfies DataIntegrityApiResponse, { status: missing ? 503 : 500 });
  }
}
