import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { countScheduleDays } from "@/lib/planning/schedule";
import { isPlanningMigrationMissing, planningScheduleMode } from "@/lib/planning/server";
import type { PlanningMutationResponse, TimelineMutationAction } from "@/lib/planning/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function bodyRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function missing(message: string) {
  return /baseline_start_date|baseline_end_date|baseline_due_date|snapshot_project_timeline_baseline_v320|is_critical|schema cache|does not exist/i.test(message) || isPlanningMigrationMissing(message);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu Timeline Pro." } satisfies PlanningMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PlanningMutationResponse, { status: 401 });

  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const body = bodyRecord(raw);
  const projectId = String(body.projectId ?? "").trim();
  const action = String(body.action ?? "") as TimelineMutationAction;
  if (!projectId || !["snapshot_baseline", "move_stage", "move_task"].includes(action)) {
    return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Timeline Pro action không hợp lệ." } satisfies PlanningMutationResponse, { status: 400 });
  }
  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER, Admin hoặc PM được chỉnh Timeline Pro." } satisfies PlanningMutationResponse, { status: 403 });

  try {
    if (action === "snapshot_baseline") {
      const { error } = await supabase.rpc("snapshot_project_timeline_baseline_v320", { p_project_id: projectId });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, message: "Đã chụp baseline hiện tại cho stage và task." } satisfies PlanningMutationResponse);
    }

    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Thiếu dòng Timeline cần cập nhật." } satisfies PlanningMutationResponse, { status: 400 });

    if (action === "move_stage") {
      const startDate = body.startDate;
      const endDate = body.endDate;
      if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) {
        return NextResponse.json({ ok: false, code: "DATE_RANGE_INVALID", message: "Khoảng ngày stage không hợp lệ." } satisfies PlanningMutationResponse, { status: 400 });
      }
      const mode = await planningScheduleMode(supabase, projectId);
      const durationDays = countScheduleDays(startDate, endDate, mode);
      if (durationDays < 1 || durationDays > 3_650) return NextResponse.json({ ok: false, code: "DATE_RANGE_INVALID", message: "Khoảng ngày stage phải có từ 1 đến 3.650 ngày theo lịch dự án." } satisfies PlanningMutationResponse, { status: 400 });
      const { data, error } = await supabase.from("project_stages").update({ date_mode: "manual", start_date: startDate, end_date: endDate, duration_days: durationDays }).eq("id", id).eq("project_id", projectId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ ok: false, code: "STAGE_NOT_FOUND", message: "Stage không tồn tại trong Project." } satisfies PlanningMutationResponse, { status: 404 });
      return NextResponse.json({ ok: true, message: "Đã cập nhật khoảng ngày stage từ Timeline Pro." } satisfies PlanningMutationResponse);
    }

    const dueDate = body.dueDate;
    if (!validDate(dueDate)) return NextResponse.json({ ok: false, code: "DATE_INVALID", message: "Ngày deadline task không hợp lệ." } satisfies PlanningMutationResponse, { status: 400 });
    const { data, error } = await supabase.from("project_plan_tasks").update({ due_date: dueDate, updated_by: user.id }).eq("id", id).eq("project_id", projectId).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ ok: false, code: "TASK_NOT_FOUND", message: "Task không tồn tại trong Project." } satisfies PlanningMutationResponse, { status: 404 });
    return NextResponse.json({ ok: true, message: "Đã cập nhật deadline task từ Timeline Pro." } satisfies PlanningMutationResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không cập nhật được Timeline Pro.";
    const isMissing = missing(message);
    return NextResponse.json({ ok: false, code: isMissing ? "V320_MIGRATION_REQUIRED" : "TIMELINE_MUTATION_FAILED", message: isMissing ? "Hãy chạy migration 202609080002_v320_project_timeline_pro.sql trước khi dùng Timeline Pro." : message } satisfies PlanningMutationResponse, { status: isMissing ? 503 : 500 });
  }
}
