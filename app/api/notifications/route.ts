import { NextRequest, NextResponse } from "next/server";
import { createDemoNotificationInbox } from "@/lib/notifications/demo";
import { getNotificationInbox } from "@/lib/notifications/server";
import type { NotificationInboxResponse, NotificationMutationResponse } from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProjectRole } from "@/lib/access";

export const dynamic = "force-dynamic";

function limitParam(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(50, Math.max(1, Math.trunc(parsed)));
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies NotificationInboxResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, data: createDemoNotificationInbox(projectId) } satisfies NotificationInboxResponse);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies NotificationInboxResponse, { status: 401 });
  }

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies NotificationInboxResponse, { status: 403 });
  }

  try {
    const data = await getNotificationInbox(supabase, projectId, user.id, limitParam(request.nextUrl.searchParams.get("limit")));
    return NextResponse.json({ ok: true, data } satisfies NotificationInboxResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được thông báo.";
    const migrationMissing = /notifications|notification_preferences|sync_issue_due_notifications_v110|relation .* does not exist/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        code: migrationMissing ? "V110_MIGRATION_REQUIRED" : "NOTIFICATIONS_LOAD_FAILED",
        message: migrationMissing
          ? "Notifications V1.1.0 cần chạy migration 202608250001_v110_notifications_activity.sql trên Supabase."
          : message,
      } satisfies NotificationInboxResponse,
      { status: migrationMissing ? 503 : 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, unreadCount: 0 } satisfies NotificationMutationResponse);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies NotificationMutationResponse, { status: 401 });
  }

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const projectId = typeof raw.projectId === "string" ? raw.projectId.trim() : "";
  const action = typeof raw.action === "string" ? raw.action : "";
  const notificationId = typeof raw.notificationId === "string" ? raw.notificationId.trim() : "";
  if (!projectId || !["mark_read", "mark_all_read"].includes(action)) {
    return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Yêu cầu cập nhật thông báo không hợp lệ." } satisfies NotificationMutationResponse, { status: 400 });
  }

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies NotificationMutationResponse, { status: 403 });
  }

  let update = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (action === "mark_read") {
    if (!notificationId) {
      return NextResponse.json({ ok: false, code: "NOTIFICATION_REQUIRED", message: "Thiếu notificationId." } satisfies NotificationMutationResponse, { status: 400 });
    }
    update = update.eq("id", notificationId);
  }

  const { error } = await update;
  if (error) {
    return NextResponse.json({ ok: false, code: "NOTIFICATION_UPDATE_FAILED", message: error.message } satisfies NotificationMutationResponse, { status: 500 });
  }

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .is("read_at", null);

  return NextResponse.json({ ok: true, unreadCount: count ?? 0 } satisfies NotificationMutationResponse);
}
