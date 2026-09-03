import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { demoProjects } from "@/lib/projects";
import { createDemoPlan } from "@/lib/planning/demo";
import { isPlanningMigrationMissing, loadProjectPlan, recalculateProjectPlan } from "@/lib/planning/server";
import type { PlanningMutationResponse, ProjectPlanApiResponse } from "@/lib/planning/types";
import { parseMasterPlanInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Master Plan." } satisfies ProjectPlanApiResponse, { status: 400 });

  const supabase = await createClient();
  if (!supabase) {
    const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
    return NextResponse.json({ ok: true, data: createDemoPlan(projectId, project.code) } satisfies ProjectPlanApiResponse);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ProjectPlanApiResponse, { status: 401 });
  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies ProjectPlanApiResponse, { status: 403 });

  try {
    const data = await loadProjectPlan(supabase, projectId, role);
    return NextResponse.json({ ok: true, data } satisfies ProjectPlanApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Master Plan.";
    const missing = isPlanningMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V161_MIGRATION_REQUIRED" : "PLAN_LOAD_FAILED",
      message: missing ? "Module Kế hoạch cần chạy lần lượt migration V1.6.0 và 202609030002_v161_stage_date_range.sql trên Supabase." : message,
    } satisfies ProjectPlanApiResponse, { status: missing ? 503 : 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode chỉ hiển thị dữ liệu mẫu. Hãy kết nối Supabase để chỉnh sửa kế hoạch." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });

  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parseMasterPlanInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin Master Plan.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });

  const { input } = parsed;
  const role = await getEffectiveProjectRole(supabase, input.projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER, Admin hoặc PM được cập nhật Master Plan." } satisfies PlanningMutationResponse, { status: 403 });

  const { error } = await supabase.from("project_master_plans").upsert({
    project_id: input.projectId,
    title: input.title,
    objective: input.objective,
    start_date: input.startDate,
    target_end_date: input.targetEndDate,
    schedule_mode: input.scheduleMode,
    status: input.status,
    notes: input.notes,
    updated_by: user.id,
  }, { onConflict: "project_id" });

  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V161_MIGRATION_REQUIRED" : "MASTER_PLAN_SAVE_FAILED", message: missing ? "Hãy chạy các migration Kế hoạch đến V1.6.1 trước khi lưu Master Plan." : `Không lưu được Master Plan: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }

  if (input.recalculate) {
    try { await recalculateProjectPlan(supabase, input.projectId); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Không tính lại được timeline.";
      return NextResponse.json({ ok: false, code: "PLAN_RECALCULATE_FAILED", message: `Master Plan đã lưu nhưng chưa tính lại được timeline: ${message}` } satisfies PlanningMutationResponse, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: "Đã lưu Master Plan và cập nhật timeline." } satisfies PlanningMutationResponse);
}
