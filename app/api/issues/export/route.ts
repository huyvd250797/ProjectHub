import { NextRequest, NextResponse } from "next/server";
import { getCurrentAssigneePersonId, getIssueLookups, getProjectRole, ISSUE_SELECT, normalizeIssue } from "@/lib/issues/server";
import type { SelectOption } from "@/lib/issues/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function dateOnly(date: Date) { return date.toISOString().slice(0, 10); }
function intParam(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
}
function applyFilters(query: any, params: URLSearchParams, myPersonId: string | null) {
  const search = params.get("search")?.trim();
  const safe = search?.replace(/[,%()]/g, " ").trim();
  if (safe) query = query.or(`content.ilike.%${safe}%,jira_url.ilike.%${safe}%,module_name_raw.ilike.%${safe}%,department_name_raw.ilike.%${safe}%,requester_name_raw.ilike.%${safe}%,assignee_name_raw.ilike.%${safe}%`);
  const pairs: Array<[string,string]> = [["status","status_code"],["priority","priority_code"],["stage","stage_code"],["moduleId","module_id"],["departmentId","department_id"],["assigneeId","assignee_person_id"]];
  for (const [param, column] of pairs) { const value = params.get(param)?.trim(); if (value) query = query.eq(column, value); }
  const customer = params.get("customerStatus")?.trim();
  if (customer === "not_handed_over") query = query.or("customer_status_code.eq.not_handed_over,customer_status_code.is.null");
  else if (customer) query = query.eq("customer_status_code", customer);
  if (params.get("missingModule") === "1") query = query.is("module_id", null);
  if (params.get("missingDepartment") === "1") query = query.is("department_id", null);
  if (params.get("missingAssignee") === "1") query = query.is("assignee_person_id", null);
  if (params.get("mine") === "1") query = myPersonId ? query.eq("assignee_person_id", myPersonId) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  const today = dateOnly(new Date());
  if (params.get("overdue") === "1") query = query.lt("due_date", today);
  const nearDue = intParam(params.get("nearDue"), 0, 0, 90);
  if (nearDue > 0) { const end = new Date(); end.setDate(end.getDate() + nearDue); query = query.gte("due_date", today).lte("due_date", dateOnly(end)); }
  return query;
}
function csvCell(value: unknown) { const text = value === null || value === undefined ? "" : String(value); return `"${text.replace(/"/g, '""')}"`; }
function optionLabel(options: SelectOption[], value: string | null) { return value ? options.find((item) => item.value === value)?.label ?? value : ""; }

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, message: "Thiếu projectId." }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Demo Mode không export dữ liệu thật." }, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, message: "Bạn không có quyền truy cập project." }, { status: 403 });
  const [lookups, myPersonId] = await Promise.all([getIssueLookups(supabase, projectId), getCurrentAssigneePersonId(supabase, projectId, user.id)]);

  const all: ReturnType<typeof normalizeIssue>[] = [];
  const batchSize = 1000;
  const maxRows = 10000;
  for (let offset = 0; offset < maxRows; offset += batchSize) {
    let query: any = supabase.from("issues").select(ISSUE_SELECT).eq("project_id", projectId).is("archived_at", null);
    query = applyFilters(query, request.nextUrl.searchParams, myPersonId)
      .order("issue_no", { ascending: false, nullsFirst: false })
      .range(offset, offset + batchSize - 1);
    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, message: `Không export được ISSUE: ${error.message}` }, { status: 500 });
    const rows = (data ?? []).map((row: Record<string, unknown>) => normalizeIssue(row));
    all.push(...rows);
    if (rows.length < batchSize) break;
  }

  const headers = ["ISSUE No","Nội dung","Trạng thái","Trạng thái KH","Ưu tiên","Giai đoạn","Module","Phòng ban","Người yêu cầu","Phụ trách","Due Date","Release Date","Jira","ASC phản hồi","Ghi chú","Cập nhật"];
  const lines = [headers.map(csvCell).join(",")];
  for (const issue of all) {
    lines.push([
      issue.issueNo ?? "", issue.content, optionLabel(lookups.statuses, issue.statusCode), optionLabel(lookups.customerStatuses, issue.customerStatusCode), optionLabel(lookups.priorities, issue.priorityCode), optionLabel(lookups.stages, issue.stageCode), issue.moduleName ?? "", issue.departmentName ?? "", issue.requesterName ?? "", issue.assigneeName ?? "", issue.dueDate ?? "", issue.releaseDate ?? "", issue.jiraUrl ?? "", issue.response ?? "", issue.notes ?? "", issue.updatedAt,
    ].map(csvCell).join(","));
  }
  const fileName = `ASC-WORKING-ISSUES-${new Date().toISOString().slice(0,10)}.csv`;
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" } });
}
