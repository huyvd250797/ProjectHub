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
  const taskSummary = object(raw.taskSummary);
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
    taskSummary: {
      total: n(taskSummary.total), todo: n(taskSummary.todo), doing: n(taskSummary.doing), blocked: n(taskSummary.blocked), done: n(taskSummary.done),
      overdue: n(taskSummary.overdue), unassigned: n(taskSummary.unassigned), highPriorityOpen: n(taskSummary.highPriorityOpen),
      totalEstimatedHours: n(taskSummary.totalEstimatedHours), remainingEstimatedHours: n(taskSummary.remainingEstimatedHours),
      estimateCoverage: n(taskSummary.estimateCoverage), completionRate: n(taskSummary.completionRate),
    },
    taskStatusDistribution: normalizeBreakdown(raw.taskStatusDistribution),
    taskPriorityDistribution: normalizeBreakdown(raw.taskPriorityDistribution),
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

function taskBreakdown(rows: Array<Record<string, unknown>>, key: "status" | "priority", labels: Record<string, string>) {
  const total = rows.length;
  return Object.entries(labels).map(([code, label]) => {
    const value = rows.filter((row) => row[key] === code).length;
    return { code, label, value, percent: total ? Math.round((value / total) * 100) : 0 };
  });
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

  const analytics = normalize(data as Record<string, unknown>);
  const taskResult = await supabase
    .from("project_plan_tasks")
    .select("status,priority,due_date,estimated_hours,owner_person_id")
    .eq("project_id", projectId);
  if (taskResult.error) {
    return NextResponse.json({ ok: false, code: "TASK_ANALYTICS_QUERY_FAILED", message: `Không tải được thống kê Task: ${taskResult.error.message}` } satisfies ProjectAnalyticsApiResponse, { status: 500 });
  }

  const tasks = (taskResult.data ?? []) as Array<Record<string, unknown>>;
  const today = new Date().toISOString().slice(0, 10);
  const countStatus = (status: string) => tasks.filter((task) => task.status === status).length;
  const hours = (rows: Array<Record<string, unknown>>) => Math.round(rows.reduce((sum, task) => sum + n(task.estimated_hours), 0) * 100) / 100;
  const estimated = tasks.filter((task) => task.estimated_hours !== null && task.estimated_hours !== undefined);
  analytics.taskSummary = {
    total: tasks.length,
    todo: countStatus("todo"),
    doing: countStatus("doing"),
    blocked: countStatus("blocked"),
    done: countStatus("done"),
    overdue: tasks.filter((task) => task.status !== "done" && Boolean(task.due_date) && String(task.due_date).slice(0, 10) < today).length,
    unassigned: tasks.filter((task) => !task.owner_person_id).length,
    highPriorityOpen: tasks.filter((task) => task.status !== "done" && (task.priority === "high" || task.priority === "critical")).length,
    totalEstimatedHours: hours(tasks),
    remainingEstimatedHours: hours(tasks.filter((task) => task.status !== "done")),
    estimateCoverage: tasks.length ? Math.round((estimated.length / tasks.length) * 100) : 0,
    completionRate: tasks.length ? Math.round((countStatus("done") / tasks.length) * 100) : 0,
  };
  analytics.taskStatusDistribution = taskBreakdown(tasks, "status", { todo: "Chưa làm", doing: "Đang làm", blocked: "Bị chặn", done: "Hoàn tất" });
  analytics.taskPriorityDistribution = taskBreakdown(tasks, "priority", { critical: "Khẩn cấp", high: "Cao", medium: "Trung bình", low: "Thấp" });

  return NextResponse.json({ ok: true, data: analytics } satisfies ProjectAnalyticsApiResponse);
}
