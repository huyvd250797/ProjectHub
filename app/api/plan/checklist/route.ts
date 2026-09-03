import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, nextChecklistSortOrder, planningMilestoneExists } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parseMilestoneChecklistInput } from "@/lib/planning/validation";
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
  const parsed = parseMilestoneChecklistInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại checklist milestone.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền thêm checklist milestone." } satisfies PlanningMutationResponse, { status: 403 });
  if (!await planningMilestoneExists(supabase, input.projectId, input.milestoneId)) return NextResponse.json({ ok: false, code: "MILESTONE_INVALID", message: "Milestone không còn thuộc Project.", fieldErrors: { milestoneId: "Vui lòng chọn lại milestone." } } satisfies PlanningMutationResponse, { status: 400 });

  let sortOrder = input.sortOrder;
  try { if (sortOrder === null) sortOrder = await nextChecklistSortOrder(supabase, input.projectId, input.milestoneId); }
  catch (error) { return NextResponse.json({ ok: false, code: "CHECKLIST_SORT_FAILED", message: error instanceof Error ? error.message : "Không xác định được thứ tự checklist." } satisfies PlanningMutationResponse, { status: 500 }); }

  const { error } = await supabase.from("project_milestone_checklist_items").insert({
    project_id: input.projectId,
    milestone_id: input.milestoneId,
    title: input.title,
    is_done: input.isDone,
    completed_at: input.isDone ? new Date().toISOString() : null,
    sort_order: sortOrder,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V170_MIGRATION_REQUIRED" : "CHECKLIST_CREATE_FAILED", message: missing ? "Hãy chạy migration V1.7.0 trước khi tạo checklist milestone." : `Không tạo được checklist: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, message: `Đã thêm checklist ${input.title}.` } satisfies PlanningMutationResponse, { status: 201 });
}
