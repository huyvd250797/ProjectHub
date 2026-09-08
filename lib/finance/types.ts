export type FinancialSource = "database" | "demo";

export type FinancialProject = {
  id: string;
  code: string;
  name: string;
  organizationName: string | null;
  contractNo: string | null;
  contractValue: number;
  startDate: string | null;
  dueDate: string | null;
};

export type FinancialMonth = {
  id: string;
  projectId: string;
  monthDate: string;
  forecastPercent: number;
  actualPercent: number;
  forecastAmount: number;
  actualAmount: number;
  revenueAmount: number;
  staffCostAmount: number;
  otherCostAmount: number;
  totalCostAmount: number;
  projectedProfitAmount: number;
  projectedMarginPercent: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialSummary = {
  contractValue: number;
  forecastPercent: number;
  actualPercent: number;
  forecastAmount: number;
  actualAmount: number;
  revenueAmount: number;
  staffCostAmount: number;
  otherCostAmount: number;
  totalCostAmount: number;
  projectedProfitAmount: number;
  projectedMarginPercent: number;
  remainingRevenueAmount: number;
};

export type FinancialData = {
  source: FinancialSource;
  role: "admin" | "pm" | "member" | "viewer";
  canEdit: boolean;
  project: FinancialProject;
  summary: FinancialSummary;
  months: FinancialMonth[];
  generatedAt: string;
};

export type FinancialApiResponse =
  | { ok: true; data: FinancialData }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type FinancialMutationResponse =
  | { ok: true; month: FinancialMonth; message: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type FinancialDeleteResponse =
  | { ok: true; deletedId: string; message: string }
  | { ok: false; code: string; message: string };
