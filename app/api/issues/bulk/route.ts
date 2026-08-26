import { NextRequest, NextResponse } from "next/server";
import { getProjectRole, resolveIssueRelationNames } from "@/lib/issues/server";
import type { IssueBulkMutationResponse } from "@/lib/issues/types";
import { issueValidationMessage, parseIssuePatch } from "@/lib/issues/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BULK = 200;

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies IssueBulkMutationResponse,
      { status: 409 },
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueBulkMutationResponse,
      { status: 401 },
    );
  }

  let raw: unknown;
  try { raw = await request.json(); } catch { raw = {}; }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const issueIds = Array.isArray(body.issueIds)
    ? [...new Set(body.issueIds.filter((value): value is string => typeof value === "string" && value.length > 0))]
    : [];
  const patchInput = body.patch && typeof body.patch === "object" ? body.patch : {};

  if (!projectId) {
    return NextResponse.json(
      { ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies IssueBulkMutationResponse,
      { status: 400 },
    );
  }
  if (!issueIds.length) {
    return NextResponse.json(
      { ok: false, code: "ISSUES_REQUIRED", message: "Chưa chọn ISSUE cần cập nhật." } satisfies IssueBulkMutationResponse,
      { status: 400 },
    );
  }
  if (issueIds.length > MAX_BULK) {
    return NextResponse.json(
      { ok: false, code: "BULK_LIMIT", message: `Mỗi lần chỉ cập nhật tối đa ${MAX_BULK} ISSUE.` } satisfies IssueBulkMutationResponse,
      { status: 400 },
    );
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role || role === "viewer") {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Bạn không có quyền cập nhật ISSUE." } satisfies IssueBulkMutationResponse,
      { status: 403 },
    );
  }

  const parsed = parseIssuePatch(patchInput);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_FAILED", message: issueValidationMessage(parsed.errors), fieldErrors: parsed.errors } satisfies IssueBulkMutationResponse,
      { status: 400 },
    );
  }
  if (!Object.keys(parsed.patch).length) {
    return NextResponse.json(
      { ok: false, code: "EMPTY_PATCH", message: "Chưa chọn giá trị cần cập nhật." } satisfies IssueBulkMutationResponse,
      { status: 400 },
    );
  }

  const relationFields = {
    moduleId: Object.prototype.hasOwnProperty.call(parsed.patch, "module_id") ? parsed.patch.module_id as string | null : undefined,
    departmentId: Object.prototype.hasOwnProperty.call(parsed.patch, "department_id") ? parsed.patch.department_id as string | null : undefined,
    requesterId: Object.prototype.hasOwnProperty.call(parsed.patch, "requester_person_id") ? parsed.patch.requester_person_id as string | null : undefined,
    assigneeId: Object.prototype.hasOwnProperty.call(parsed.patch, "assignee_person_id") ? parsed.patch.assignee_person_id as string | null : undefined,
  };
  const names = await resolveIssueRelationNames(supabase, projectId, relationFields);
  if (relationFields.assigneeId && !names.assigneeValid) {
    return NextResponse.json(
      { ok: false, code: "ASSIGNEE_NOT_PROJECT_MEMBER", message: "Người phụ trách không còn nằm trong danh sách nhân sự đang hoạt động của Project.", fieldErrors: { assigneeId: "Vui lòng chọn lại người phụ trách từ Project Team." } } satisfies IssueBulkMutationResponse,
      { status: 400 },
    );
  }
  if (relationFields.moduleId !== undefined) parsed.patch.module_name_raw = names.moduleName;
  if (relationFields.departmentId !== undefined) parsed.patch.department_name_raw = names.departmentName;
  if (relationFields.requesterId !== undefined) parsed.patch.requester_name_raw = names.requesterName;
  if (relationFields.assigneeId !== undefined) parsed.patch.assignee_name_raw = names.assigneeName;

  const { data, error } = await supabase
    .from("issues")
    .update(parsed.patch)
    .eq("project_id", projectId)
    .in("id", issueIds)
    .is("archived_at", null)
    .select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, code: "BULK_UPDATE_FAILED", message: `Không cập nhật được ISSUE: ${error.message}` } satisfies IssueBulkMutationResponse,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0 } satisfies IssueBulkMutationResponse);
}
