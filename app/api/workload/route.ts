import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing } from "@/lib/planning/server";
import { createClient } from "@/lib/supabase/server";
import { createDemoWorkload } from "@/lib/workload/demo";
import { loadWorkloadData } from "@/lib/workload/server";
import type { WorkloadApiResponse } from "@/lib/workload/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Workload & Capacity Planning." } satisfies WorkloadApiResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoWorkload(projectId) } satisfies WorkloadApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies WorkloadApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies WorkloadApiResponse, { status: 403 });

  try {
    const data = await loadWorkloadData(supabase, projectId, role);
    return NextResponse.json({ ok: true, data } satisfies WorkloadApiResponse, { headers: { "Cache-Control": "private, max-age=8, stale-while-revalidate=20", Vary: "Cookie" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Workload & Capacity Planning.";
    const missing = isPlanningMigrationMissing(message);
    const resourceMissing = /capacity_hours_per_week|allocation_target_percent|estimated_hours|actual_hours|schema cache/i.test(message);
    return NextResponse.json({
      ok: false,
      code: resourceMissing ? "V250_MIGRATION_REQUIRED" : missing ? "V240_PLAN_SOURCE_REQUIRED" : "WORKLOAD_QUERY_FAILED",
      message: resourceMissing ? "Hãy chạy migration V2.5.0 trước khi dùng Resource Allocation Foundation." : missing ? "Workload cần dữ liệu Plan/Execution/Reminder hiện có để tổng hợp tải việc nhân sự." : message,
    } satisfies WorkloadApiResponse, { status: missing || resourceMissing ? 503 : 500 });
  }
}
