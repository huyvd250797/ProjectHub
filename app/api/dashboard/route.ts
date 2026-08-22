import { NextRequest, NextResponse } from "next/server";
import { createDemoDashboard } from "@/lib/dashboard/demo";
import type { DashboardApiResponse, DashboardData } from "@/lib/dashboard/types";
import { demoProjects } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDashboard(raw: Record<string, unknown>): DashboardData {
  const project = (raw.project ?? {}) as Record<string, unknown>;
  const summary = (raw.summary ?? {}) as Record<string, unknown>;
  const issueKpis = (raw.issueKpis ?? {}) as Record<string, unknown>;
  const attention = (raw.attention ?? {}) as Record<string, unknown>;
  const contract = (raw.contract ?? {}) as Record<string, unknown>;
  const schedule = (raw.schedule ?? {}) as Record<string, unknown>;

  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  const departments = Array.isArray(raw.departments) ? raw.departments : [];
  const members = Array.isArray(raw.members) ? raw.members : [];

  return {
    source: "database",
    generatedAt: new Date().toISOString(),
    project: {
      id: String(project.id ?? ""),
      code: String(project.code ?? ""),
      slug: String(project.slug ?? ""),
      name: String(project.name ?? ""),
      organizationName: String(project.organizationName ?? ""),
      contractNo: project.contractNo ? String(project.contractNo) : null,
      contractValue: project.contractValue === null || project.contractValue === undefined ? null : numberValue(project.contractValue),
      contractDate: project.contractDate ? String(project.contractDate) : null,
      startDate: project.startDate ? String(project.startDate) : null,
      dueDate: project.dueDate ? String(project.dueDate) : null,
      status: (project.status ?? "active") as DashboardData["project"]["status"],
    },
    summary: {
      totalIssues: numberValue(summary.totalIssues),
      modules: numberValue(summary.modules),
      subsystems: numberValue(summary.subsystems),
      departments: numberValue(summary.departments),
      contractDetails: numberValue(summary.contractDetails),
    },
    issueKpis: {
      waitingCustomer: numberValue(issueKpis.waitingCustomer),
      waiting: numberValue(issueKpis.waiting),
      processing: numberValue(issueKpis.processing),
      resolved: numberValue(issueKpis.resolved),
      released: numberValue(issueKpis.released),
      handedOver: numberValue(issueKpis.handedOver),
      notHandedOver: numberValue(issueKpis.notHandedOver),
      overdue: numberValue(issueKpis.overdue),
    },
    attention: {
      overdue: numberValue(attention.overdue),
      missingAssignee: numberValue(attention.missingAssignee),
      missingModule: numberValue(attention.missingModule),
      missingDepartment: numberValue(attention.missingDepartment),
      nearDue: numberValue(attention.nearDue),
    },
    contract: {
      handoverProgress: numberValue(contract.handoverProgress),
      handedOver: numberValue(contract.handedOver),
      remaining: numberValue(contract.remaining),
    },
    schedule: {
      durationDays: schedule.durationDays === null || schedule.durationDays === undefined ? null : numberValue(schedule.durationDays),
      elapsedDays: schedule.elapsedDays === null || schedule.elapsedDays === undefined ? null : numberValue(schedule.elapsedDays),
      remainingDays: schedule.remainingDays === null || schedule.remainingDays === undefined ? null : numberValue(schedule.remainingDays),
      timeProgress: schedule.timeProgress === null || schedule.timeProgress === undefined ? null : numberValue(schedule.timeProgress),
      health: (schedule.health ?? "not_scheduled") as DashboardData["schedule"]["health"],
    },
    stages: stages.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        startDate: row.startDate ? String(row.startDate) : null,
        endDate: row.endDate ? String(row.endDate) : null,
        status: row.status ? String(row.status) : null,
        progress: numberValue(row.progress),
      };
    }),
    departments: departments.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        total: numberValue(row.total),
        done: numberValue(row.done),
        handedOver: numberValue(row.handedOver),
        remaining: numberValue(row.remaining),
        progress: numberValue(row.progress),
      };
    }),
    members: members.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        assigned: numberValue(row.assigned),
        completed: numberValue(row.completed),
        remaining: numberValue(row.remaining),
        progress: numberValue(row.progress),
      };
    }),
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    const body: DashboardApiResponse = {
      ok: false,
      code: "PROJECT_REQUIRED",
      message: "Thiếu projectId cho Dashboard.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
    const body: DashboardApiResponse = { ok: true, data: createDemoDashboard(project) };
    return NextResponse.json(body);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const body: DashboardApiResponse = {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Phiên đăng nhập đã hết hạn.",
    };
    return NextResponse.json(body, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_project_dashboard", {
    p_project_id: projectId,
  });

  if (error) {
    const migrationMissing = /get_project_dashboard|function .* does not exist/i.test(error.message);
    const body: DashboardApiResponse = {
      ok: false,
      code: migrationMissing ? "V030_MIGRATION_REQUIRED" : "DASHBOARD_QUERY_FAILED",
      message: migrationMissing
        ? "Dashboard V0.3.0 cần chạy migration 202608220002_v030_dashboard_rpc.sql trên Supabase."
        : `Không tải được Dashboard: ${error.message}`,
    };
    return NextResponse.json(body, { status: migrationMissing ? 503 : 500 });
  }

  if (!data || typeof data !== "object") {
    const body: DashboardApiResponse = {
      ok: false,
      code: "PROJECT_NOT_FOUND",
      message: "Không tìm thấy dữ liệu dự án hoặc tài khoản không có quyền truy cập.",
    };
    return NextResponse.json(body, { status: 404 });
  }

  const body: DashboardApiResponse = {
    ok: true,
    data: normalizeDashboard(data as Record<string, unknown>),
  };
  return NextResponse.json(body);
}
