import { demoProjects } from "@/lib/projects";
import type { FinancialData, FinancialMonth } from "@/lib/finance/types";

function addMonths(date: Date, months: number) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return copy.toISOString().slice(0, 10);
}

function percentFromAmount(amount: number, contractValue: number) {
  if (contractValue <= 0) return 0;
  return Math.round((amount / contractValue) * 10000) / 100;
}

function buildMonth(projectId: string, index: number, contractValue: number, forecastAmount: number, actualAmount: number, staffCostAmount: number, otherCostAmount: number): FinancialMonth {
  const forecastPercent = percentFromAmount(forecastAmount, contractValue);
  const actualPercent = percentFromAmount(actualAmount, contractValue);
  const revenueAmount = actualAmount;
  const totalCostAmount = staffCostAmount + otherCostAmount;
  const projectedProfitAmount = revenueAmount - totalCostAmount;
  const projectedMarginPercent = revenueAmount > 0 ? Math.round((projectedProfitAmount / revenueAmount) * 1000) / 10 : 0;
  return {
    id: `demo-finance-${index}`,
    projectId,
    monthDate: addMonths(new Date(Date.UTC(2026, 8, 1)), index),
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
    notes: index === 0 ? "Tháng kickoff, ghi nhận một phần revenue theo tiến độ." : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDemoFinancialData(projectId: string): FinancialData {
  const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
  const contractValue = 520_000_000;
  const months = [
    buildMonth(project.id, 0, contractValue, 130_000_000, 94_000_000, 54_000_000, 6_000_000),
    buildMonth(project.id, 1, contractValue, 210_000_000, 176_000_000, 72_000_000, 8_000_000),
    buildMonth(project.id, 2, contractValue, 156_000_000, 62_000_000, 48_000_000, 5_000_000),
  ];
  const revenueAmount = months.reduce((sum, item) => sum + item.revenueAmount, 0);
  const staffCostAmount = months.reduce((sum, item) => sum + item.staffCostAmount, 0);
  const otherCostAmount = months.reduce((sum, item) => sum + item.otherCostAmount, 0);
  const totalCostAmount = staffCostAmount + otherCostAmount;
  const projectedProfitAmount = revenueAmount - totalCostAmount;
  return {
    source: "demo",
    role: "admin",
    canEdit: false,
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      organizationName: project.organizationName,
      contractNo: "DEMO-2026-001",
      contractValue,
      startDate: null,
      dueDate: null,
    },
    summary: {
      contractValue,
      forecastAmount: months.reduce((sum, item) => sum + item.forecastAmount, 0),
      actualAmount: months.reduce((sum, item) => sum + item.actualAmount, 0),
      revenueAmount,
      staffCostAmount,
      otherCostAmount,
      totalCostAmount,
      projectedProfitAmount,
      forecastPercent: percentFromAmount(months.reduce((sum, item) => sum + item.forecastAmount, 0), contractValue),
      actualPercent: percentFromAmount(months.reduce((sum, item) => sum + item.actualAmount, 0), contractValue),
      projectedMarginPercent: revenueAmount > 0 ? Math.round((projectedProfitAmount / revenueAmount) * 1000) / 10 : 0,
      remainingRevenueAmount: Math.max(0, contractValue - revenueAmount),
    },
    months,
    generatedAt: new Date().toISOString(),
  };
}
