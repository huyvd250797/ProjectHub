import { NextRequest, NextResponse } from "next/server";
import { getProjectRole, ISSUE_SELECT, normalizeIssue, resolveIssueRelationNames } from "@/lib/issues/server";
import type { IssueDetailApiResponse, IssueMutationResponse } from "@/lib/issues/types";
import { parseIssuePatch } from "@/lib/issues/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ issueId: string }> };

function text(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { issueId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssueDetailApiResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "DEMO_DETAIL_UNAVAILABLE", message: "Chi tiết lịch sử chỉ hoạt động khi kết nối Supabase." } satisfies IssueDetailApiResponse, { status: 409 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueDetailApiResponse, { status: 401 });

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project này." } satisfies IssueDetailApiResponse, { status: 403 });

  const [{ data: issue, error }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("issues").select(ISSUE_SELECT).eq("project_id", projectId).eq("id", issueId).is("archived_at", null).maybeSingle(),
    supabase
      .from("issue_history")
      .select("id, field_name, old_value, new_value, changed_at, actor:profiles!issue_history_changed_by_fkey(display_name,email)")
      .eq("project_id", projectId)
      .eq("issue_id", issueId)
      .order("changed_at", { ascending: false })
      .limit(100),
  ]);

  if (error || !issue) {
    return NextResponse.json({ ok: false, code: "ISSUE_NOT_FOUND", message: error?.message ?? "Không tìm thấy ISSUE." } satisfies IssueDetailApiResponse, { status: 404 });
  }
  if (historyError && /profiles_select_shared_project|does not exist|issue_no/i.test(historyError.message)) {
    return NextResponse.json({ ok: false, code: "V060_MIGRATION_REQUIRED", message: "Hãy chạy migration V0.6.0 để xem lịch sử ISSUE." } satisfies IssueDetailApiResponse, { status: 503 });
  }

  const body: IssueDetailApiResponse = {
    ok: true,
    data: {
      issue: normalizeIssue(issue as Record<string, unknown>),
      history: (history ?? []).map((row: any) => {
        const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
        return {
          id: String(row.id),
          fieldName: String(row.field_name),
          oldValue: text(row.old_value),
          newValue: text(row.new_value),
          changedAt: String(row.changed_at),
          actorName: text(actor?.display_name),
          actorEmail: text(actor?.email),
        };
      }),
    },
  };
  return NextResponse.json(body);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { issueId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies IssueMutationResponse, { status: 409 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueMutationResponse, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); } catch { raw = {}; }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssueMutationResponse, { status: 400 });

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role || role === "viewer") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn chỉ có quyền xem ISSUE." } satisfies IssueMutationResponse, { status: 403 });

  const parsed = parseIssuePatch(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Kiểm tra lại dữ liệu ISSUE.", fieldErrors: parsed.errors } satisfies IssueMutationResponse, { status: 400 });
  if (!Object.keys(parsed.patch).length) return NextResponse.json({ ok: false, code: "EMPTY_PATCH", message: "Không có dữ liệu thay đổi." } satisfies IssueMutationResponse, { status: 400 });

  const relationFields = {
    moduleId: Object.prototype.hasOwnProperty.call(parsed.patch, "module_id") ? (parsed.patch.module_id as string | null) : undefined,
    departmentId: Object.prototype.hasOwnProperty.call(parsed.patch, "department_id") ? (parsed.patch.department_id as string | null) : undefined,
    requesterId: Object.prototype.hasOwnProperty.call(parsed.patch, "requester_person_id") ? (parsed.patch.requester_person_id as string | null) : undefined,
    assigneeId: Object.prototype.hasOwnProperty.call(parsed.patch, "assignee_person_id") ? (parsed.patch.assignee_person_id as string | null) : undefined,
  };
  const names = await resolveIssueRelationNames(supabase, projectId, relationFields);
  if (relationFields.moduleId !== undefined) parsed.patch.module_name_raw = names.moduleName;
  if (relationFields.departmentId !== undefined) parsed.patch.department_name_raw = names.departmentName;
  if (relationFields.requesterId !== undefined) parsed.patch.requester_name_raw = names.requesterName;
  if (relationFields.assigneeId !== undefined) parsed.patch.assignee_name_raw = names.assigneeName;

  const { data, error } = await supabase
    .from("issues")
    .update(parsed.patch)
    .eq("project_id", projectId)
    .eq("id", issueId)
    .is("archived_at", null)
    .select(ISSUE_SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, code: "ISSUE_UPDATE_FAILED", message: `Không cập nhật được ISSUE: ${error.message}` } satisfies IssueMutationResponse, { status: 500 });
  return NextResponse.json({ ok: true, issue: normalizeIssue(data as Record<string, unknown>) } satisfies IssueMutationResponse);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { issueId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssueMutationResponse, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies IssueMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueMutationResponse, { status: 401 });

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ PM/Admin được archive ISSUE." } satisfies IssueMutationResponse, { status: 403 });

  const { data, error } = await supabase
    .from("issues")
    .update({ archived_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("id", issueId)
    .is("archived_at", null)
    .select(ISSUE_SELECT)
    .single();

  if (error) return NextResponse.json({ ok: false, code: "ISSUE_ARCHIVE_FAILED", message: `Không archive được ISSUE: ${error.message}` } satisfies IssueMutationResponse, { status: 500 });
  return NextResponse.json({ ok: true, issue: normalizeIssue(data as Record<string, unknown>) } satisfies IssueMutationResponse);
}
