import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, nextPlanningSortOrder, planningOwnerExists, planningStageExists } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parseMilestoneInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parseMilestoneInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin milestone.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  const role = await getEffectiveProjectRole(supabase, input.projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER, Admin hoặc PM được thêm milestone." } satisfies PlanningMutationResponse, { status: 403 });
  const [validOwner, validStage] = await Promise.all([
    planningOwnerExists(supabase, input.projectId, input.ownerId),
    planningStageExists(supabase, input.projectId, input.stageId),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!validOwner) fieldErrors.ownerId = "Người phụ trách không còn thuộc Project.";
  if (!validStage) fieldErrors.stageId = "Stage liên kết không còn thuộc Project.";
  if (Object.keys(fieldErrors).length) return NextResponse.json({ ok: false, code: "RELATION_INVALID", message: "Liên kết milestone không hợp lệ.", fieldErrors } satisfies PlanningMutationResponse, { status: 400 });

  let sortOrder = input.sortOrder;
  try { if (sortOrder === null) sortOrder = await nextPlanningSortOrder(supabase, "project_milestones", input.projectId); }
  catch (error) { return NextResponse.json({ ok: false, code: "MILESTONE_SORT_FAILED", message: error instanceof Error ? error.message : "Không xác định được thứ tự milestone." } satisfies PlanningMutationResponse, { status: 500 }); }
  const { error } = await supabase.from("project_milestones").insert({
    project_id: input.projectId,
    title: input.title,
    description: input.description,
    due_date: input.dueDate,
    status: input.status,
    stage_id: input.stageId,
    owner_person_id: input.ownerId,
    sort_order: sortOrder,
    completed_at: input.status === "completed" ? new Date().toISOString() : null,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V160_MIGRATION_REQUIRED" : "MILESTONE_CREATE_FAILED", message: missing ? "Hãy chạy migration V1.6.0 trước khi tạo milestone." : `Không tạo được milestone: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, message: `Đã thêm milestone ${input.title}.` } satisfies PlanningMutationResponse, { status: 201 });
}
