import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectRole } from "@/lib/issues/types";
import type { FinancialData, FinancialMonth, FinancialSummary } from "@/lib/finance/types";

type Dict = Record<string, unknown>;

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyValue(value: unknown) {
  return Math.max(0, Math.round(numberValue(value) * 100) / 100);
}

function percentValue(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(numberValue(value) * 100) / 100));
}

function textValue(value: unknown, max = 2000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function monthDate(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
  return null;
}

function normalizeFinancialMonth(row: Dict, contractValue: number): FinancialMonth {
  const forecastPercent = percentValue(row.forecast_percent);
  const actualPercent = percentValue(row.actual_percent);
  const forecastAmount = Math.round((contractValue * forecastPercent) / 100);
  const actualAmount = Math.round((contractValue * actualPercent) / 100);
  const revenueAmount = moneyValue(row.revenue_amount);
  const staffCostAmount = moneyValue(row.staff_cost_amount);
  const otherCostAmount = moneyValue(row.other_cost_amount);
  const totalCostAmount = Math.round((staffCostAmount + otherCostAmount) * 100) / 100;
  const projectedProfitAmount = Math.round((revenueAmount - totalCostAmount) * 100) / 100;
  const projectedMarginPercent = revenueAmount > 0 ? Math.round((projectedProfitAmount / revenueAmount) * 10000) / 100 : 0;
  return {
    id: String(row.id ?? ""),
    projectId: String(row.project_id ?? ""),
    monthDate: dateOnly(row.month_date) ?? "",
    forecastPercent,
    actualPercent,
    forecastAmount,
    actualAmount,
    revenueAmount,
    staffCostAmount,
    otherCostAmount,
    totalCostAmount,
    projectedProfitAmount,
    projectedMarginPercent,
    notes: textValue(row.notes),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function buildSummary(months: FinancialMonth[], contractValue: number): FinancialSummary {
  const latestForecastPercent = [...months].reverse().find((item) => item.forecastPercent > 0)?.forecastPercent ?? 0;
  const latestActualPercent = [...months].reverse().find((item) => item.actualPercent > 0)?.actualPercent ?? 0;
  const forecastAmount = Math.round((contractValue * latestForecastPercent) / 100);
  const actualAmount = Math.round((contractValue * latestActualPercent) / 100);
  const revenueAmount = months.reduce((sum, item) => sum + item.revenueAmount, 0);
  const staffCostAmount = months.reduce((sum, item) => sum + item.staffCostAmount, 0);
  const otherCostAmount = months.reduce((sum, item) => sum + item.otherCostAmount, 0);
  const totalCostAmount = staffCostAmount + otherCostAmount;
  const projectedProfitAmount = revenueAmount - totalCostAmount;
  return {
    contractValue,
    forecastPercent: latestForecastPercent,
    actualPercent: latestActualPercent,
    forecastAmount,
    actualAmount,
    revenueAmount,
    staffCostAmount,
    otherCostAmount,
    totalCostAmount,
    projectedProfitAmount,
    projectedMarginPercent: revenueAmount > 0 ? Math.round((projectedProfitAmount / revenueAmount) * 10000) / 100 : 0,
    remainingRevenueAmount: Math.max(0, contractValue - revenueAmount),
  };
}

export function parseFinancialMonthInput(raw: unknown) {
  const body = raw && typeof raw === "object" ? raw as Dict : {};
  const parsedMonth = monthDate(body.monthDate);
  const fieldErrors: Record<string, string> = {};
  if (!parsedMonth) fieldErrors.monthDate = "Tháng tài chính không hợp lệ.";
  const forecastPercent = percentValue(body.forecastPercent);
  const actualPercent = percentValue(body.actualPercent);
  const revenueAmount = moneyValue(body.revenueAmount);
  const staffCostAmount = moneyValue(body.staffCostAmount);
  const otherCostAmount = moneyValue(body.otherCostAmount);
  return {
    id: textValue(body.id, 80),
    projectId: textValue(body.projectId, 80),
    monthDate: parsedMonth,
    forecastPercent,
    actualPercent,
    revenueAmount,
    staffCostAmount,
    otherCostAmount,
    notes: textValue(body.notes, 2000),
    fieldErrors,
  };
}

export async function loadFinancialData(supabase: SupabaseClient, projectId: string, role: ProjectRole): Promise<FinancialData> {
  const projectQuery = supabase.from("projects").select("id,code,name,organization_name,contract_no,contract_value,start_date,due_date").eq("id", projectId).maybeSingle();
  const [projectResult, monthsResult] = await Promise.all([
    projectQuery,
    supabase.from("project_financial_months").select("id,project_id,month_date,forecast_percent,actual_percent,revenue_amount,staff_cost_amount,other_cost_amount,notes,created_at,updated_at").eq("project_id", projectId).order("month_date", { ascending: true }),
  ]);
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (monthsResult.error) throw new Error(monthsResult.error.message);
  if (!projectResult.data) throw new Error("Project không tồn tại hoặc bạn không có quyền truy cập.");

  const projectRow = projectResult.data as Dict;
  const contractValue = moneyValue(projectRow.contract_value);
  const months = ((monthsResult.data ?? []) as unknown as Dict[]).map((row) => normalizeFinancialMonth(row, contractValue));
  return {
    source: "database",
    role,
    canEdit: role === "admin" || role === "pm",
    project: {
      id: String(projectRow.id ?? ""),
      code: String(projectRow.code ?? ""),
      name: String(projectRow.name ?? ""),
      organizationName: textValue(projectRow.organization_name, 180),
      contractNo: textValue(projectRow.contract_no, 120),
      contractValue,
      startDate: dateOnly(projectRow.start_date),
      dueDate: dateOnly(projectRow.due_date),
    },
    summary: buildSummary(months, contractValue),
    months,
    generatedAt: new Date().toISOString(),
  };
}

export async function upsertFinancialMonth(supabase: SupabaseClient, projectId: string, input: ReturnType<typeof parseFinancialMonthInput>, contractValue: number) {
  if (!input.monthDate) throw new Error("Tháng tài chính không hợp lệ.");
  const payload = {
    project_id: projectId,
    month_date: input.monthDate,
    forecast_percent: input.forecastPercent,
    actual_percent: input.actualPercent,
    revenue_amount: input.revenueAmount,
    staff_cost_amount: input.staffCostAmount,
    other_cost_amount: input.otherCostAmount,
    notes: input.notes,
  };
  const select = "id,project_id,month_date,forecast_percent,actual_percent,revenue_amount,staff_cost_amount,other_cost_amount,notes,created_at,updated_at";
  const query = input.id
    ? supabase.from("project_financial_months").update(payload).eq("id", input.id).eq("project_id", projectId).select(select).single()
    : supabase.from("project_financial_months").upsert(payload, { onConflict: "project_id,month_date" }).select(select).single();
  const { data, error } = await query;
  if (error || !data) throw new Error(error?.message ?? "Không lưu được dữ liệu tài chính.");
  return normalizeFinancialMonth(data as Dict, contractValue);
}
