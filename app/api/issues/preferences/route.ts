import { NextRequest, NextResponse } from "next/server";
import { getProjectRole } from "@/lib/issues/server";
import type { IssueColumnId, IssueColumnPreferences, IssuePreferencesApiResponse } from "@/lib/issues/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALL_COLUMNS: IssueColumnId[] = ["issueNo","content","status","customerStatus","priority","module","department","assignee","dueDate","jira"];
const DEFAULT_WIDTHS: Record<IssueColumnId, number> = { issueNo: 82, content: 420, status: 150, customerStatus: 130, priority: 96, module: 190, department: 170, assignee: 160, dueDate: 118, jira: 84 };

function columnList(value: unknown, fallback: IssueColumnId[]) {
  if (!Array.isArray(value)) return fallback;
  const valid = value.filter((item): item is IssueColumnId => typeof item === "string" && ALL_COLUMNS.includes(item as IssueColumnId));
  return [...new Set(valid)];
}

function normalize(row?: Record<string, unknown> | null): IssueColumnPreferences {
  const widthsRaw = row?.column_widths && typeof row.column_widths === "object" && !Array.isArray(row.column_widths) ? row.column_widths as Record<string, unknown> : {};
  const widths: Partial<Record<IssueColumnId, number>> = {};
  for (const id of ALL_COLUMNS) {
    const n = Number(widthsRaw[id]);
    widths[id] = Number.isFinite(n) ? Math.max(70, Math.min(720, Math.round(n))) : DEFAULT_WIDTHS[id];
  }
  const order = columnList(row?.column_order, ALL_COLUMNS);
  for (const id of ALL_COLUMNS) if (!order.includes(id)) order.push(id);
  return {
    visibleColumns: columnList(row?.visible_columns, ALL_COLUMNS),
    columnOrder: order,
    columnWidths: widths,
    pinnedColumns: columnList(row?.pinned_columns, ["issueNo", "content"]),
    pageSize: [25,50,100].includes(Number(row?.page_size)) ? Number(row?.page_size) : 50,
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssuePreferencesApiResponse, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, preferences: normalize() } satisfies IssuePreferencesApiResponse);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssuePreferencesApiResponse, { status: 401 });
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project." } satisfies IssuePreferencesApiResponse, { status: 403 });
  const { data, error } = await supabase.from("issue_user_preferences").select("visible_columns,column_order,column_widths,pinned_columns,page_size").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
  if (error) {
    const missing = /issue_user_preferences|does not exist/i.test(error.message);
    if (missing) return NextResponse.json({ ok: true, preferences: normalize() } satisfies IssuePreferencesApiResponse);
    return NextResponse.json({ ok: false, code: "PREFERENCES_QUERY_FAILED", message: `Không tải được cấu hình cột: ${error.message}` } satisfies IssuePreferencesApiResponse, { status: 500 });
  }
  return NextResponse.json({ ok: true, preferences: normalize(data as Record<string, unknown> | null) } satisfies IssuePreferencesApiResponse);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không lưu cấu hình cột." } satisfies IssuePreferencesApiResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssuePreferencesApiResponse, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { raw = {}; }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssuePreferencesApiResponse, { status: 400 });
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project." } satisfies IssuePreferencesApiResponse, { status: 403 });
  const preferences = normalize({
    visible_columns: body.visibleColumns,
    column_order: body.columnOrder,
    column_widths: body.columnWidths,
    pinned_columns: body.pinnedColumns,
    page_size: body.pageSize,
  });
  const { error } = await supabase.from("issue_user_preferences").upsert({
    project_id: projectId,
    user_id: user.id,
    visible_columns: preferences.visibleColumns,
    column_order: preferences.columnOrder,
    column_widths: preferences.columnWidths,
    pinned_columns: preferences.pinnedColumns,
    page_size: preferences.pageSize,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id,user_id" });
  if (error) return NextResponse.json({ ok: false, code: /does not exist/i.test(error.message) ? "V070_MIGRATION_REQUIRED" : "PREFERENCES_SAVE_FAILED", message: /does not exist/i.test(error.message) ? "Cấu hình cột cần migration V0.7.0." : `Không lưu được cấu hình cột: ${error.message}` } satisfies IssuePreferencesApiResponse, { status: /does not exist/i.test(error.message) ? 503 : 500 });
  return NextResponse.json({ ok: true, preferences } satisfies IssuePreferencesApiResponse);
}
