import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, recalculateProjectPlan } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const projectId = raw && typeof raw === "object" && "projectId" in raw ? String(raw.projectId ?? "").trim() : "";
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies PlanningMutationResponse, { status: 400 });
  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER, Admin hoặc PM được tính lại timeline." } satisfies PlanningMutationResponse, { status: 403 });
  try {
    await recalculateProjectPlan(supabase, projectId);
    return NextResponse.json({ ok: true, message: "Đã tính lại các stage tự động và giữ nguyên khoảng ngày nhập thủ công." } satisfies PlanningMutationResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tính lại được timeline.";
    const missing = isPlanningMigrationMissing(message);
    return NextResponse.json({ ok: false, code: missing ? "V161_MIGRATION_REQUIRED" : "PLAN_RECALCULATE_FAILED", message: missing ? "Hãy chạy migration V1.6.1 trước khi tính timeline." : message } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
}
