import { NextRequest, NextResponse } from "next/server";
import { createDemoDepartments } from "@/lib/departments/demo";
import type {
  DepartmentAttentionIssue,
  DepartmentContact,
  DepartmentModule,
  DepartmentRow,
  DepartmentsApiResponse,
  DepartmentsData,
} from "@/lib/departments/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function normalizeDepartments(raw: Record<string, unknown>, projectId: string): DepartmentsData {
  const summary = (raw.summary ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(raw.departments) ? raw.departments : [];

  return {
    source: "database",
    generatedAt: new Date().toISOString(),
    projectId,
    summary: {
      departments: numberValue(summary.departments),
      totalIssues: numberValue(summary.totalIssues),
      linkedIssues: numberValue(summary.linkedIssues),
      unassignedIssues: numberValue(summary.unassignedIssues),
      handedOver: numberValue(summary.handedOver),
      overdue: numberValue(summary.overdue),
      contacts: numberValue(summary.contacts),
      modules: numberValue(summary.modules),
    },
    departments: rows.map((item) => {
      const row = item as Record<string, unknown>;
      const contacts = Array.isArray(row.contacts) ? row.contacts : [];
      const modules = Array.isArray(row.modules) ? row.modules : [];
      const attentionIssues = Array.isArray(row.attentionIssues) ? row.attentionIssues : [];

      return {
        id: String(row.id ?? ""),
        code: textOrNull(row.code),
        name: String(row.name ?? ""),
        isUnassigned: Boolean(row.isUnassigned),
        isActive: row.isActive === undefined ? true : Boolean(row.isActive),
        total: numberValue(row.total),
        resolved: numberValue(row.resolved),
        released: numberValue(row.released),
        handedOver: numberValue(row.handedOver),
        notHandedOver: numberValue(row.notHandedOver),
        overdue: numberValue(row.overdue),
        nearDue: numberValue(row.nearDue),
        missingAssignee: numberValue(row.missingAssignee),
        handoverProgress: numberValue(row.handoverProgress),
        contacts: contacts.map((contact) => {
          const value = contact as Record<string, unknown>;
          return {
            id: String(value.id ?? ""),
            fullName: String(value.fullName ?? ""),
            title: textOrNull(value.title),
            email: textOrNull(value.email),
            zalo: textOrNull(value.zalo),
          } satisfies DepartmentContact;
        }),
        modules: modules.map((module) => {
          const value = module as Record<string, unknown>;
          return {
            id: String(value.id ?? ""),
            code: textOrNull(value.code),
            name: String(value.name ?? ""),
            statusCode: textOrNull(value.statusCode),
          } satisfies DepartmentModule;
        }),
        attentionIssues: attentionIssues.map((issue) => {
          const value = issue as Record<string, unknown>;
          return {
            id: String(value.id ?? ""),
            content: String(value.content ?? ""),
            statusCode: textOrNull(value.statusCode),
            dueDate: textOrNull(value.dueDate),
            moduleName: textOrNull(value.moduleName),
            assigneeName: textOrNull(value.assigneeName),
            isOverdue: Boolean(value.isOverdue),
            isNearDue: Boolean(value.isNearDue),
          } satisfies DepartmentAttentionIssue;
        }),
      } satisfies DepartmentRow;
    }),
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    const body: DepartmentsApiResponse = {
      ok: false,
      code: "PROJECT_REQUIRED",
      message: "Thiếu projectId cho màn hình Phòng ban.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    const body: DepartmentsApiResponse = { ok: true, data: createDemoDepartments(projectId) };
    return NextResponse.json(body);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const body: DepartmentsApiResponse = {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Phiên đăng nhập đã hết hạn.",
    };
    return NextResponse.json(body, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_project_departments", {
    p_project_id: projectId,
  });

  if (error) {
    const migrationMissing = /get_project_departments|function .* does not exist/i.test(error.message);
    const body: DepartmentsApiResponse = {
      ok: false,
      code: migrationMissing ? "V050_MIGRATION_REQUIRED" : "DEPARTMENT_QUERY_FAILED",
      message: migrationMissing
        ? "Phòng ban V0.5.0 cần chạy migration 202608220004_v050_department_rpc.sql trên Supabase."
        : `Không tải được dữ liệu phòng ban: ${error.message}`,
    };
    return NextResponse.json(body, { status: migrationMissing ? 503 : 500 });
  }

  if (!data || typeof data !== "object") {
    const body: DepartmentsApiResponse = {
      ok: false,
      code: "PROJECT_NOT_FOUND",
      message: "Không tìm thấy dữ liệu phòng ban hoặc tài khoản không có quyền truy cập project.",
    };
    return NextResponse.json(body, { status: 404 });
  }

  const body: DepartmentsApiResponse = {
    ok: true,
    data: normalizeDepartments(data as Record<string, unknown>, projectId),
  };
  return NextResponse.json(body);
}
