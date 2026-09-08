import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoResourceSchedule } from "@/lib/resource-scheduling/demo";
import { assignResourceScheduleItem, loadResourceScheduleData } from "@/lib/resource-scheduling/server";
import type { ResourceScheduleApiResponse, ResourceScheduleAssignResponse, ResourceScheduleWorkType } from "@/lib/resource-scheduling/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function resourceSchedulingMigrationMissing(message: string) {
  return /capacity_hours_per_week|allocation_target_percent|estimated_hours|owner_person_id|assignee_person_id|schema cache/i.test(message);
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const startDate = request.nextUrl.searchParams.get("startDate")?.trim() ?? null;
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Resource Scheduling." } satisfies ResourceScheduleApiResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, data: createDemoResourceSchedule(projectId, startDate) } satisfies ResourceScheduleApiResponse, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceScheduleApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xem Resource Scheduling của project này." } satisfies ResourceScheduleApiResponse, { status: 403 });

  try {
    const data = await loadResourceScheduleData(supabase, projectId, role, startDate);
    return NextResponse.json({ ok: true, data } satisfies ResourceScheduleApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Resource Scheduling.";
    const missing = resourceSchedulingMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V260_MIGRATION_REQUIRED" : "RESOURCE_SCHEDULING_QUERY_FAILED",
      message: missing ? "Hãy chạy migration V2.5.0/V2.6.0 trước khi dùng Resource Scheduling." : message,
    } satisfies ResourceScheduleApiResponse, { status: missing ? 503 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies ResourceScheduleAssignResponse, { status: 409 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceScheduleAssignResponse, { status: 401 });

  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = text(body.projectId);
  const itemId = text(body.itemId);
  const itemType = text(body.itemType) as ResourceScheduleWorkType | null;
  const assigneeId = text(body.assigneeId);
  if (!projectId || !itemId || (itemType !== "issue" && itemType !== "task")) {
    return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Thiếu projectId, itemId hoặc loại đầu việc cần phân công." } satisfies ResourceScheduleAssignResponse, { status: 400 });
  }

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ Admin hoặc PM được điều phối nhân sự." } satisfies ResourceScheduleAssignResponse, { status: 403 });
  }

  try {
    const assigneeName = await assignResourceScheduleItem(supabase, projectId, itemType, itemId, assigneeId, user.id);
    return NextResponse.json({
      ok: true,
      message: assigneeName ? `Đã phân công cho ${assigneeName}.` : "Đã bỏ phân công đầu việc.",
    } satisfies ResourceScheduleAssignResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không cập nhật được phân công.";
    const missing = resourceSchedulingMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V260_MIGRATION_REQUIRED" : "RESOURCE_ASSIGN_FAILED",
      message: missing ? "Hãy chạy migration V2.5.0/V2.6.0 trước khi phân công." : message,
    } satisfies ResourceScheduleAssignResponse, { status: missing ? 503 : 500 });
  }
}
