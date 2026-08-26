import { NextRequest, NextResponse } from "next/server";
import { createDemoActivity } from "@/lib/notifications/demo";
import { getProjectActivity } from "@/lib/notifications/server";
import type { ActivityApiResponse } from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProjectRole } from "@/lib/access";

export const dynamic = "force-dynamic";

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies ActivityApiResponse, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoActivity(projectId) } satisfies ActivityApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ActivityApiResponse, { status: 401 });
  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies ActivityApiResponse, { status: 403 });

  try {
    const data = await getProjectActivity(
      supabase,
      projectId,
      intParam(request.nextUrl.searchParams.get("page"), 1, 1, 100000),
      intParam(request.nextUrl.searchParams.get("pageSize"), 30, 10, 100),
      request.nextUrl.searchParams.get("group"),
    );
    return NextResponse.json({ ok: true, data } satisfies ActivityApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Activity Center.";
    const migrationMissing = /activity_events|relation .* does not exist/i.test(message);
    return NextResponse.json({ ok: false, code: migrationMissing ? "V110_MIGRATION_REQUIRED" : "ACTIVITY_LOAD_FAILED", message: migrationMissing ? "Activity Center V1.1.0 cần chạy migration 202608250001_v110_notifications_activity.sql trên Supabase." : message } satisfies ActivityApiResponse, { status: migrationMissing ? 503 : 500 });
  }
}
