import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, planningOwnerExists, planningStageExists } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parseMilestoneInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canEdit(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, userId: string) {
  const role = await getEffectiveProjectRole(supabase, projectId, userId);
  return role === "admin" || role === "pm";
}

export async function PUT(request: NextRequest, context: { params: Promise<{ milestoneId: string }> }) {
  const { milestoneId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parseMilestoneInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin milestone.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền sửa milestone." } satisfies PlanningMutationResponse, { status: 403 });
  const [validOwner, validStage] = await Promise.all([
    planningOwnerExists(supabase, input.projectId, input.ownerId),
    planningStageExists(supabase, input.projectId, input.stageId),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!validOwner) fieldErrors.ownerId = "Người phụ trách không còn thuộc Project.";
  if (!validStage) fieldErrors.stageId = "Stage liên kết không còn thuộc Project.";
  if (Object.keys(fieldErrors).length) return NextResponse.json({ ok: false, code: "RELATION_INVALID", message: "Liên kết milestone không hợp lệ.", fieldErrors } satisfies PlanningMutationResponse, { status: 400 });

  const update: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    due_date: input.dueDate,
    status: input.status,
    stage_id: input.stageId,
    owner_person_id: input.ownerId,
    completed_at: input.status === "completed" ? new Date().toISOString() : null,
    updated_by: user.id,
  };
  if (input.sortOrder !== null) update.sort_order = input.sortOrder;
  const { data, error } = await supabase.from("project_milestones").update(update).eq("project_id", input.projectId).eq("id", milestoneId).select("id").maybeSingle();
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V160_MIGRATION_REQUIRED" : "MILESTONE_UPDATE_FAILED", message: missing ? "Hãy chạy migration V1.6.0 trước khi sửa milestone." : `Không cập nhật được milestone: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  if (!data) return NextResponse.json({ ok: false, code: "MILESTONE_NOT_FOUND", message: "Milestone không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  return NextResponse.json({ ok: true, message: `Đã cập nhật milestone ${input.title}.` } satisfies PlanningMutationResponse);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ milestoneId: string }> }) {
  const { milestoneId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  if (!projectId || !await canEdit(supabase, projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xóa milestone." } satisfies PlanningMutationResponse, { status: 403 });
  const { data, error } = await supabase.from("project_milestones").delete().eq("project_id", projectId).eq("id", milestoneId).select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, code: "MILESTONE_DELETE_FAILED", message: `Không xóa được milestone: ${error.message}` } satisfies PlanningMutationResponse, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, code: "MILESTONE_NOT_FOUND", message: "Milestone không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  return NextResponse.json({ ok: true, message: "Đã xóa milestone." } satisfies PlanningMutationResponse);
}
