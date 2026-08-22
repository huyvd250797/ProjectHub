import { NextRequest, NextResponse } from "next/server";
import { getProjectRole } from "@/lib/issues/server";
import type { IssueSavedView, IssueViewsApiResponse } from "@/lib/issues/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizeView(row: Record<string, unknown>): IssueSavedView {
  const params = row.query_params && typeof row.query_params === "object" && !Array.isArray(row.query_params)
    ? row.query_params as Record<string, unknown>
    : {};
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "View"),
    queryParams: Object.fromEntries(Object.entries(params).filter(([, value]) => typeof value === "string")) as Record<string, string>,
    isDefault: row.is_default === true,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function authProject(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const supabase = await createClient();
  if (!projectId || !supabase) return { projectId, supabase, user: null, role: null };
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getProjectRole(supabase, projectId, user.id) : null;
  return { projectId, supabase, user, role };
}

export async function GET(request: NextRequest) {
  const { projectId, supabase, user, role } = await authProject(request);
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssueViewsApiResponse, { status: 400 });
  if (!supabase) return NextResponse.json({ ok: true, views: [] } satisfies IssueViewsApiResponse);
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueViewsApiResponse, { status: 401 });
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project." } satisfies IssueViewsApiResponse, { status: 403 });

  const { data, error } = await supabase
    .from("issue_saved_views")
    .select("id,name,query_params,is_default,created_at,updated_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    const migrationMissing = /issue_saved_views|does not exist/i.test(error.message);
    return NextResponse.json({
      ok: false,
      code: migrationMissing ? "V070_MIGRATION_REQUIRED" : "VIEWS_QUERY_FAILED",
      message: migrationMissing ? "Saved Views cần migration V0.7.0." : `Không tải được Saved Views: ${error.message}`,
    } satisfies IssueViewsApiResponse, { status: migrationMissing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, views: (data ?? []).map((row: Record<string, unknown>) => normalizeView(row)) } satisfies IssueViewsApiResponse);
}

export async function POST(request: NextRequest) {
  const projectIdFromQuery = request.nextUrl.searchParams.get("projectId")?.trim();
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không lưu Saved View." } satisfies IssueViewsApiResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueViewsApiResponse, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); } catch { raw = {}; }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = typeof body.projectId === "string" ? body.projectId : projectIdFromQuery ?? "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const queryParams = body.queryParams && typeof body.queryParams === "object" && !Array.isArray(body.queryParams)
    ? Object.fromEntries(Object.entries(body.queryParams as Record<string, unknown>).filter(([, value]) => typeof value === "string"))
    : {};
  if (!projectId || !name) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Tên Saved View và project là bắt buộc." } satisfies IssueViewsApiResponse, { status: 400 });
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project." } satisfies IssueViewsApiResponse, { status: 403 });

  const { error } = await supabase.from("issue_saved_views").upsert({
    project_id: projectId,
    user_id: user.id,
    name,
    query_params: queryParams,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id,user_id,name" });
  if (error) return NextResponse.json({ ok: false, code: /does not exist/i.test(error.message) ? "V070_MIGRATION_REQUIRED" : "VIEW_SAVE_FAILED", message: /does not exist/i.test(error.message) ? "Saved Views cần migration V0.7.0." : `Không lưu được Saved View: ${error.message}` } satisfies IssueViewsApiResponse, { status: /does not exist/i.test(error.message) ? 503 : 500 });

  const url = new URL(request.url);
  url.searchParams.set("projectId", projectId);
  return GET(new NextRequest(url));
}

export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const viewId = request.nextUrl.searchParams.get("viewId")?.trim();
  if (!projectId || !viewId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Thiếu projectId hoặc viewId." } satisfies IssueViewsApiResponse, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không xóa Saved View." } satisfies IssueViewsApiResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueViewsApiResponse, { status: 401 });
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project." } satisfies IssueViewsApiResponse, { status: 403 });
  const { error } = await supabase.from("issue_saved_views").delete().eq("id", viewId).eq("project_id", projectId).eq("user_id", user.id);
  if (error) return NextResponse.json({ ok: false, code: "VIEW_DELETE_FAILED", message: `Không xóa được Saved View: ${error.message}` } satisfies IssueViewsApiResponse, { status: 500 });
  return NextResponse.json({ ok: true, views: [] } satisfies IssueViewsApiResponse);
}
