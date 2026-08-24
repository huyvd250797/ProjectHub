import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveProjectRole } from "@/lib/access";
import type { IssueLookups, IssueRow, ProjectRole, SelectOption } from "./types";

export const ISSUE_SELECT = `
  id, issue_no, content, status_code, customer_status_code, priority_code, stage_code,
  jira_url, release_date, due_date, module_id, response, department_id,
  requester_person_id, assignee_person_id, notes, created_at, updated_at,
  module:contract_items!issues_module_id_fkey(id, code, name),
  department:departments!issues_department_id_fkey(id, code, name),
  requester:people!issues_requester_person_id_fkey(id, full_name),
  assignee:people!issues_assignee_person_id_fkey(id, full_name, email)
`;

function relation(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) ?? null;
  return value as Record<string, unknown>;
}

function nullableText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export function normalizeIssue(raw: Record<string, unknown>): IssueRow {
  const module = relation(raw.module);
  const department = relation(raw.department);
  const requester = relation(raw.requester);
  const assignee = relation(raw.assignee);

  return {
    id: String(raw.id ?? ""),
    issueNo: raw.issue_no === null || raw.issue_no === undefined ? null : Number(raw.issue_no),
    content: String(raw.content ?? ""),
    statusCode: nullableText(raw.status_code),
    customerStatusCode: nullableText(raw.customer_status_code),
    priorityCode: nullableText(raw.priority_code),
    stageCode: nullableText(raw.stage_code),
    jiraUrl: nullableText(raw.jira_url),
    releaseDate: nullableText(raw.release_date),
    dueDate: nullableText(raw.due_date),
    moduleId: nullableText(raw.module_id),
    moduleName: nullableText(module?.name),
    departmentId: nullableText(raw.department_id),
    departmentName: nullableText(department?.name),
    requesterId: nullableText(raw.requester_person_id),
    requesterName: nullableText(requester?.full_name),
    assigneeId: nullableText(raw.assignee_person_id),
    assigneeName: nullableText(assignee?.full_name),
    response: nullableText(raw.response),
    notes: nullableText(raw.notes),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

export async function getProjectRole(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  return getEffectiveProjectRole(supabase, projectId, userId);
}

function dedupeCatalog(rows: Array<Record<string, unknown>>, category: string): SelectOption[] {
  const map = new Map<string, SelectOption>();
  rows
    .filter((row) => row.category === category && row.is_active !== false)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .forEach((row) => {
      const code = String(row.code ?? "");
      if (!code) return;
      const option = { value: code, label: String(row.label ?? code) };
      if (row.project_id) map.set(code, option);
      else if (!map.has(code)) map.set(code, option);
    });
  return [...map.values()];
}

export async function getIssueLookups(supabase: SupabaseClient, projectId: string): Promise<IssueLookups> {
  const [catalogResult, stageResult, moduleResult, departmentResult, peopleResult, membershipResult] = await Promise.all([
    supabase
      .from("status_catalog")
      .select("project_id, category, code, label, sort_order, is_active")
      .in("category", ["issue_status", "customer_status", "priority"])
      .or(`project_id.is.null,project_id.eq.${projectId}`),
    supabase
      .from("project_stages")
      .select("code, name, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("contract_items")
      .select("id, code, name, sort_order")
      .eq("project_id", projectId)
      .eq("item_type", "module")
      .order("sort_order", { ascending: true })
      .limit(2000),
    supabase
      .from("departments")
      .select("id, code, name")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("people")
      .select("id, user_id, full_name, title, person_type, department_id, email")
      .eq("project_id", projectId)
      .order("full_name", { ascending: true })
      .limit(2000),
    supabase
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId),
  ]);

  const catalog = (catalogResult.data ?? []) as Array<Record<string, unknown>>;
  const people = (peopleResult.data ?? []) as Array<Record<string, unknown>>;
  const memberships = (membershipResult.data ?? []) as Array<Record<string, unknown>>;
  const memberUserIds = memberships.map((row) => String(row.user_id)).filter(Boolean);

  const profileResult = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, is_active")
        .in("id", memberUserIds)
    : { data: [], error: null };

  const profiles = (profileResult.data ?? []) as Array<Record<string, unknown>>;
  const profileMap = new Map<string, Record<string, unknown>>(
    profiles.map((row) => [String(row.id), row]),
  );
  const personByUser = new Map<string, Record<string, unknown>>(
    people
      .filter((row) => row.person_type === "asc" && row.user_id)
      .map((row) => [String(row.user_id), row]),
  );

  const assignees = memberships
    .map((membership) => {
      const userId = String(membership.user_id ?? "");
      const profile = profileMap.get(userId);
      const person = personByUser.get(userId);
      if (!userId || !profile || profile.is_active === false || !person?.id) return null;
      const role = String(membership.role ?? "member").toUpperCase();
      const email = profile.email ? String(profile.email) : person.email ? String(person.email) : "";
      return {
        value: String(person.id),
        label: String(profile.display_name ?? person.full_name ?? email ?? userId),
        description: [email, role].filter(Boolean).join(" • "),
      } satisfies SelectOption;
    })
    .filter((option): option is SelectOption => Boolean(option))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));

  return {
    statuses: dedupeCatalog(catalog, "issue_status"),
    customerStatuses: dedupeCatalog(catalog, "customer_status"),
    priorities: dedupeCatalog(catalog, "priority"),
    stages: (stageResult.data ?? []).map((row) => ({
      value: String(row.code),
      label: String(row.name),
      description: String(row.code),
    })),
    modules: (moduleResult.data ?? []).map((row) => ({
      value: String(row.id),
      label: String(row.name),
      description: row.code ? String(row.code) : null,
    })),
    departments: (departmentResult.data ?? []).map((row) => ({
      value: String(row.id),
      label: String(row.name),
      description: row.code ? String(row.code) : null,
    })),
    assignees,
    requesters: people
      .filter((row) => row.person_type === "customer")
      .map((row) => ({
        value: String(row.id),
        label: String(row.full_name),
        description: row.title ? String(row.title) : null,
      })),
  };
}

export async function getCurrentAssigneePersonId(
  supabase: SupabaseClient,
  projectId: string,
  email: string | undefined,
) {
  if (!email) return null;
  const { data } = await supabase
    .from("people")
    .select("id")
    .eq("project_id", projectId)
    .eq("person_type", "asc")
    .eq("email", email)
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function resolveIssueRelationNames(
  supabase: SupabaseClient,
  projectId: string,
  ids: {
    moduleId?: string | null;
    departmentId?: string | null;
    requesterId?: string | null;
    assigneeId?: string | null;
  },
) {
  const [moduleResult, departmentResult, requesterResult, assigneeResult] = await Promise.all([
    ids.moduleId
      ? supabase.from("contract_items").select("name").eq("project_id", projectId).eq("id", ids.moduleId).maybeSingle()
      : Promise.resolve({ data: null }),
    ids.departmentId
      ? supabase.from("departments").select("name").eq("project_id", projectId).eq("id", ids.departmentId).maybeSingle()
      : Promise.resolve({ data: null }),
    ids.requesterId
      ? supabase.from("people").select("full_name").eq("project_id", projectId).eq("id", ids.requesterId).maybeSingle()
      : Promise.resolve({ data: null }),
    ids.assigneeId
      ? supabase.from("people").select("full_name,user_id").eq("project_id", projectId).eq("person_type", "asc").eq("id", ids.assigneeId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let assigneeValid = true;
  if (ids.assigneeId) {
    const assigneeUserId = assigneeResult.data?.user_id ? String(assigneeResult.data.user_id) : null;
    if (!assigneeUserId) {
      assigneeValid = false;
    } else {
      const { data: membership } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId)
        .eq("user_id", assigneeUserId)
        .maybeSingle();
      assigneeValid = Boolean(membership?.user_id);
    }
  }

  return {
    moduleName: moduleResult.data?.name ? String(moduleResult.data.name) : null,
    departmentName: departmentResult.data?.name ? String(departmentResult.data.name) : null,
    requesterName: requesterResult.data?.full_name ? String(requesterResult.data.full_name) : null,
    assigneeName: assigneeResult.data?.full_name ? String(assigneeResult.data.full_name) : null,
    assigneeValid,
  };
}
