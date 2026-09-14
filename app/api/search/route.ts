import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDemoContract } from "@/lib/contract/demo";
import { createDemoIssues } from "@/lib/issues/demo";
import { demoProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

type SearchItem = {
  id: string;
  module: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

type SearchResponse =
  | { ok: true; items: SearchItem[] }
  | { ok: false; code: string; message: string };

type ResourceSearchRow = {
  id: unknown;
  name: unknown;
  resource_type: unknown;
  environment: unknown;
  url_or_host: unknown;
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function like(value: string) {
  // Escape wildcard and PostgREST .or() separators so user input remains a
  // literal search term instead of changing the filter expression.
  return `%${value.replace(/[%_,()]/g, "\\$&")}%`;
}

function jiraCodeFromUrl(value: unknown) {
  const raw = text(value).trim();
  if (!raw) return "";
  const browseMatch = raw.match(/\/browse\/([^/?#]+)/i);
  if (browseMatch?.[1]) return decodeURIComponent(browseMatch[1]);
  return raw;
}

function issueHref(query: string) {
  return `/issues?search=${encodeURIComponent(query)}`;
}

function item(
  id: string,
  module: string,
  title: string,
  subtitle: string,
  href: string,
  badge?: string,
): SearchItem {
  return { id, module, title, subtitle, href, badge };
}

async function safeQuery<T>(runner: () => Promise<{ data: T[] | null; error: { message: string } | null }>) {
  try {
    const result = await runner();
    if (result.error) return [] as T[];
    return result.data ?? [];
  } catch {
    return [] as T[];
  }
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId để tìm kiếm." } satisfies SearchResponse, { status: 400 });
  if (query.length < 2) return NextResponse.json({ ok: true, items: [] } satisfies SearchResponse);

  const supabase = await createClient();
  if (!supabase) {
    const project = demoProjects.find((row) => row.id === projectId) ?? demoProjects[0];
    const q = query.toLowerCase();
    const issueRows = createDemoIssues(project.id).rows
      .filter((row) => [row.content, row.jiraUrl, row.moduleName, row.departmentName, row.assigneeName, `#${row.issueNo ?? ""}`].some((value) => text(value).toLowerCase().includes(q)))
      .slice(0, 5)
      .map((row) => item(`demo-issue-${row.id}`, "ISSUE", `ISSUE #${row.issueNo ?? "—"}`, row.content, issueHref(jiraCodeFromUrl(row.jiraUrl) || query), jiraCodeFromUrl(row.jiraUrl) || undefined));
    const contractRows = createDemoContract(project.id).details
      .filter((row) => [row.code, row.content, row.nodeType].some((value) => text(value).toLowerCase().includes(q)))
      .slice(0, 3)
      .map((row) => item(`demo-contract-${row.id}`, "PLHĐ", row.content, `${row.code || "—"} • ${row.nodeType ?? "function"}`, `/contract?search=${encodeURIComponent(query)}`, row.code || undefined));
    return NextResponse.json({ ok: true, items: [...issueRows, ...contractRows].slice(0, 8) } satisfies SearchResponse);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies SearchResponse, { status: 401 });

  const pattern = like(query);
  const numeric = query.replace(/[^\d]/g, "");
  const issueOr = [
    `content.ilike.${pattern}`,
    `jira_url.ilike.${pattern}`,
    `response.ilike.${pattern}`,
    `notes.ilike.${pattern}`,
    numeric ? `issue_no.eq.${numeric}` : "",
  ].filter(Boolean).join(",");

  const [issues, contractItems, contractDetails, departments, stages, milestones, tasks, documents, resources] = await Promise.all([
    safeQuery(() => supabase.from("issues").select("id,issue_no,content,jira_url,status_code").eq("project_id", projectId).is("archived_at", null).or(issueOr).order("updated_at", { ascending: false }).limit(6)),
    safeQuery(() => supabase.from("contract_items").select("id,code,name,item_type,module_status_code").eq("project_id", projectId).or(`code.ilike.${pattern},name.ilike.${pattern},classification.ilike.${pattern}`).order("sort_order", { ascending: true }).limit(5)),
    safeQuery(() => supabase.from("contract_detail_items").select("id,code,content,node_type,note").eq("project_id", projectId).or(`code.ilike.${pattern},content.ilike.${pattern},note.ilike.${pattern}`).order("sort_order", { ascending: true }).limit(5)),
    safeQuery(() => supabase.from("departments").select("id,code,name").eq("project_id", projectId).eq("is_active", true).or(`code.ilike.${pattern},name.ilike.${pattern}`).order("name", { ascending: true }).limit(4)),
    safeQuery(() => supabase.from("project_stages").select("id,code,name,status").eq("project_id", projectId).or(`code.ilike.${pattern},name.ilike.${pattern},status.ilike.${pattern}`).order("sort_order", { ascending: true }).limit(4)),
    safeQuery(() => supabase.from("project_milestones").select("id,title,status,due_date").eq("project_id", projectId).or(`title.ilike.${pattern},description.ilike.${pattern},status.ilike.${pattern}`).order("due_date", { ascending: true }).limit(4)),
    safeQuery(() => supabase.from("project_plan_tasks").select("id,title,status,due_date").eq("project_id", projectId).or(`title.ilike.${pattern},description.ilike.${pattern},status.ilike.${pattern}`).order("due_date", { ascending: true }).limit(4)),
    safeQuery(() => supabase.from("project_documents").select("id,title,document_type,description").eq("project_id", projectId).or(`title.ilike.${pattern},description.ilike.${pattern},document_type.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(4)),
    safeQuery(() => supabase.from("remote_resources").select("id,name,resource_type,environment,url_or_host").eq("project_id", projectId).or(`name.ilike.${pattern},resource_type.ilike.${pattern},environment.ilike.${pattern},url_or_host.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(4)),
  ]);

  const items: SearchItem[] = [
    ...issues.map((row) => {
      const jiraCode = jiraCodeFromUrl(row.jira_url);
      return item(`issue-${row.id}`, "ISSUE", `ISSUE ${jiraCode || `#${row.issue_no ?? "—"}`}`, text(row.content), issueHref(jiraCode || query), jiraCode || text(row.status_code) || undefined);
    }),
    ...contractItems.map((row) => item(`contract-item-${row.id}`, "PLHĐ", text(row.name), `${text(row.code) || "—"} • ${text(row.item_type) || "module"}`, `/contract?search=${encodeURIComponent(query)}`, text(row.code) || undefined)),
    ...contractDetails.map((row) => item(`contract-detail-${row.id}`, "PLHĐ chi tiết", text(row.content), `${text(row.code) || "—"} • ${text(row.node_type) || "function"}`, `/contract?search=${encodeURIComponent(query)}`, text(row.code) || undefined)),
    ...departments.map((row) => item(`department-${row.id}`, "Phòng ban", text(row.name), text(row.code) || "Danh mục phòng ban", `/departments?search=${encodeURIComponent(query)}`, text(row.code) || undefined)),
    ...stages.map((row) => item(`stage-${row.id}`, "Plan", text(row.name), `${text(row.code) || "Stage"} • ${text(row.status) || "Chưa cập nhật"}`, `/plan?search=${encodeURIComponent(query)}`, text(row.code) || undefined)),
    ...milestones.map((row) => item(`milestone-${row.id}`, "Milestone", text(row.title), `${text(row.due_date) || "Chưa có due date"} • ${text(row.status) || "Chưa cập nhật"}`, `/plan?search=${encodeURIComponent(query)}`, "Milestone")),
    ...tasks.map((row) => item(`task-${row.id}`, "Execution Task", text(row.title), `${text(row.due_date) || "Chưa có due date"} • ${text(row.status) || "Chưa cập nhật"}`, `/plan?search=${encodeURIComponent(query)}`, "Task")),
    ...documents.map((row) => item(`document-${row.id}`, "Document", text(row.title), `${text(row.document_type) || "Tài liệu"} • ${text(row.description).slice(0, 90)}`, `/documents?search=${encodeURIComponent(query)}`, text(row.document_type) || undefined)),
    ...(resources as ResourceSearchRow[]).map((row) => item(`resource-${row.id}`, "Remote Server", text(row.name), `${text(row.resource_type) || "Resource"} • ${text(row.environment) || text(row.url_or_host)}`, `/resources?search=${encodeURIComponent(query)}`, text(row.environment) || undefined)),
  ].filter((row) => row.title.trim()).slice(0, 10);

  return NextResponse.json({ ok: true, items } satisfies SearchResponse, {
    headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=20", Vary: "Cookie" },
  });
}
