import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import {
  isPlanningMigrationMissing,
  nextPlanTaskSortOrder,
  planningOwnerExists,
  planningStageExists,
} from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parsePlanTaskInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canEdit(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, userId: string) {
  const role = await getEffectiveProjectRole(supabase, projectId, userId);
  return role === "admin" || role === "pm";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parsePlanTaskInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin task.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền thêm task kế hoạch." } satisfies PlanningMutationResponse, { status: 403 });

  const [validOwner, validStage] = await Promise.all([
    planningOwnerExists(supabase, input.projectId, input.ownerId),
    planningStageExists(supabase, input.projectId, input.stageId),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!validOwner) fieldErrors.ownerId = "Người phụ trách không còn thuộc Project.";
  if (!validStage) fieldErrors.stageId = "Stage liên kết không còn thuộc Project.";
  if (Object.keys(fieldErrors).length) return NextResponse.json({ ok: false, code: "RELATION_INVALID", message: "Liên kết task không hợp lệ.", fieldErrors } satisfies PlanningMutationResponse, { status: 400 });

  let sortOrder = input.sortOrder;
  try { if (sortOrder === null) sortOrder = await nextPlanTaskSortOrder(supabase, input.projectId, input.stageId); }
  catch (error) { return NextResponse.json({ ok: false, code: "TASK_SORT_FAILED", message: error instanceof Error ? error.message : "Không xác định được thứ tự task." } satisfies PlanningMutationResponse, { status: 500 }); }

  const { error } = await supabase.from("project_plan_tasks").insert({
    project_id: input.projectId,
    title: input.title,
    description: input.description,
    stage_id: input.stageId,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate,
    completed_at: input.status === "done" ? new Date().toISOString() : null,
    owner_person_id: input.ownerId,
    sort_order: sortOrder,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V170_MIGRATION_REQUIRED" : "TASK_CREATE_FAILED", message: missing ? "Hãy chạy migration V1.7.0 trước khi tạo task kế hoạch." : `Không tạo được task: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, message: `Đã thêm task ${input.title}.` } satisfies PlanningMutationResponse, { status: 201 });
}
