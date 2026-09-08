import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoFinancialData } from "@/lib/finance/demo";
import { loadFinancialData, parseFinancialMonthInput, upsertFinancialMonth } from "@/lib/finance/server";
import type { FinancialApiResponse, FinancialDeleteResponse, FinancialMutationResponse } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function financeMigrationMissing(message: string) {
  return /project_financial_months|forecast_percent|actual_percent|staff_cost_amount|other_cost_amount|schema cache|relation .* does not exist/i.test(message);
}

async function getProjectContractValue(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, projectId: string) {
  const { data, error } = await supabase.from("projects").select("contract_value").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  const parsed = Number(data?.contract_value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho Project Financial Control." } satisfies FinancialApiResponse, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoFinancialData(projectId) } satisfies FinancialApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies FinancialApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies FinancialApiResponse, { status: 403 });

  try {
    const data = await loadFinancialData(supabase, projectId, role);
    return NextResponse.json({ ok: true, data } satisfies FinancialApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được Project Financial Control.";
    const missing = financeMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V310_MIGRATION_REQUIRED" : "FINANCE_QUERY_FAILED",
      message: missing ? "Hãy chạy migration V3.1.0 Project Financial Control trước khi dùng module tài chính." : message,
    } satisfies FinancialApiResponse, { status: missing ? 503 : 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu tài chính." } satisfies FinancialMutationResponse, { status: 409 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies FinancialMutationResponse, { status: 401 });

  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const input = parseFinancialMonthInput(raw);
  const projectId = input.projectId;
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId.", fieldErrors: { projectId: "Thiếu Project." } } satisfies FinancialMutationResponse, { status: 400 });
  if (Object.keys(input.fieldErrors).length) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Dữ liệu tài chính chưa hợp lệ.", fieldErrors: input.fieldErrors } satisfies FinancialMutationResponse, { status: 400 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ Admin hoặc PM được cập nhật tài chính dự án." } satisfies FinancialMutationResponse, { status: 403 });

  try {
    const contractValue = await getProjectContractValue(supabase, projectId);
    const month = await upsertFinancialMonth(supabase, projectId, input, contractValue);
    return NextResponse.json({ ok: true, month, message: "Đã lưu dữ liệu tài chính tháng." } satisfies FinancialMutationResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được dữ liệu tài chính.";
    const missing = financeMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V310_MIGRATION_REQUIRED" : "FINANCE_SAVE_FAILED",
      message: missing ? "Hãy chạy migration V3.1.0 trước khi lưu dữ liệu tài chính." : message,
    } satisfies FinancialMutationResponse, { status: missing ? 503 : 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không xóa dữ liệu tài chính." } satisfies FinancialDeleteResponse, { status: 409 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies FinancialDeleteResponse, { status: 401 });

  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const projectId = text(body.projectId);
  const id = text(body.id);
  if (!projectId || !id) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Thiếu projectId hoặc dòng tài chính cần xóa." } satisfies FinancialDeleteResponse, { status: 400 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ Admin hoặc PM được xóa dữ liệu tài chính." } satisfies FinancialDeleteResponse, { status: 403 });

  const { error } = await supabase.from("project_financial_months").delete().eq("id", id).eq("project_id", projectId);
  if (error) {
    const missing = financeMigrationMissing(error.message);
    return NextResponse.json({
      ok: false,
      code: missing ? "V310_MIGRATION_REQUIRED" : "FINANCE_DELETE_FAILED",
      message: missing ? "Hãy chạy migration V3.1.0 trước khi xóa dữ liệu tài chính." : error.message,
    } satisfies FinancialDeleteResponse, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ ok: true, deletedId: id, message: "Đã xóa dữ liệu tài chính tháng." } satisfies FinancialDeleteResponse);
}
