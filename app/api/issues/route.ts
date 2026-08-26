import { NextRequest, NextResponse } from "next/server";
import { createDemoIssues } from "@/lib/issues/demo";
import { getCurrentAssigneePersonId, getIssueLookups, getProjectRole, ISSUE_SELECT, normalizeIssue, resolveIssueRelationNames } from "@/lib/issues/server";
import type { IssueMutationResponse, IssuesApiResponse } from "@/lib/issues/types";
import { issueValidationMessage, parseIssueInput } from "@/lib/issues/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function friendlyIssueDatabaseError(error: { code?: string | null; message: string }) {
  const message = error.message.toLowerCase();
  const fieldErrors: Record<string, string> = {};
  if (error.code === "23503" || /foreign key/i.test(error.message)) {
    if (message.includes("module")) fieldErrors.moduleId = "Module đã thay đổi hoặc không thuộc Project. Vui lòng chọn lại.";
    if (message.includes("department")) fieldErrors.departmentId = "Phòng ban đã thay đổi hoặc không thuộc Project. Vui lòng chọn lại.";
    if (message.includes("requester")) fieldErrors.requesterId = "Nhân sự yêu cầu không còn hợp lệ. Vui lòng chọn lại.";
    if (message.includes("assignee")) fieldErrors.assigneeId = "Người phụ trách không còn hợp lệ. Vui lòng chọn lại.";
  }
  if (error.code === "23502" && message.includes("content")) fieldErrors.content = "Nội dung ISSUE là bắt buộc.";
  if (Object.keys(fieldErrors).length) {
    return {
      message: `Không thể tạo ISSUE. ${Object.values(fieldErrors).join(" ")}`,
      fieldErrors,
    };
  }
  return { message: `Không tạo được ISSUE: ${error.message}`, fieldErrors: undefined };
}

function applyFilters(query: any, params: URLSearchParams, myPersonId: string | null) {
  const search = params.get("search")?.trim();
  const status = params.get("status")?.trim();
  const customerStatus = params.get("customerStatus")?.trim();
  const priority = params.get("priority")?.trim();
  const stage = params.get("stage")?.trim();
  const moduleId = params.get("moduleId")?.trim();
  const departmentId = params.get("departmentId")?.trim();
  const assigneeId = params.get("assigneeId")?.trim();

  if (search) {
    const safe = search.replace(/[,%()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `content.ilike.%${safe}%,jira_url.ilike.%${safe}%,module_name_raw.ilike.%${safe}%,department_name_raw.ilike.%${safe}%,requester_name_raw.ilike.%${safe}%,assignee_name_raw.ilike.%${safe}%`,
      );
    }
  }
  if (status) query = query.eq("status_code", status);
  if (customerStatus === "not_handed_over") query = query.or("customer_status_code.eq.not_handed_over,customer_status_code.is.null");
  else if (customerStatus) query = query.eq("customer_status_code", customerStatus);
  if (priority) query = query.eq("priority_code", priority);
  if (stage) query = query.eq("stage_code", stage);
  if (moduleId) query = query.eq("module_id", moduleId);
  if (departmentId) query = query.eq("department_id", departmentId);
  if (assigneeId) query = query.eq("assignee_person_id", assigneeId);
  if (params.get("missingModule") === "1") query = query.is("module_id", null);
  if (params.get("missingDepartment") === "1") query = query.is("department_id", null);
  if (params.get("missingAssignee") === "1") query = query.is("assignee_person_id", null);
  if (params.get("mine") === "1") {
    query = myPersonId ? query.eq("assignee_person_id", myPersonId) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const today = dateOnly(new Date());
  if (params.get("overdue") === "1") query = query.lt("due_date", today);
  const nearDue = intParam(params.get("nearDue"), 0, 0, 90);
  if (nearDue > 0) {
    const end = new Date();
    end.setDate(end.getDate() + nearDue);
    query = query.gte("due_date", today).lte("due_date", dateOnly(end));
  }
  return query;
}

async function countActive(supabase: any, projectId: string, mutate?: (query: any) => any) {
  let query = supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null);
  if (mutate) query = mutate(query);
  const { count } = await query;
  return count ?? 0;
}

async function getIssueSummary(supabase: any, projectId: string, myPersonId: string | null) {
  const { data, error } = await supabase.rpc("get_issue_summary_v1111", {
    p_project_id: projectId,
    p_person_id: myPersonId,
  });
  if (!error && data && typeof data === "object") {
    const value = data as unknown as Record<string, unknown>;
    return {
      total: Number(value.total ?? 0),
      notHandedOver: Number(value.notHandedOver ?? 0),
      mine: Number(value.mine ?? 0),
      overdue: Number(value.overdue ?? 0),
      waiting: Number(value.waiting ?? 0),
      missingAssignee: Number(value.missingAssignee ?? 0),
    };
  }

  // Backward-compatible fallback when the V1.1.1 performance migration has not run yet.
  const today = dateOnly(new Date());
  const [total, notHandedOver, mine, overdue, waiting, missingAssignee] = await Promise.all([
    countActive(supabase, projectId),
    countActive(supabase, projectId, (q) => q.or("customer_status_code.neq.handed_over,customer_status_code.is.null")),
    myPersonId ? countActive(supabase, projectId, (q) => q.eq("assignee_person_id", myPersonId)) : Promise.resolve(0),
    countActive(supabase, projectId, (q) => q.lt("due_date", today)),
    countActive(supabase, projectId, (q) => q.eq("status_code", "waiting")),
    countActive(supabase, projectId, (q) => q.is("assignee_person_id", null)),
  ]);
  return { total, notHandedOver, mine, overdue, waiting, missingAssignee };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    const body: IssuesApiResponse = { ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho ISSUE Core." };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoIssues(projectId) } satisfies IssuesApiResponse);

  // Preserve the non-null Supabase client for nested query builders.
  // TypeScript does not carry the outer null-narrowing into a hoisted local function.
  const db = supabase;

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    const body: IssuesApiResponse = { ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." };
    return NextResponse.json(body, { status: 401 });
  }

  const role = await getProjectRole(db, projectId, user.id);
  if (!role) {
    const body: IssuesApiResponse = { ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project này." };
    return NextResponse.json(body, { status: 403 });
  }

  const requestedPage = intParam(request.nextUrl.searchParams.get("page"), 1, 1, 100000);
  const rawPageSize = request.nextUrl.searchParams.get("pageSize")?.trim().toLowerCase();
  const allRows = rawPageSize === "all" || rawPageSize === "0";
  const pageSize = allRows ? 0 : intParam(rawPageSize ?? null, 50, 50, 1000);
  const page = allRows ? 1 : requestedPage;
  const myPersonId = await getCurrentAssigneePersonId(db, projectId, user.id);

  function buildRowsQuery(start: number, end: number, withCount = false) {
    let query: any = db
      .from("issues")
      .select(ISSUE_SELECT, withCount ? { count: "exact" } : undefined)
      .eq("project_id", projectId)
      .is("archived_at", null);
    query = applyFilters(query, request.nextUrl.searchParams, myPersonId);
    return query
      .order("issue_no", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .range(start, end);
  }

  const firstStart = allRows ? 0 : (page - 1) * pageSize;
  const firstEnd = allRows ? 999 : page * pageSize - 1;
  const [firstRowsResult, lookups, summary] = await Promise.all([
    buildRowsQuery(firstStart, firstEnd, true),
    getIssueLookups(db, projectId),
    getIssueSummary(db, projectId, myPersonId),
  ]);

  if (firstRowsResult.error) {
    const migrationMissing = /issue_no|column .* does not exist/i.test(firstRowsResult.error.message);
    const body: IssuesApiResponse = {
      ok: false,
      code: migrationMissing ? "V060_MIGRATION_REQUIRED" : "ISSUE_QUERY_FAILED",
      message: migrationMissing
        ? "ISSUE Core V0.6.0 cần chạy migration 202608220005_v060_issue_core.sql trên Supabase."
        : `Không tải được ISSUE: ${firstRowsResult.error.message}`,
    };
    return NextResponse.json(body, { status: migrationMissing ? 503 : 500 });
  }

  const total = firstRowsResult.count ?? 0;
  let rawRows = [...(firstRowsResult.data ?? [])] as Array<Record<string, unknown>>;

  // ALL is fetched in server-side chunks so it remains compatible with the default
  // Supabase/PostgREST max-row response while avoiding one unbounded database response.
  if (allRows && total > 1000) {
    const starts: number[] = [];
    for (let start = 1000; start < total; start += 1000) starts.push(start);
    for (let offset = 0; offset < starts.length; offset += 4) {
      const batch = starts.slice(offset, offset + 4);
      const results = await Promise.all(batch.map((start) => buildRowsQuery(start, Math.min(start + 999, total - 1))));
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        return NextResponse.json({ ok: false, code: "ISSUE_QUERY_FAILED", message: `Không tải được toàn bộ ISSUE: ${failed.error.message}` } satisfies IssuesApiResponse, { status: 500 });
      }
      for (const result of results) rawRows.push(...((result.data ?? []) as Array<Record<string, unknown>>));
    }
  }

  const body: IssuesApiResponse = {
    ok: true,
    data: {
      source: "database",
      projectId,
      role,
      canEdit: role !== "viewer",
      canArchive: role !== "viewer",
      page,
      pageSize,
      total,
      totalPages: allRows ? 1 : Math.max(1, Math.ceil(total / pageSize)),
      summary,
      rows: rawRows.map((row) => normalizeIssue(row)),
      lookups,
    },
  };
  return NextResponse.json(body);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    const body: IssueMutationResponse = { ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu. Hãy kết nối Supabase." };
    return NextResponse.json(body, { status: 409 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies IssueMutationResponse, { status: 401 });

  let raw: unknown;
  try { raw = await request.json(); } catch { raw = {}; }
  const parsed = parseIssueInput(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: issueValidationMessage(parsed.errors), fieldErrors: parsed.errors } satisfies IssueMutationResponse, { status: 400 });
  }

  const role = await getProjectRole(supabase, parsed.input.projectId, user.id);
  if (!role || role === "viewer") {
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền tạo ISSUE trong project này." } satisfies IssueMutationResponse, { status: 403 });
  }

  const { input } = parsed;
  const relationNames = await resolveIssueRelationNames(supabase, input.projectId, {
    moduleId: input.moduleId,
    departmentId: input.departmentId,
    requesterId: input.requesterId,
    assigneeId: input.assigneeId,
  });
  if (input.assigneeId && !relationNames.assigneeValid) {
    return NextResponse.json(
      { ok: false, code: "ASSIGNEE_NOT_PROJECT_MEMBER", message: "Người phụ trách không còn nằm trong danh sách nhân sự đang hoạt động của Project.", fieldErrors: { assigneeId: "Vui lòng chọn lại người phụ trách từ danh sách Project Team." } } satisfies IssueMutationResponse,
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("issues")
    .insert({
      project_id: input.projectId,
      content: input.content,
      status_code: input.statusCode ?? "waiting",
      customer_status_code: input.customerStatusCode ?? "not_handed_over",
      priority_code: input.priorityCode ?? "B",
      stage_code: input.stageCode,
      jira_url: input.jiraUrl,
      release_date: input.releaseDate,
      due_date: input.dueDate,
      module_id: input.moduleId,
      module_name_raw: relationNames.moduleName,
      department_id: input.departmentId,
      department_name_raw: relationNames.departmentName,
      requester_person_id: input.requesterId,
      requester_name_raw: relationNames.requesterName,
      assignee_person_id: input.assigneeId,
      assignee_name_raw: relationNames.assigneeName,
      response: input.response,
      notes: input.notes,
    })
    .select(ISSUE_SELECT)
    .single();

  if (error) {
    const migrationMissing = /issue_no|set_issue_audit_fields|does not exist/i.test(error.message);
    const friendly = friendlyIssueDatabaseError(error);
    return NextResponse.json({
      ok: false,
      code: migrationMissing ? "V060_MIGRATION_REQUIRED" : "ISSUE_CREATE_FAILED",
      message: migrationMissing ? "Hãy chạy migration V0.6.0 trước khi tạo ISSUE." : friendly.message,
      fieldErrors: migrationMissing ? undefined : friendly.fieldErrors,
    } satisfies IssueMutationResponse, { status: migrationMissing ? 503 : 500 });
  }

  return NextResponse.json({ ok: true, issue: normalizeIssue(data as unknown as Record<string, unknown>) } satisfies IssueMutationResponse, { status: 201 });
}
