import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/demo";
import { getNotificationPreferences } from "@/lib/notifications/server";
import type { NotificationPreferences, NotificationPreferencesResponse } from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProjectRole } from "@/lib/access";

export const dynamic = "force-dynamic";

function parsePreferences(value: unknown): NotificationPreferences | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const keys = ["issueAssignment", "issueUpdates", "dueReminders", "projectMembership", "importUpdates", "securityEvents"] as const;
  if (keys.some((key) => typeof row[key] !== "boolean")) return null;
  return {
    issueAssignment: row.issueAssignment as boolean,
    issueUpdates: row.issueUpdates as boolean,
    dueReminders: row.dueReminders as boolean,
    projectMembership: row.projectMembership as boolean,
    importUpdates: row.importUpdates as boolean,
    securityEvents: row.securityEvents as boolean,
  };
}

async function authorize(projectId: string) {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, status: 200 } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, status: 401 } as const;
  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return { supabase, user, status: 403 } as const;
  return { supabase, user, status: 200 } as const;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies NotificationPreferencesResponse, { status: 400 });

  const auth = await authorize(projectId);
  if (!auth.supabase) return NextResponse.json({ ok: true, preferences: DEFAULT_NOTIFICATION_PREFERENCES } satisfies NotificationPreferencesResponse);
  if (!auth.user || auth.status !== 200) return NextResponse.json({ ok: false, code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.status === 401 ? "Phiên đăng nhập đã hết hạn." : "Bạn không có quyền truy cập Project này." } satisfies NotificationPreferencesResponse, { status: auth.status });

  try {
    const preferences = await getNotificationPreferences(auth.supabase, projectId, auth.user.id);
    return NextResponse.json({ ok: true, preferences } satisfies NotificationPreferencesResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, code: "PREFERENCES_LOAD_FAILED", message: error instanceof Error ? error.message : "Không tải được cài đặt thông báo." } satisfies NotificationPreferencesResponse, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const projectId = typeof raw.projectId === "string" ? raw.projectId.trim() : "";
  const preferences = parsePreferences(raw.preferences);
  if (!projectId || !preferences) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Cài đặt thông báo không hợp lệ." } satisfies NotificationPreferencesResponse, { status: 400 });

  const auth = await authorize(projectId);
  if (!auth.supabase) return NextResponse.json({ ok: true, preferences } satisfies NotificationPreferencesResponse);
  if (!auth.user || auth.status !== 200) return NextResponse.json({ ok: false, code: auth.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: auth.status === 401 ? "Phiên đăng nhập đã hết hạn." : "Bạn không có quyền truy cập Project này." } satisfies NotificationPreferencesResponse, { status: auth.status });

  const { error } = await auth.supabase.from("notification_preferences").upsert({
    user_id: auth.user.id,
    project_id: projectId,
    issue_assignment: preferences.issueAssignment,
    issue_updates: preferences.issueUpdates,
    due_reminders: preferences.dueReminders,
    project_membership: preferences.projectMembership,
    import_updates: preferences.importUpdates,
    security_events: preferences.securityEvents,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,project_id" });

  if (error) return NextResponse.json({ ok: false, code: "PREFERENCES_SAVE_FAILED", message: error.message } satisfies NotificationPreferencesResponse, { status: 500 });
  return NextResponse.json({ ok: true, preferences } satisfies NotificationPreferencesResponse);
}
