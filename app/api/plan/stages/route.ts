import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, nextPlanningSortOrder, planningOwnerExists, recalculateProjectPlan } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parseStageInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function editableProject(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, userId: string) {
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
  const parsed = parseStageInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin stage.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await editableProject(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER, Admin hoặc PM được thêm Project Stage." } satisfies PlanningMutationResponse, { status: 403 });
  if (!await planningOwnerExists(supabase, input.projectId, input.ownerId)) return NextResponse.json({ ok: false, code: "OWNER_INVALID", message: "Người phụ trách không còn thuộc Project.", fieldErrors: { ownerId: "Vui lòng chọn lại thành viên Project." } } satisfies PlanningMutationResponse, { status: 400 });

  let sortOrder = input.sortOrder;
  try { if (sortOrder === null) sortOrder = await nextPlanningSortOrder(supabase, "project_stages", input.projectId); }
  catch (error) { return NextResponse.json({ ok: false, code: "STAGE_SORT_FAILED", message: error instanceof Error ? error.message : "Không xác định được thứ tự stage." } satisfies PlanningMutationResponse, { status: 500 }); }

  const { error } = await supabase.from("project_stages").insert({
    project_id: input.projectId,
    code: input.code,
    name: input.name,
    description: input.description,
    duration_days: input.durationDays,
    status: input.status,
    progress: input.progress,
    color: input.color,
    owner_person_id: input.ownerId,
    sort_order: sortOrder,
  });
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    const duplicate = error.code === "23505";
    return NextResponse.json({ ok: false, code: missing ? "V160_MIGRATION_REQUIRED" : duplicate ? "STAGE_CODE_EXISTS" : "STAGE_CREATE_FAILED", message: missing ? "Hãy chạy migration V1.6.0 trước khi tạo stage." : duplicate ? `Mã stage ${input.code} đã tồn tại trong Project.` : `Không tạo được stage: ${error.message}`, fieldErrors: duplicate ? { code: "Mã stage đã tồn tại." } : undefined } satisfies PlanningMutationResponse, { status: missing ? 503 : duplicate ? 409 : 500 });
  }
  if (input.recalculate) {
    try { await recalculateProjectPlan(supabase, input.projectId); } catch {}
  }
  return NextResponse.json({ ok: true, message: `Đã thêm stage ${input.name}.` } satisfies PlanningMutationResponse, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = String(body.projectId ?? "").trim();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map(String) : [];
  if (!projectId || !orderedIds.length || orderedIds.length > 200 || new Set(orderedIds).size !== orderedIds.length) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Danh sách sắp xếp stage không hợp lệ." } satisfies PlanningMutationResponse, { status: 400 });
  if (!await editableProject(supabase, projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền sắp xếp stage." } satisfies PlanningMutationResponse, { status: 403 });

  const { data: existing, error: loadError } = await supabase.from("project_stages").select("id").eq("project_id", projectId).in("id", orderedIds);
  if (loadError) return NextResponse.json({ ok: false, code: "STAGE_REORDER_FAILED", message: loadError.message } satisfies PlanningMutationResponse, { status: 500 });
  if ((existing ?? []).length !== orderedIds.length) return NextResponse.json({ ok: false, code: "STAGE_SCOPE_INVALID", message: "Một hoặc nhiều stage không còn thuộc Project." } satisfies PlanningMutationResponse, { status: 400 });

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase.from("project_stages").update({ sort_order: (index + 1) * 10 }).eq("project_id", projectId).eq("id", orderedIds[index]);
    if (error) return NextResponse.json({ ok: false, code: "STAGE_REORDER_FAILED", message: `Không sắp xếp được stage: ${error.message}` } satisfies PlanningMutationResponse, { status: 500 });
  }
  try { await recalculateProjectPlan(supabase, projectId); } catch {}
  return NextResponse.json({ ok: true, message: "Đã cập nhật thứ tự stage và tính lại timeline." } satisfies PlanningMutationResponse);
}
