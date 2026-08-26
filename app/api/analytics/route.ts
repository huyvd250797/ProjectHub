import { NextRequest, NextResponse } from "next/server";
import { createDemoAnalytics } from "@/lib/analytics/demo";
import type { AnalyticsBreakdown, AnalyticsMemberRow, AnalyticsRiskRow, AnalyticsTrendPoint, ProjectAnalyticsApiResponse, ProjectAnalyticsData } from "@/lib/analytics-types";
import { demoProjects } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function s(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function nullable(value: unknown) { return value === null || value === undefined || value === "" ? null : String(value); }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function normalizeBreakdown(value: unknown): AnalyticsBreakdown[] {
  return array(value).map((item) => {
    const row = object(item);
    return { code: s(row.code), label: s(row.label || row.code), value: n(row.value), percent: n(row.percent) };
  });
}
function normalizeRisk(value: unknown): AnalyticsRiskRow[] {
  return array(value).map((item) => {
    const row = object(item);
    return { id: s(row.id), name: s(row.name), total: n(row.total), open: n(row.open), overdue: n(row.overdue), highPriority: n(row.highPriority), progress: n(row.progress), riskScore: n(row.riskScore) };
  });
}
function normalizeMembers(value: unknown): AnalyticsMemberRow[] {
  return array(value).map((item) => ({ ...normalizeRisk([item])[0], email: nullable(object(item).email) }));
}
function normalizeTrend(value: unknown): AnalyticsTrendPoint[] {
  return array(value).map((item) => {
    const row = object(item);
    return { period: s(row.period), label: s(row.label), created: n(row.created), resolved: n(row.resolved) };
  });
}

function normalize(raw: Record<string, unknown>): ProjectAnalyticsData {
  const range = object(raw.range);
  const health = object(raw.health);
  const summary = object(raw.summary);
  const attention = object(raw.attention);
  return {
    source: "database",
    generatedAt: s(raw.generatedAt || new Date().toISOString()),
    projectId: s(raw.projectId),
    projectCode: s(raw.projectCode),
    range: { from: nullable(range.from), to: s(range.to), days: range.days === null || range.days === undefined ? null : n(range.days) },
    health: {
      score: n(health.score),
      status: (health.status || "no_data") as ProjectAnalyticsData["health"]["status"],
      issueScore: n(health.issueScore), deliveryScore: n(health.deliveryScore), overdueScore: n(health.overdueScore),
      dataQualityScore: n(health.dataQualityScore), scheduleScore: n(health.scheduleScore),
    },
    summary: {
      total: n(summary.total), open: n(summary.open), resolved: n(summary.resolved), released: n(summary.released), handedOver: n(summary.handedOver),
      overdue: n(summary.overdue), highPriorityOpen: n(summary.highPriorityOpen), createdInRange: n(summary.createdInRange), resolvedInRange: n(summary.resolvedInRange),
      avgAgeDays: n(summary.avgAgeDays), avgResolutionDays: n(summary.avgResolutionDays),
    },
    backlogAging: array(raw.backlogAging).map((item) => { const row = object(item); return { code: s(row.code), label: s(row.label), value: n(row.value), percent: n(row.percent) }; }),
    statusDistribution: normalizeBreakdown(raw.statusDistribution),
    priorityDistribution: normalizeBreakdown(raw.priorityDistribution),
    trend: normalizeTrend(raw.trend),
    topModules: normalizeRisk(raw.topModules),
    topDepartments: normalizeRisk(raw.topDepartments),
    members: normalizeMembers(raw.members),
    attention: { missingModule: n(attention.missingModule), missingDepartment: n(attention.missingDepartment), missingAssignee: n(attention.missingAssignee), nearDue: n(attention.nearDue) },
  };
}

function rangeStart(range: string | null) {
  if (range === "all") return null;
  const days = [30,90,180,365].includes(Number(range)) ? Number(range) : 90;
  const date = new Date();
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0,10);
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Analytics." } satisfies ProjectAnalyticsApiResponse, { status: 400 });
  const range = request.nextUrl.searchParams.get("range")?.trim() || "90";
  const from = rangeStart(range);
  const to = new Date().toISOString().slice(0,10);

  const supabase = await createClient();
  if (!supabase) {
    const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
    return NextResponse.json({ ok: true, data: createDemoAnalytics(projectId, project.code) } satisfies ProjectAnalyticsApiResponse);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ProjectAnalyticsApiResponse, { status: 401 });

  const { data, error } = await supabase.rpc("get_project_analytics_v120", { p_project_id: projectId, p_from: from, p_to: to });
  if (error) {
    const missing = /get_project_analytics_v120|function .* does not exist/i.test(error.message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V120_MIGRATION_REQUIRED" : "ANALYTICS_QUERY_FAILED",
      message: missing ? "Advanced Analytics cần chạy migration 202608260002_v120_analytics_health.sql trên Supabase." : `Không tải được Analytics: ${error.message}`,
    } satisfies ProjectAnalyticsApiResponse, { status: missing ? 503 : 500 });
  }
  if (!data || typeof data !== "object") return NextResponse.json({ ok: false, code: "PROJECT_NOT_FOUND", message: "Không tìm thấy dữ liệu project hoặc tài khoản không có quyền." } satisfies ProjectAnalyticsApiResponse, { status: 404 });
  return NextResponse.json({ ok: true, data: normalize(data as Record<string, unknown>) } satisfies ProjectAnalyticsApiResponse);
}
