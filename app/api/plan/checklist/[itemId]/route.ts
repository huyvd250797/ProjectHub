import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, planningMilestoneExists } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parseMilestoneChecklistInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canEdit(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, userId: string) {
  const role = await getEffectiveProjectRole(supabase, projectId, userId);
  return role === "admin" || role === "pm";
}

export async function PUT(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parseMilestoneChecklistInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại checklist milestone.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền sửa checklist milestone." } satisfies PlanningMutationResponse, { status: 403 });
  if (!await planningMilestoneExists(supabase, input.projectId, input.milestoneId)) return NextResponse.json({ ok: false, code: "MILESTONE_INVALID", message: "Milestone không còn thuộc Project.", fieldErrors: { milestoneId: "Vui lòng chọn lại milestone." } } satisfies PlanningMutationResponse, { status: 400 });

  const update: Record<string, unknown> = {
    milestone_id: input.milestoneId,
    title: input.title,
    is_done: input.isDone,
    completed_at: input.isDone ? new Date().toISOString() : null,
    updated_by: user.id,
  };
  if (input.sortOrder !== null) update.sort_order = input.sortOrder;
  const { data, error } = await supabase.from("project_milestone_checklist_items").update(update).eq("project_id", input.projectId).eq("id", itemId).select("id").maybeSingle();
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V170_MIGRATION_REQUIRED" : "CHECKLIST_UPDATE_FAILED", message: missing ? "Hãy chạy migration V1.7.0 trước khi sửa checklist milestone." : `Không cập nhật được checklist: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  if (!data) return NextResponse.json({ ok: false, code: "CHECKLIST_NOT_FOUND", message: "Checklist không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  return NextResponse.json({ ok: true, message: `Đã cập nhật checklist ${input.title}.` } satisfies PlanningMutationResponse);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  if (!projectId || !await canEdit(supabase, projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xóa checklist milestone." } satisfies PlanningMutationResponse, { status: 403 });

  const { data, error } = await supabase.from("project_milestone_checklist_items").delete().eq("project_id", projectId).eq("id", itemId).select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, code: "CHECKLIST_DELETE_FAILED", message: `Không xóa được checklist: ${error.message}` } satisfies PlanningMutationResponse, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, code: "CHECKLIST_NOT_FOUND", message: "Checklist không tồn tại hoặc không thuộc Project." } satisfies PlanningMutationResponse, { status: 404 });
  return NextResponse.json({ ok: true, message: "Đã xóa checklist milestone." } satisfies PlanningMutationResponse);
}
