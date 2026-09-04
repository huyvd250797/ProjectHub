import { NextRequest, NextResponse } from "next/server";
import { createDemoContract } from "@/lib/contract/demo";
import type {
  ContractApiResponse,
  ContractData,
  ContractDetailItem,
  ContractOverviewItem,
} from "@/lib/contract/types";
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

function normalizeContract(raw: Record<string, unknown>, projectId: string): ContractData {
  const summary = (raw.summary ?? {}) as Record<string, unknown>;
  const overviewRows = Array.isArray(raw.overview) ? raw.overview : [];
  const detailRows = Array.isArray(raw.details) ? raw.details : [];
  const filters = (raw.filters ?? {}) as Record<string, unknown>;
  const departments = Array.isArray(filters.departments) ? filters.departments : [];
  const moduleStatuses = Array.isArray(filters.moduleStatuses) ? filters.moduleStatuses : [];

  return {
    source: "database",
    generatedAt: new Date().toISOString(),
    projectId,
    summary: {
      items: numberValue(summary.items),
      modules: numberValue(summary.modules),
      subsystems: numberValue(summary.subsystems),
      details: numberValue(summary.details),
      issues: numberValue(summary.issues),
      handedOver: numberValue(summary.handedOver),
      remaining: numberValue(summary.remaining),
      handoverProgress: numberValue(summary.handoverProgress),
      unmappedDetails: numberValue(summary.unmappedDetails),
    },
    overview: overviewRows.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        parentId: textOrNull(row.parentId),
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        itemType: (row.itemType ?? "other") as ContractOverviewItem["itemType"],
        ownerDepartmentId: textOrNull(row.ownerDepartmentId),
        ownerDepartmentName: textOrNull(row.ownerDepartmentName),
        moduleStatusCode: textOrNull(row.moduleStatusCode),
        moduleStatusLabel: textOrNull(row.moduleStatusLabel),
        classification: textOrNull(row.classification),
        sortOrder: numberValue(row.sortOrder),
        issueTotal: numberValue(row.issueTotal),
        handedOver: numberValue(row.handedOver),
        remaining: numberValue(row.remaining),
        progress: numberValue(row.progress),
        detailCount: numberValue(row.detailCount),
      } satisfies ContractOverviewItem;
    }).filter((item) => item.itemType === "root" || item.itemType === "subsystem" || item.itemType === "module"),
    details: detailRows.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        parentId: textOrNull(row.parentId),
        contractItemId: textOrNull(row.contractItemId),
        code: String(row.code ?? ""),
        content: String(row.content ?? ""),
        nodeType: textOrNull(row.nodeType),
        level: numberValue(row.level),
        sortOrder: numberValue(row.sortOrder),
        note: textOrNull(row.note),
        hasChildren: Boolean(row.hasChildren),
      } satisfies ContractDetailItem;
    }),
    filters: {
      departments: departments.map((item) => {
        const row = item as Record<string, unknown>;
        return { value: String(row.value ?? ""), label: String(row.label ?? "") };
      }),
      moduleStatuses: moduleStatuses.map((item) => {
        const row = item as Record<string, unknown>;
        return { value: String(row.value ?? ""), label: String(row.label ?? "") };
      }),
    },
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) {
    const body: ContractApiResponse = {
      ok: false,
      code: "PROJECT_REQUIRED",
      message: "Thiếu projectId cho PLHĐ.",
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    const body: ContractApiResponse = { ok: true, data: createDemoContract(projectId) };
    return NextResponse.json(body);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const body: ContractApiResponse = {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Phiên đăng nhập đã hết hạn.",
    };
    return NextResponse.json(body, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_project_contract", {
    p_project_id: projectId,
  });

  if (error) {
    const migrationMissing = /get_project_contract|function .* does not exist/i.test(error.message);
    const body: ContractApiResponse = {
      ok: false,
      code: migrationMissing ? "V040_MIGRATION_REQUIRED" : "CONTRACT_QUERY_FAILED",
      message: migrationMissing
        ? "PLHĐ V0.4.0 cần chạy migration 202608220003_v040_contract_rpc.sql trên Supabase."
        : `Không tải được PLHĐ: ${error.message}`,
    };
    return NextResponse.json(body, { status: migrationMissing ? 503 : 500 });
  }

  if (!data || typeof data !== "object") {
    const body: ContractApiResponse = {
      ok: false,
      code: "PROJECT_NOT_FOUND",
      message: "Không tìm thấy dữ liệu PLHĐ hoặc tài khoản không có quyền truy cập project.",
    };
    return NextResponse.json(body, { status: 404 });
  }

  const body: ContractApiResponse = {
    ok: true,
    data: normalizeContract(data as Record<string, unknown>, projectId),
  };
  return NextResponse.json(body);
}
