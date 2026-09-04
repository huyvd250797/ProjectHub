import { NextRequest, NextResponse } from "next/server";
import { normalizeWorkspacePreferences } from "@/lib/workspace-preferences";
import type { WorkspacePreferencesApiResponse } from "@/lib/workspace-preferences";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, source: "demo", preferences: normalizeWorkspacePreferences(null) } satisfies WorkspacePreferencesApiResponse);
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies WorkspacePreferencesApiResponse, { status: 401 });
  const { data, error } = await supabase
    .from("workspace_user_preferences")
    .select("navigation_order")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (/workspace_user_preferences|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ ok: true, source: "database", preferences: normalizeWorkspacePreferences(null) } satisfies WorkspacePreferencesApiResponse);
    }
    return NextResponse.json({ ok: false, code: "WORKSPACE_PREFERENCES_QUERY_FAILED", message: `Không tải được cấu hình menu: ${error.message}` } satisfies WorkspacePreferencesApiResponse, { status: 500 });
  }
  return NextResponse.json({ ok: true, source: "database", preferences: normalizeWorkspacePreferences(data?.navigation_order) } satisfies WorkspacePreferencesApiResponse);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode chỉ lưu cấu hình menu trên trình duyệt." } satisfies WorkspacePreferencesApiResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies WorkspacePreferencesApiResponse, { status: 401 });
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const preferences = normalizeWorkspacePreferences({
    order: body.navigationOrder,
    displayLabels: body.navigationDisplayLabels,
  });
  const { error } = await supabase.from("workspace_user_preferences").upsert({
    user_id: user.id,
    navigation_order: {
      order: preferences.navigationOrder,
      displayLabels: preferences.navigationDisplayLabels,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) {
    const missing = /workspace_user_preferences|does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V150_MIGRATION_REQUIRED" : "WORKSPACE_PREFERENCES_SAVE_FAILED", message: missing ? "Cấu hình menu cần migration V1.5.0." : `Không lưu được cấu hình menu: ${error.message}` } satisfies WorkspacePreferencesApiResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, source: "database", preferences } satisfies WorkspacePreferencesApiResponse);
}
