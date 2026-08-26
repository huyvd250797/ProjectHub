import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoAnalytics } from "@/lib/analytics/demo";
import { createDemoDashboard } from "@/lib/dashboard/demo";
import { demoProjects } from "@/lib/projects";
import type {
  ExecutiveReportApiResponse,
  ExecutiveReportData,
  ExecutiveReportSnapshot,
  ReportPeriodType,
  ReportSnapshotMutationResponse,
} from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Dict = Record<string, unknown>;

function obj(value: unknown): Dict {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Dict) : {};
}
function arr(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function s(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function nullable(value: unknown) { return value === null || value === undefined || value === "" ? null : String(value); }
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function startOfWeek(today: Date) {
  const copy = new Date(today);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}
function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolvePeriod(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("period")?.trim() as ReportPeriodType | undefined;
  const type: ReportPeriodType = ["week", "month", "30d", "90d", "all", "custom"].includes(raw ?? "") ? raw! : "week";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = isoDate(today);

  if (type === "all") return { type, from: null, to, label: "Toàn bộ dữ liệu" };
  if (type === "week") {
    const from = isoDate(startOfWeek(today));
    return { type, from, to, label: `Tuần này • ${from} → ${to}` };
  }
  if (type === "month") {
    const from = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    return { type, from, to, label: `Tháng này • ${from} → ${to}` };
  }
  if (type === "30d" || type === "90d") {
    const days = type === "30d" ? 30 : 90;
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - days + 1);
    const from = isoDate(fromDate);
    return { type, from, to, label: `${days} ngày • ${from} → ${to}` };
  }

  const customFrom = parseDate(request.nextUrl.searchParams.get("from"));
  const customTo = parseDate(request.nextUrl.searchParams.get("to"));
  if (!customFrom || !customTo || customFrom > customTo) {
    throw new Error("Khoảng ngày tùy chọn không hợp lệ. Chọn Từ ngày nhỏ hơn hoặc bằng Đến ngày.");
  }
  return { type, from: isoDate(customFrom), to: isoDate(customTo), label: `Tùy chọn • ${isoDate(customFrom)} → ${isoDate(customTo)}` };
}

function normalizeSnapshot(row: Dict): ExecutiveReportSnapshot {
  const metrics = obj(row.snapshot);
  return {
    id: s(row.id),
    reportKey: s(row.report_key),
    title: nullable(row.title),
    periodType: (row.period_type || "custom") as ReportPeriodType,
    periodStart: nullable(row.period_start),
    periodEnd: s(row.period_end),
    pmComment: nullable(row.pm_comment),
    nextPlan: nullable(row.next_plan),
    createdAt: s(row.created_at),
    updatedAt: s(row.updated_at),
    createdBy: nullable(row.created_by),
    metrics: {
      healthScore: n(metrics.healthScore),
      open: n(metrics.open),
      overdue: n(metrics.overdue),
      highPriorityOpen: n(metrics.highPriorityOpen),
      handoverProgress: n(metrics.handoverProgress),
      resolvedInRange: n(metrics.resolvedInRange),
      createdInRange: n(metrics.createdInRange),
    },
  };
}

function riskRows(value: unknown) {
  return arr(value).map((item) => {
    const row = obj(item);
    return {
      id: s(row.id),
      name: s(row.name),
      open: n(row.open),
      overdue: n(row.overdue),
      highPriority: n(row.highPriority),
      riskScore: n(row.riskScore),
    };
  });
}

function memberRows(value: unknown) {
  return arr(value).map((item) => {
    const row = obj(item);
    return {
      id: s(row.id), name: s(row.name), email: nullable(row.email), total: n(row.total),
      open: n(row.open), overdue: n(row.overdue), highPriority: n(row.highPriority),
      progress: n(row.progress), riskScore: n(row.riskScore),
    };
  });
}

async function getSnapshots(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string, periodEnd: string) {
  const { data, error } = await supabase
    .from("report_snapshots")
    .select("id,report_key,period_type,period_start,period_end,title,pm_comment,next_plan,snapshot,created_by,created_at,updated_at")
    .eq("project_id", projectId)
    .order("period_end", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) {
    if (/report_snapshots|relation .* does not exist/i.test(error.message)) return { ready: false, snapshots: [] as ExecutiveReportSnapshot[], previousSnapshot: null as ExecutiveReportSnapshot | null };
    throw new Error(error.message);
  }
  const snapshots = (data ?? []).map((row: unknown) => normalizeSnapshot(row as Dict));
  const previousSnapshot = snapshots.find((item: ExecutiveReportSnapshot) => item.periodEnd < periodEnd) ?? null;
  return { ready: true, snapshots, previousSnapshot };
}

async function buildDatabaseReport(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  projectId: string,
  userId: string,
  period: ReturnType<typeof resolvePeriod>,
): Promise<ExecutiveReportData> {
  const role = await getEffectiveProjectRole(supabase, projectId, userId);
  if (!role) throw new Error("FORBIDDEN");

  const [dashboardResult, analyticsResult, snapshotResult] = await Promise.all([
    supabase.rpc("get_project_dashboard", { p_project_id: projectId }),
    supabase.rpc("get_project_analytics_v120", { p_project_id: projectId, p_from: period.from, p_to: period.to }),
    getSnapshots(supabase, projectId, period.to),
  ]);

  if (dashboardResult.error) {
    throw new Error(/get_project_dashboard|function .* does not exist/i.test(dashboardResult.error.message) ? "V030_MIGRATION_REQUIRED" : dashboardResult.error.message);
  }
  if (analyticsResult.error) {
    throw new Error(/get_project_analytics_v120|function .* does not exist/i.test(analyticsResult.error.message) ? "V120_MIGRATION_REQUIRED" : analyticsResult.error.message);
  }

  const dashboard = obj(dashboardResult.data);
  const analytics = obj(analyticsResult.data);
  const project = obj(dashboard.project);
  const issueSummary = obj(analytics.summary);
  const health = obj(analytics.health);
  const attention = obj(analytics.attention);
  const contract = obj(dashboard.contract);
  const schedule = obj(dashboard.schedule);

  return {
    source: "database",
    generatedAt: s(analytics.generatedAt || new Date().toISOString()),
    role,
    canSaveSnapshot: role === "admin" || role === "pm",
    snapshotFeatureReady: snapshotResult.ready,
    project: {
      id: s(project.id), code: s(project.code), name: s(project.name), organizationName: s(project.organizationName),
      status: (project.status || "active") as ExecutiveReportData["project"]["status"],
      contractNo: nullable(project.contractNo), contractValue: project.contractValue == null ? null : n(project.contractValue),
      contractDate: nullable(project.contractDate), startDate: nullable(project.startDate), dueDate: nullable(project.dueDate),
    },
    period,
    health: { score: n(health.score), status: (health.status || "no_data") as ExecutiveReportData["health"]["status"] },
    summary: {
      total: n(issueSummary.total), open: n(issueSummary.open), resolved: n(issueSummary.resolved), released: n(issueSummary.released),
      overdue: n(issueSummary.overdue), highPriorityOpen: n(issueSummary.highPriorityOpen), createdInRange: n(issueSummary.createdInRange),
      resolvedInRange: n(issueSummary.resolvedInRange), handedOver: n(issueSummary.handedOver), handoverProgress: n(contract.handoverProgress),
      avgAgeDays: n(issueSummary.avgAgeDays), avgResolutionDays: n(issueSummary.avgResolutionDays),
    },
    schedule: {
      timeProgress: schedule.timeProgress == null ? null : n(schedule.timeProgress),
      remainingDays: schedule.remainingDays == null ? null : n(schedule.remainingDays),
      health: (schedule.health || "not_scheduled") as ExecutiveReportData["schedule"]["health"],
    },
    attention: {
      missingModule: n(attention.missingModule), missingDepartment: n(attention.missingDepartment),
      missingAssignee: n(attention.missingAssignee), nearDue: n(attention.nearDue),
    },
    topModules: riskRows(analytics.topModules),
    topDepartments: riskRows(analytics.topDepartments),
    members: memberRows(analytics.members),
    previousSnapshot: snapshotResult.previousSnapshot ?? null,
    snapshots: snapshotResult.snapshots,
  };
}

function buildDemoReport(projectId: string, period: ReturnType<typeof resolvePeriod>): ExecutiveReportData {
  const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
  const dashboard = createDemoDashboard(project);
  const analytics = createDemoAnalytics(project.id, project.code);
  return {
    source: "demo", generatedAt: new Date().toISOString(), role: "admin", canSaveSnapshot: false, snapshotFeatureReady: false,
    project: dashboard.project,
    period,
    health: { score: analytics.health.score, status: analytics.health.status },
    summary: {
      total: analytics.summary.total, open: analytics.summary.open, resolved: analytics.summary.resolved, released: analytics.summary.released,
      overdue: analytics.summary.overdue, highPriorityOpen: analytics.summary.highPriorityOpen, createdInRange: analytics.summary.createdInRange,
      resolvedInRange: analytics.summary.resolvedInRange, handedOver: analytics.summary.handedOver,
      handoverProgress: dashboard.contract.handoverProgress, avgAgeDays: analytics.summary.avgAgeDays, avgResolutionDays: analytics.summary.avgResolutionDays,
    },
    schedule: dashboard.schedule,
    attention: analytics.attention,
    topModules: analytics.topModules.map((row) => ({ id: row.id, name: row.name, open: row.open, overdue: row.overdue, highPriority: row.highPriority, riskScore: row.riskScore })),
    topDepartments: analytics.topDepartments.map((row) => ({ id: row.id, name: row.name, open: row.open, overdue: row.overdue, highPriority: row.highPriority, riskScore: row.riskScore })),
    members: analytics.members,
    previousSnapshot: null,
    snapshots: [],
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Executive Report." } satisfies ExecutiveReportApiResponse, { status: 400 });

  let period: ReturnType<typeof resolvePeriod>;
  try { period = resolvePeriod(request); }
  catch (error) { return NextResponse.json({ ok: false, code: "INVALID_PERIOD", message: error instanceof Error ? error.message : "Khoảng báo cáo không hợp lệ." } satisfies ExecutiveReportApiResponse, { status: 400 }); }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: buildDemoReport(projectId, period) } satisfies ExecutiveReportApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ExecutiveReportApiResponse, { status: 401 });

  try {
    const data = await buildDatabaseReport(supabase, projectId, user.id, period);
    return NextResponse.json({ ok: true, data } satisfies ExecutiveReportApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Executive Report.";
    if (message === "FORBIDDEN") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies ExecutiveReportApiResponse, { status: 403 });
    if (message === "V030_MIGRATION_REQUIRED" || message === "V120_MIGRATION_REQUIRED") return NextResponse.json({ ok: false, code: message, message: message === "V120_MIGRATION_REQUIRED" ? "Executive Report cần Analytics migration V1.2.0 trước." : "Executive Report cần Dashboard migration V0.3.0 trước." } satisfies ExecutiveReportApiResponse, { status: 503 });
    return NextResponse.json({ ok: false, code: "REPORT_LOAD_FAILED", message: `Không tải được Executive Report: ${message}` } satisfies ExecutiveReportApiResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READ_ONLY", message: "Demo Mode không lưu snapshot." } satisfies ReportSnapshotMutationResponse, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ReportSnapshotMutationResponse, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Dict;
  const projectId = s(body.projectId).trim();
  const periodType = s(body.periodType) as ReportPeriodType;
  const periodStart = nullable(body.periodStart);
  const periodEnd = s(body.periodEnd).trim();
  const title = nullable(body.title);
  const pmComment = nullable(body.pmComment);
  const nextPlan = nullable(body.nextPlan);
  if (!projectId || !periodEnd || !["week","month","30d","90d","all","custom"].includes(periodType)) {
    return NextResponse.json({ ok: false, code: "INVALID_INPUT", message: "Thiếu Project hoặc kỳ báo cáo không hợp lệ." } satisfies ReportSnapshotMutationResponse, { status: 400 });
  }

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER/Admin/PM được lưu snapshot báo cáo." } satisfies ReportSnapshotMutationResponse, { status: 403 });

  const reportKey = `${periodType}:${periodStart ?? "all"}:${periodEnd}`;
  const analyticsResult = await supabase.rpc("get_project_analytics_v120", { p_project_id: projectId, p_from: periodStart, p_to: periodEnd });
  const dashboardResult = await supabase.rpc("get_project_dashboard", { p_project_id: projectId });
  if (analyticsResult.error || dashboardResult.error) {
    return NextResponse.json({ ok: false, code: "REPORT_RECALC_FAILED", message: `Không thể chụp snapshot: ${analyticsResult.error?.message || dashboardResult.error?.message || "unknown"}` } satisfies ReportSnapshotMutationResponse, { status: 500 });
  }
  const analytics = obj(analyticsResult.data);
  const dashboard = obj(dashboardResult.data);
  const summary = obj(analytics.summary);
  const health = obj(analytics.health);
  const contract = obj(dashboard.contract);
  const metrics = {
    healthScore: n(health.score), open: n(summary.open), overdue: n(summary.overdue), highPriorityOpen: n(summary.highPriorityOpen),
    handoverProgress: n(contract.handoverProgress), resolvedInRange: n(summary.resolvedInRange), createdInRange: n(summary.createdInRange),
  };

  const { data, error } = await supabase
    .from("report_snapshots")
    .upsert({
      project_id: projectId, report_key: reportKey, period_type: periodType, period_start: periodStart, period_end: periodEnd,
      title, pm_comment: pmComment, next_plan: nextPlan, snapshot: metrics, created_by: user.id,
    }, { onConflict: "project_id,report_key" })
    .select("id,report_key,period_type,period_start,period_end,title,pm_comment,next_plan,snapshot,created_by,created_at,updated_at")
    .single();

  if (error) {
    const missing = /report_snapshots|relation .* does not exist/i.test(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V130_MIGRATION_REQUIRED" : "SNAPSHOT_SAVE_FAILED", message: missing ? "Cần chạy migration 202608260003_v130_executive_reports.sql trước khi lưu snapshot." : `Không lưu được snapshot: ${error.message}` } satisfies ReportSnapshotMutationResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, snapshot: normalizeSnapshot(data as Dict) } satisfies ReportSnapshotMutationResponse);
}
