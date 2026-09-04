import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { isPlanningMigrationMissing, planningEntityExists, planningOwnerExists } from "@/lib/planning/server";
import type { PlanningMutationResponse } from "@/lib/planning/types";
import { parsePlanReminderInput } from "@/lib/planning/validation";
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
  const parsed = parsePlanReminderInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại thông tin reminder.", fieldErrors: parsed.errors } satisfies PlanningMutationResponse, { status: 400 });
  const { input } = parsed;
  if (!await canEdit(supabase, input.projectId, user.id)) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền thêm reminder kế hoạch." } satisfies PlanningMutationResponse, { status: 403 });

  const [validOwner, validEntity] = await Promise.all([
    planningOwnerExists(supabase, input.projectId, input.ownerId),
    planningEntityExists(supabase, input.projectId, input.entityType, input.entityId),
  ]);
  const fieldErrors: Record<string, string> = {};
  if (!validOwner) fieldErrors.ownerId = "Người phụ trách không còn thuộc Project.";
  if (!validEntity) fieldErrors.entityId = "Đối tượng liên kết không còn thuộc Project.";
  if (Object.keys(fieldErrors).length) return NextResponse.json({ ok: false, code: "RELATION_INVALID", message: "Liên kết reminder không hợp lệ.", fieldErrors } satisfies PlanningMutationResponse, { status: 400 });

  const { error } = await supabase.from("project_plan_reminders").insert({
    project_id: input.projectId,
    title: input.title,
    description: input.description,
    entity_type: input.entityType,
    entity_id: input.entityId,
    remind_at: input.remindAt,
    status: input.status,
    priority: input.priority,
    snoozed_until: input.snoozedUntil,
    completed_at: input.status === "done" ? new Date().toISOString() : null,
    owner_person_id: input.ownerId,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) {
    const missing = isPlanningMigrationMissing(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V180_MIGRATION_REQUIRED" : "REMINDER_CREATE_FAILED", message: missing ? "Hãy chạy migration V1.8.0 trước khi tạo reminder kế hoạch." : `Không tạo được reminder: ${error.message}` } satisfies PlanningMutationResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, message: `Đã thêm reminder ${input.title}.` } satisfies PlanningMutationResponse, { status: 201 });
}
