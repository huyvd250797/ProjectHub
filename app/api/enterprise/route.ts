import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoEnterpriseSuite } from "@/lib/enterprise/demo";
import { loadEnterpriseSuiteData } from "@/lib/enterprise/server";
import type { EnterpriseSuiteApiResponse } from "@/lib/enterprise/types";
import { isPlanningMigrationMissing } from "@/lib/planning/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Enterprise Project Suite." } satisfies EnterpriseSuiteApiResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoEnterpriseSuite(projectId) } satisfies EnterpriseSuiteApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies EnterpriseSuiteApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies EnterpriseSuiteApiResponse, { status: 403 });

  try {
    const data = await loadEnterpriseSuiteData(supabase, projectId, role);
    return NextResponse.json({ ok: true, data } satisfies EnterpriseSuiteApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Enterprise Project Suite.";
    const missingPlan = isPlanningMigrationMissing(message);
    const missingResource = /capacity_hours_per_week|allocation_target_percent|estimated_hours|resource_assignment_events|schema cache/i.test(message);
    return NextResponse.json({
      ok: false,
      code: missingResource ? "V250_V260_REQUIRED" : missingPlan ? "PLAN_STACK_REQUIRED" : "ENTERPRISE_SUITE_QUERY_FAILED",
      message: missingResource
        ? "Enterprise Suite cần dữ liệu Resource Allocation/Assignment Board đến V2.6.x."
        : missingPlan
          ? "Enterprise Suite cần dữ liệu Master Plan/Execution/Reminder hiện có."
          : message,
    } satisfies EnterpriseSuiteApiResponse, { status: missingPlan || missingResource ? 503 : 500 });
  }
}
