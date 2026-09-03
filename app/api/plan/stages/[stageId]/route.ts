import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, planningOwnerExists, recalculateProjectPlan, resolveStageDuration } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parseStageInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canEdit(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, userId: string) {
  const role = await getEffectiveProjectRole(supabase, projectId, userId);
  return role === "admin" || role === "pm";
}

export async function PUT(request: NextRequest, context: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parseStageInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin stage.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền sửa Project Stage." } satisfies PlanningMutationResponse, { status: 403 });
  if (!await planningOwnerExists(supabase, input.projectId, input.ownerId)) return NextResponse.json({ ok: false, code: "OWNER_INVALID", message: "Người phụ trách không còn thuộc Project.", fieldErrors: { ownerId: "Vui lòng chọn lại thành viên Project." } } satisfies PlanningMutationResponse, { status: 400 });

  let durationDays = input.durationDays;
  try { durationDays = await resolveStageDuration(supabase, input); }
  catch (error) { return NextResponse.json({ ok: false, code: "STAGE_SCHEDULE_FAILED", message: error instanceof Error ? error.message : "Không xác định được cách tính ngày của Master Plan." } satisfies PlanningMutationResponse, { status: 500 }); }
  if (durationDays < 1 || durationDays > 3_650) return NextResponse.json({ ok: false, code: "STAGE_DATE_RANGE_INVALID", message: "Khoảng ngày stage không hợp lệ.", fieldErrors: { endDate: durationDays < 1 ? "Khoảng đã chọn không có ngày làm việc." : "Khoảng ngày tối đa 3.650 ngày theo lịch Master Plan." } } satisfies PlanningMutationResponse, { status: 400 });

  const { data: currentStage, error: currentError } = await supabase.from("project_stages").select("id,code").eq("project_id", input.projectId).eq("id", stageId).maybeSingle();
  if (currentError) return NextResponse.json({ ok: false, code: "STAGE_UPDATE_FAILED", message: currentError.message } satisfies PlanningMutationResponse, { status: 500 });
  if (!currentStage) return NextResponse.json({ ok: false, code: "STAGE_NOT_FOUND", message: "Stage không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  if (String(currentStage.code).toUpperCase() !== input.code) return NextResponse.json({ ok: false, code: "STAGE_CODE_IMMUTABLE", message: "Không thể đổi mã stage vì mã đang được ISSUE sử dụng làm liên kết.", fieldErrors: { code: "Mã stage được khóa sau khi tạo." } } satisfies PlanningMutationResponse, { status: 409 });

  const update: Record<string, unknown> = {
    code: input.code,
    name: input.name,
    description: input.description,
    duration_days: durationDays,
    date_mode: input.dateMode,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
    progress: input.progress,
    color: input.color,
    owner_person_id: input.ownerId,
  };
  if (input.sortOrder !== null) update.sort_order = input.sortOrder;
  const { data, error } = await supabase.from("project_stages").update(update).eq("project_id", input.projectId).eq("id", stageId).select("id").maybeSingle();
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    const duplicate = error.code === "23505";
    return NextResponse.json({ ok: false, code: missing ? "V161_MIGRATION_REQUIRED" : duplicate ? "STAGE_CODE_EXISTS" : "STAGE_UPDATE_FAILED", message: missing ? "Hãy chạy migration V1.6.1 trước khi sửa stage." : duplicate ? `Mã stage ${input.code} đã tồn tại.` : `Không cập nhật được stage: ${error.message}`, fieldErrors: duplicate ? { code: "Mã stage đã tồn tại." } : undefined } satisfies PlanningMutationResponse, { status: missing ? 503 : duplicate ? 409 : 500 });
  }
  if (!data) return NextResponse.json({ ok: false, code: "STAGE_NOT_FOUND", message: "Stage không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  if (input.recalculate) {
    try { await recalculateProjectPlan(supabase, input.projectId); } catch {}
  }
  return NextResponse.json({ ok: true, message: `Đã cập nhật stage ${input.name}.` } satisfies PlanningMutationResponse);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  if (!projectId || !await canEdit(supabase, projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xóa Project Stage." } satisfies PlanningMutationResponse, { status: 403 });

  const { data: stage, error: stageError } = await supabase.from("project_stages").select("id,code").eq("project_id", projectId).eq("id", stageId).maybeSingle();
  if (stageError) return NextResponse.json({ ok: false, code: "STAGE_DELETE_FAILED", message: stageError.message } satisfies PlanningMutationResponse, { status: 500 });
  if (!stage) return NextResponse.json({ ok: false, code: "STAGE_NOT_FOUND", message: "Stage không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  const { count: issueCount, error: issueError } = await supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("stage_code", stage.code);
  if (issueError) return NextResponse.json({ ok: false, code: "STAGE_USAGE_CHECK_FAILED", message: `Không kiểm tra được liên kết ISSUE: ${issueError.message}` } satisfies PlanningMutationResponse, { status: 500 });
  if ((issueCount ?? 0) > 0) return NextResponse.json({ ok: false, code: "STAGE_IN_USE", message: `Không thể xóa stage vì đang được ${issueCount} ISSUE tham chiếu. Hãy chuyển ISSUE sang stage khác trước.` } satisfies PlanningMutationResponse, { status: 409 });
  const { data, error } = await supabase.from("project_stages").delete().eq("project_id", projectId).eq("id", stageId).select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, code: "STAGE_DELETE_FAILED", message: `Không xóa được stage: ${error.message}` } satisfies PlanningMutationResponse, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, code: "STAGE_NOT_FOUND", message: "Stage không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  try { await recalculateProjectPlan(supabase, projectId); } catch {}
  return NextResponse.json({ ok: true, message: "Đã xóa stage; milestone liên quan được giữ lại và bỏ liên kết stage." } satisfies PlanningMutationResponse);
}
