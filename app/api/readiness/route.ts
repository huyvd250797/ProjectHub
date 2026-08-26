import { NextRequest, NextResponse } from "next/server";
import type { ReadinessApiResponse, ReadinessCheck, ReadinessStatus } from "@/lib/readiness/types";
import { securityEnvironmentReady } from "@/lib/resources/server";
import { getGlobalRole, getEffectiveProjectRole } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function check(id: string, label: string, status: ReadinessStatus, message: string, durationMs?: number): ReadinessCheck {
  return { id, label, status, message, durationMs };
}

async function timed<T>(fn: () => Promise<T>) {
  const started = Date.now();
  try {
    return { value: await fn(), error: null as unknown, durationMs: Date.now() - started };
  } catch (error) {
    return { value: null as T | null, error, durationMs: Date.now() - started };
  }
}

function countValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId để chạy readiness check." } satisfies ReadinessApiResponse, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      data: {
        app: "ASC WORKING",
        version: "1.1.0",
        projectId,
        generatedAt: new Date().toISOString(),
        overall: "attention",
        checks: [
          check("supabase", "Supabase environment", "warn", "Đang chạy Demo Mode; không thể xác nhận database/RLS production."),
          check("security", "Remote secret environment", "warn", "Demo Mode không kiểm tra Service Role hoặc APP_ENCRYPTION_KEY."),
        ],
        metrics: { issues: 0, modules: 0, departments: 0, resources: 0, missingAssignee: 0, missingModule: 0, missingDepartment: 0, overdue: 0 },
      },
    } satisfies ReadinessApiResponse, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ReadinessApiResponse, { status: 401 });
  }

  const checks: ReadinessCheck[] = [];
  checks.push(check("auth", "Authentication session", "pass", `Session hợp lệ cho ${user.email ?? user.id}.`));

  const accessCheck = await timed(async () => Promise.all([
    getGlobalRole(supabase, user.id),
    getEffectiveProjectRole(supabase, projectId, user.id),
  ]));
  const globalRole = accessCheck.value?.[0] ?? "user";
  const role = accessCheck.value?.[1] ?? null;
  if (accessCheck.error || !role) {
    checks.push(check("membership", "Project access / RLS", "fail", accessCheck.error ? "Không kiểm tra được quyền Project/RLS." : "Tài khoản chưa được cấp quyền vào Project này.", accessCheck.durationMs));
    const body: ReadinessApiResponse = {
      ok: true,
      data: {
        app: "ASC WORKING", version: "1.1.0", projectId, generatedAt: new Date().toISOString(), overall: "blocked", checks,
        metrics: { issues: 0, modules: 0, departments: 0, resources: 0, missingAssignee: 0, missingModule: 0, missingDepartment: 0, overdue: 0 },
      },
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  }
  checks.push(check(
    "membership",
    "Project access / RLS",
    "pass",
    globalRole === "master" ? "MASTER global access: không cần project_members." : `Đã xác nhận project_members: ${role}.`,
    accessCheck.durationMs,
  ));
  checks.push(check(
    "master_access",
    "Master / Multi-Project access",
    globalRole === "master" ? "pass" : "warn",
    globalRole === "master" ? "Tài khoản hiện tại có quyền MASTER trên mọi Project." : "Tài khoản hiện tại dùng quyền theo từng Project.",
  ));

  const projectProfile = await timed(async () => supabase
    .from("projects")
    .select("id,organization_name,organization_code,organization_address,contact_name,contact_email")
    .eq("id", projectId)
    .maybeSingle());
  const projectProfileError = projectProfile.error || projectProfile.value?.error;
  checks.push(check(
    "project_profile",
    "Project Profile schema",
    projectProfileError ? "fail" : "pass",
    projectProfileError
      ? "Không đọc được hồ sơ Project mở rộng; kiểm tra migration V0.9.3."
      : "Project Profile V0.9.3 đã sẵn sàng cho thông tin trường/đơn vị và đầu mối.",
    projectProfile.durationMs,
  ));

  const database = await timed(async () => Promise.all([
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null),
    supabase.from("contract_items").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("item_type", "module"),
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("is_active", true),
    supabase.from("remote_resources").select("id", { count: "exact", head: true }).eq("project_id", projectId),
  ]));

  let issues = 0;
  let modules = 0;
  let departments = 0;
  let resources = 0;
  if (database.error || !database.value || database.value.some((result) => result.error)) {
    const firstError = database.value?.find((result) => result.error)?.error?.message;
    checks.push(check("database", "Core schema & RLS queries", "fail", `Không đọc được schema nghiệp vụ${firstError ? `: ${firstError}` : "."}`, database.durationMs));
  } else {
    [issues, modules, departments, resources] = database.value.map((result) => countValue(result.count));
    checks.push(check("database", "Core schema & RLS queries", "pass", `${issues} ISSUE • ${modules} Module • ${departments} Phòng ban • ${resources} Resource.`, database.durationMs));
  }

  const dashboard = await timed(async () => supabase.rpc("get_project_dashboard", { p_project_id: projectId }));
  const dashboardError = dashboard.error || dashboard.value?.error;
  checks.push(check(
    "dashboard_rpc",
    "Dashboard aggregate RPC",
    dashboardError ? "fail" : "pass",
    dashboardError ? "Không gọi được get_project_dashboard; kiểm tra migration V0.3.0." : "Dashboard aggregate RPC hoạt động.",
    dashboard.durationMs,
  ));

  const productivity = await timed(async () => supabase.from("issue_saved_views").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("user_id", user.id));
  const productivityError = productivity.error || productivity.value?.error;
  checks.push(check(
    "productivity",
    "ISSUE Productivity schema",
    productivityError ? "fail" : "pass",
    productivityError ? "Không đọc được Saved Views/User Preferences; kiểm tra migration V0.7.0." : "Saved Views/User Preferences sẵn sàng.",
    productivity.durationMs,
  ));

  const notificationsSchema = await timed(async () => Promise.all([
    supabase.from("activity_events").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("user_id", user.id),
  ]));
  const notificationsSchemaError = notificationsSchema.error || notificationsSchema.value?.find((result) => result.error)?.error;
  checks.push(check(
    "notifications",
    "Notifications & Activity schema",
    notificationsSchemaError ? "fail" : "pass",
    notificationsSchemaError ? "Không đọc được Activity/Notifications; kiểm tra migration V1.1.0." : "Notification inbox, Activity Feed và read-state schema sẵn sàng.",
    notificationsSchema.durationMs,
  ));

  const importSchema = await timed(async () => supabase.rpc("preview_import_v092", {
    p_project_id: projectId,
    p_payload: {
      projectId,
      templateVersion: "0.9.2",
      departments: [], people: [], stages: [], contractItems: [], contractDetails: [], releaseVersions: [], issues: [], remoteResources: [],
    },
  }));
  const importSchemaError = importSchema.error || importSchema.value?.error;
  checks.push(check(
    "excel_import",
    "Excel Import Production RPC",
    importSchemaError ? "fail" : "pass",
    importSchemaError ? "Không gọi được preview_import_v092; kiểm tra migration V0.9.2." : "Template Preview/Apply RPC đã sẵn sàng.",
    importSchema.durationMs,
  ));

  const remoteSchema = await timed(async () => supabase.from("remote_resource_permissions").select("resource_id", { count: "exact", head: true }).eq("project_id", projectId));
  const remoteSchemaError = remoteSchema.error || remoteSchema.value?.error;
  checks.push(check(
    "remote_schema",
    "Remote Security schema",
    remoteSchemaError ? "fail" : "pass",
    remoteSchemaError ? "Không đọc được permission schema; kiểm tra migration V0.8.0." : "Permission/Audit schema sẵn sàng.",
    remoteSchema.durationMs,
  ));

  const serviceReady = Boolean(createServiceClient());
  const encryptionReady = securityEnvironmentReady();
  checks.push(check(
    "secret_env",
    "Server-only credential environment",
    serviceReady && encryptionReady ? "pass" : "fail",
    serviceReady && encryptionReady
      ? "SUPABASE_SERVICE_ROLE_KEY và APP_ENCRYPTION_KEY đã được nhận phía server."
      : "Thiếu SUPABASE_SERVICE_ROLE_KEY hoặc APP_ENCRYPTION_KEY hợp lệ trên Vercel.",
  ));

  const quality = await timed(async () => Promise.all([
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("assignee_person_id", null),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("module_id", null),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).is("department_id", null),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId).is("archived_at", null).lt("due_date", new Date().toISOString().slice(0, 10)).neq("status_code", "resolved").neq("status_code", "released"),
  ]));
  let missingAssignee = 0;
  let missingModule = 0;
  let missingDepartment = 0;
  let overdue = 0;
  if (!quality.error && quality.value && !quality.value.some((result) => result.error)) {
    [missingAssignee, missingModule, missingDepartment, overdue] = quality.value.map((result) => countValue(result.count));
    const attention = missingAssignee + missingModule + missingDepartment + overdue;
    checks.push(check(
      "data_quality",
      "UAT data quality",
      attention > 0 ? "warn" : "pass",
      attention > 0
        ? `${missingAssignee} thiếu phụ trách • ${missingModule} thiếu Module • ${missingDepartment} thiếu Phòng ban • ${overdue} quá hạn.`
        : "Không phát hiện ISSUE thiếu mapping hoặc quá hạn trong kiểm tra nhanh.",
      quality.durationMs,
    ));
  } else {
    checks.push(check("data_quality", "UAT data quality", "warn", "Không chạy được kiểm tra chất lượng dữ liệu nhanh.", quality.durationMs));
  }

  const overall = checks.some((item) => item.status === "fail") ? "blocked" : checks.some((item) => item.status === "warn") ? "attention" : "ready";
  const body: ReadinessApiResponse = {
    ok: true,
    data: {
      app: "ASC WORKING",
      version: "1.1.0",
      projectId,
      generatedAt: new Date().toISOString(),
      overall,
      checks,
      metrics: { issues, modules, departments, resources, missingAssignee, missingModule, missingDepartment, overdue },
    },
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
