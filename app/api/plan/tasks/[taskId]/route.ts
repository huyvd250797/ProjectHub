import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, planningOwnerExists, planningStageExists } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parsePlanTaskInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canEdit(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, userId: string) {
  const role = await getEffectiveProjectRole(supabase, projectId, userId);
  return role === "admin" || role === "pm";
}

export async function PUT(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parsePlanTaskInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin task.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền sửa task kế hoạch." } satisfies PlanningMutationResponse, { status: 403 });

  const [validOwner, validStage] = await Promise.all([
    planningOwnerExists(supabase, input.projectId, input.ownerId),
    planningStageExists(supabase, input.projectId, input.stageId),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!validOwner) fieldErrors.ownerId = "Người phụ trách không còn thuộc Project.";
  if (!validStage) fieldErrors.stageId = "Stage liên kết không còn thuộc Project.";
  if (Object.keys(fieldErrors).length) return NextResponse.json({ ok: false, code: "RELATION_INVALID", message: "Liên kết task không hợp lệ.", fieldErrors } satisfies PlanningMutationResponse, { status: 400 });

  const update: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    stage_id: input.stageId,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate,
    completed_at: input.status === "done" ? new Date().toISOString() : null,
    owner_person_id: input.ownerId,
    updated_by: user.id,
  };
  if (input.sortOrder !== null) update.sort_order = input.sortOrder;
  const { data, error } = await supabase.from("project_plan_tasks").update(update).eq("project_id", input.projectId).eq("id", taskId).select("id").maybeSingle();
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V170_MIGRATION_REQUIRED" : "TASK_UPDATE_FAILED", message: missing ? "Hãy chạy migration V1.7.0 trước khi sửa task kế hoạch." : `Không cập nhật được task: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  if (!data) return NextResponse.json({ ok: false, code: "TASK_NOT_FOUND", message: "Task không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  return NextResponse.json({ ok: true, message: `Đã cập nhật task ${input.title}.` } satisfies PlanningMutationResponse);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  if (!projectId || !await canEdit(supabase, projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xóa task kế hoạch." } satisfies PlanningMutationResponse, { status: 403 });

  const { data, error } = await supabase.from("project_plan_tasks").delete().eq("project_id", projectId).eq("id", taskId).select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, code: "TASK_DELETE_FAILED", message: `Không xóa được task: ${error.message}` } satisfies PlanningMutationResponse, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, code: "TASK_NOT_FOUND", message: "Task không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  return NextResponse.json({ ok: true, message: "Đã xóa task kế hoạch." } satisfies PlanningMutationResponse);
}
