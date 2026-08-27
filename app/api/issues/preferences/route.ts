import { NextRequest, NextResponse } from "next/server";
import { getProjectRole } from "@/lib/issues/server";
import type { IssueColumnId, IssueColumnPreferences, IssuePreferencesApiResponse, IssueTagGroup, IssueTagStyle, IssueTagStyles } from "@/lib/issues/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALL_COLUMNS: IssueColumnId[] = ["issueNo","content","status","customerStatus","priority","module","department","assignee","dueDate","jira"];
const DEFAULT_WIDTHS: Record<IssueColumnId, number> = { issueNo: 82, content: 420, status: 150, customerStatus: 130, priority: 96, module: 190, department: 170, assignee: 160, dueDate: 118, jira: 84 };
const TAG_GROUPS: IssueTagGroup[] = ["status", "customerStatus", "priority", "assignee"];
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function columnList(value: unknown, fallback: IssueColumnId[]) {
  if (!Array.isArray(value)) return fallback;
  const valid = value.filter((item): item is IssueColumnId => typeof item === "string" && ALL_COLUMNS.includes(item as IssueColumnId));
  return [...new Set(valid)];
}

function normalizeTagStyles(value: unknown): IssueTagStyles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const result: IssueTagStyles = {};
  for (const group of TAG_GROUPS) {
    const entries = raw[group];
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    const normalized: Record<string, IssueTagStyle> = {};
    for (const [key, candidate] of Object.entries(entries as Record<string, unknown>).slice(0, 250)) {
      if (!key || key.length > 160 || !candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const colors = candidate as Record<string, unknown>;
      const border = typeof colors.border === "string" ? colors.border : "";
      const background = typeof colors.background === "string" ? colors.background : "";
      const text = typeof colors.text === "string" ? colors.text : "";
      if (COLOR_PATTERN.test(border) && COLOR_PATTERN.test(background) && COLOR_PATTERN.test(text)) {
        normalized[key] = { border, background, text };
      }
    }
    if (Object.keys(normalized).length) result[group] = normalized;
  }
  return result;
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
    pageSize: [50,100,500,1000,0].includes(Number(row?.page_size)) ? Number(row?.page_size) : 50,
    filtersVisible: row?.filters_visible !== false,
    tagStyles: normalizeTagStyles(row?.tag_styles),
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
  const primary = await supabase.from("issue_user_preferences").select("visible_columns,column_order,column_widths,pinned_columns,page_size,filters_visible,tag_styles").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
  let data = primary.data as Record<string, unknown> | null;
  let error = primary.error;
  if (error && /filters_visible|tag_styles|schema cache/i.test(error.message)) {
    const legacy = await supabase.from("issue_user_preferences").select("visible_columns,column_order,column_widths,pinned_columns,page_size").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
    data = legacy.data as Record<string, unknown> | null;
    error = legacy.error;
  }
  if (error) {
    const missing = /issue_user_preferences|does not exist/i.test(error.message);
    if (missing) return NextResponse.json({ ok: true, preferences: normalize() } satisfies IssuePreferencesApiResponse);
    return NextResponse.json({ ok: false, code: "PREFERENCES_QUERY_FAILED", message: `Không tải được cấu hình cột: ${error.message}` } satisfies IssuePreferencesApiResponse, { status: 500 });
  }
  return NextResponse.json({ ok: true, preferences: normalize(data) } satisfies IssuePreferencesApiResponse);
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
    filters_visible: body.filtersVisible,
    tag_styles: body.tagStyles,
  });
  const { error } = await supabase.from("issue_user_preferences").upsert({
    project_id: projectId,
    user_id: user.id,
    visible_columns: preferences.visibleColumns,
    column_order: preferences.columnOrder,
    column_widths: preferences.columnWidths,
    pinned_columns: preferences.pinnedColumns,
    page_size: preferences.pageSize,
    filters_visible: preferences.filtersVisible,
    tag_styles: preferences.tagStyles,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id,user_id" });
  if (error) {
    const v150Missing = /filters_visible|tag_styles|schema cache/i.test(error.message);
    const tableMissing = /issue_user_preferences|does not exist/i.test(error.message);
    return NextResponse.json({ ok: false, code: v150Missing ? "V150_MIGRATION_REQUIRED" : tableMissing ? "V070_MIGRATION_REQUIRED" : "PREFERENCES_SAVE_FAILED", message: v150Missing ? "Cấu hình giao diện ISSUE cần migration V1.5.0." : tableMissing ? "Cấu hình cột cần migration V0.7.0." : `Không lưu được cấu hình ISSUE: ${error.message}` } satisfies IssuePreferencesApiResponse, { status: v150Missing || tableMissing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, preferences } satisfies IssuePreferencesApiResponse);
}
