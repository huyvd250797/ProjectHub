"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import type { FinancialApiResponse, FinancialData, FinancialDeleteResponse, FinancialMonth, FinancialMutationResponse } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type FinanceForm = {
  id: string | null;
  monthDate: string;
  forecastPercent: string;
  actualPercent: string;
  revenueAmount: string;
  staffCostAmount: string;
  otherCostAmount: string;
  notes: string;
};

const emptyForm: FinanceForm = {
  id: null,
  monthDate: new Date().toISOString().slice(0, 7),
  forecastPercent: "0",
  actualPercent: "0",
  revenueAmount: "0",
  staffCostAmount: "0",
  otherCostAmount: "0",
  notes: "",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function money(value: number) {
  return `${currencyFormatter.format(Math.round(value))} đ`;
}

function percent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function monthLabel(value: string) {
  if (!value) return "-";
  const [year, month] = value.slice(0, 7).split("-");
  return month && year ? `${month}/${year}` : value;
}

function numberInput(value: string) {
  const parsed = Number(String(value).replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formFromMonth(month: FinancialMonth): FinanceForm {
  return {
    id: month.id,
    monthDate: month.monthDate.slice(0, 7),
    forecastPercent: String(month.forecastPercent),
    actualPercent: String(month.actualPercent),
    revenueAmount: String(month.revenueAmount),
    staffCostAmount: String(month.staffCostAmount),
    otherCostAmount: String(month.otherCostAmount),
    notes: month.notes ?? "",
  };
}

function SummaryCard({ label, value, note, icon: Icon, tone = "cyan" }: { label: string; value: string; note: string; icon: LucideIcon; tone?: "cyan" | "emerald" | "amber" | "rose" | "violet" }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
    amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
    rose: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
    violet: "border-violet-300/15 bg-violet-300/[0.055] text-violet-200",
  } as const;
  return (
    <div className="tech-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div>
          <div className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
          <div className="mt-2 text-[10px] leading-4 text-slate-600">{note}</div>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border", tones[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function FinancialMonthModal({
  projectContractValue,
  initial,
  saving,
  error,
  onClose,
  onSave,
}: {
  projectContractValue: number;
  initial: FinanceForm;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: FinanceForm) => void;
}) {
  const [form, setForm] = useState(initial);
  const forecastAmount = Math.round((projectContractValue * numberInput(form.forecastPercent)) / 100);
  const actualAmount = Math.round((projectContractValue * numberInput(form.actualPercent)) / 100);
  const revenueAmount = numberInput(form.revenueAmount);
  const totalCost = numberInput(form.staffCostAmount) + numberInput(form.otherCostAmount);
  const profit = revenueAmount - totalCost;
  const margin = revenueAmount > 0 ? Math.round((profit / revenueAmount) * 10000) / 100 : 0;

  return (
    <div className="fixed inset-0 z-[260] grid place-items-center p-3 md:p-6" role="dialog" aria-modal="true" data-modal-lock="true">
      <button type="button" aria-label="Đóng modal" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
        className="tech-panel relative z-10 flex max-h-[92dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border-cyan-300/15 shadow-[0_30px_100px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">Monthly Financial Control</div>
            <div className="mt-1 text-base font-semibold text-white">{form.id ? "Cập nhật tháng tài chính" : "Thêm tháng tài chính"}</div>
            <div className="mt-1 text-xs text-slate-600">Forecast, actual, revenue, chi phí nhân sự và lợi nhuận dự kiến.</div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-slate-500 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Tháng</span>
              <input type="month" value={form.monthDate} onChange={(event) => setForm((value) => ({ ...value, monthDate: event.target.value }))} className="field mt-2" required />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Forecast %</span>
              <input type="number" min="0" max="100" step="0.01" value={form.forecastPercent} onChange={(event) => setForm((value) => ({ ...value, forecastPercent: event.target.value }))} className="field mt-2" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Actual %</span>
              <input type="number" min="0" max="100" step="0.01" value={form.actualPercent} onChange={(event) => setForm((value) => ({ ...value, actualPercent: event.target.value }))} className="field mt-2" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Revenue</span>
              <input type="number" min="0" step="1000" value={form.revenueAmount} onChange={(event) => setForm((value) => ({ ...value, revenueAmount: event.target.value }))} className="field mt-2" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Chi phí nhân sự</span>
              <input type="number" min="0" step="1000" value={form.staffCostAmount} onChange={(event) => setForm((value) => ({ ...value, staffCostAmount: event.target.value }))} className="field mt-2" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Chi phí khác</span>
              <input type="number" min="0" step="1000" value={form.otherCostAmount} onChange={(event) => setForm((value) => ({ ...value, otherCostAmount: event.target.value }))} className="field mt-2" />
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="text-[9px] uppercase tracking-[0.16em] text-slate-700">Forecast Amount</div><div className="mt-2 text-sm font-semibold text-cyan-200">{money(forecastAmount)}</div></div>
            <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="text-[9px] uppercase tracking-[0.16em] text-slate-700">Actual Amount</div><div className="mt-2 text-sm font-semibold text-emerald-200">{money(actualAmount)}</div></div>
            <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="text-[9px] uppercase tracking-[0.16em] text-slate-700">Profit</div><div className={cn("mt-2 text-sm font-semibold", profit >= 0 ? "text-emerald-200" : "text-rose-200")}>{money(profit)}</div></div>
            <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="text-[9px] uppercase tracking-[0.16em] text-slate-700">Margin</div><div className={cn("mt-2 text-sm font-semibold", margin >= 0 ? "text-emerald-200" : "text-rose-200")}>{percent(margin)}</div></div>
          </div>

          <label className="mt-5 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Ghi chú</span>
            <textarea value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} rows={4} className="field mt-2 h-auto py-3" placeholder="Ghi chú forecast, nghiệm thu, doanh thu hoặc chi phí..." />
          </label>
          {error ? <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="secure-btn">Hủy</button>
          <button type="submit" disabled={saving || !form.monthDate} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.12] px-4 text-xs font-semibold text-cyan-100 disabled:opacity-40">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu tháng
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProjectFinancialControl() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [editor, setEditor] = useState<FinanceForm | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/finance?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store", signal: controller.signal });
        const body = (await response.json()) as FinancialApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được Project Financial Control.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedProject.id, reloadKey]);

  const maxRevenue = useMemo(() => Math.max(1, ...(data?.months.map((item) => Math.max(item.forecastAmount, item.revenueAmount)) ?? [1])), [data?.months]);

  async function saveMonth(form: FinanceForm) {
    setSaving(true);
    setModalError("");
    try {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          projectId: selectedProject.id,
          monthDate: form.monthDate,
          forecastPercent: numberInput(form.forecastPercent),
          actualPercent: numberInput(form.actualPercent),
          revenueAmount: numberInput(form.revenueAmount),
          staffCostAmount: numberInput(form.staffCostAmount),
          otherCostAmount: numberInput(form.otherCostAmount),
          notes: form.notes,
        }),
      });
      const body = (await response.json()) as FinancialMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setEditor(null);
      setReloadKey((value) => value + 1);
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Không lưu được dữ liệu tài chính.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMonth(month: FinancialMonth) {
    if (!window.confirm(`Xóa dữ liệu tài chính tháng ${monthLabel(month.monthDate)}?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/finance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, id: month.id }),
      });
      const body = (await response.json()) as FinancialDeleteResponse;
      if (!body.ok) throw new Error(body.message);
      setReloadKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xóa được dữ liệu tài chính.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Project Financial Control"
        title={`${selectedProject.code} • Financial Control`}
        description="Quản lý giá trị hợp đồng, forecast, actual, revenue theo tháng, chi phí nhân sự và lợi nhuận dự kiến."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]", data?.source === "demo" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200")}>
              {data?.source === "demo" ? "Demo data" : "Live Supabase"}
            </span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại tài chính">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <button type="button" disabled={!data?.canEdit} onClick={() => { setModalError(""); setEditor(emptyForm); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.12] px-4 text-xs font-semibold text-cyan-100 disabled:opacity-40">
              <Plus className="size-4" /> Thêm tháng
            </button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}

      {!data && loading ? <div className="tech-panel h-[420px] animate-pulse rounded-2xl bg-white/[0.02]" /> : null}

      {data ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <SummaryCard label="Contract Value" value={money(data.summary.contractValue)} note={data.project.contractNo ?? "Chưa có số hợp đồng"} icon={DollarSign} tone="violet" />
            <SummaryCard label="Forecast" value={percent(data.summary.forecastPercent)} note={money(data.summary.forecastAmount)} icon={TrendingUp} tone="cyan" />
            <SummaryCard label="Actual" value={percent(data.summary.actualPercent)} note={money(data.summary.actualAmount)} icon={BarChart3} tone="emerald" />
            <SummaryCard label="Revenue" value={money(data.summary.revenueAmount)} note={`Còn lại ${money(data.summary.remainingRevenueAmount)}`} icon={DollarSign} tone="emerald" />
            <SummaryCard label="Total Cost" value={money(data.summary.totalCostAmount)} note={`Nhân sự ${money(data.summary.staffCostAmount)}`} icon={TrendingDown} tone="amber" />
            <SummaryCard label="Profit" value={money(data.summary.projectedProfitAmount)} note={`Margin ${percent(data.summary.projectedMarginPercent)}`} icon={data.summary.projectedProfitAmount >= 0 ? TrendingUp : TrendingDown} tone={data.summary.projectedProfitAmount >= 0 ? "emerald" : "rose"} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Monthly Revenue Plan</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Forecast / Actual / Revenue / Cost</h2>
                </div>
                <CalendarDays className="size-5 text-cyan-300/70" />
              </div>
              <div className="overflow-x-auto">
                <table className="asc-data-grid w-full min-w-[1180px] text-left">
                  <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.18em] text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Tháng</th>
                      <th className="px-4 py-3">Forecast</th>
                      <th className="px-4 py-3">Actual</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3">Staff Cost</th>
                      <th className="px-4 py-3">Other Cost</th>
                      <th className="px-4 py-3">Profit</th>
                      <th className="px-4 py-3">Margin</th>
                      <th className="px-4 py-3">Ghi chú</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.055] text-sm">
                    {data.months.map((month) => (
                      <tr key={month.id} className="align-top hover:bg-white/[0.018]">
                        <td className="px-4 py-4 font-semibold text-cyan-200">{monthLabel(month.monthDate)}</td>
                        <td className="px-4 py-4 text-slate-300">{percent(month.forecastPercent)}<div className="mt-1 text-[10px] text-slate-700">{money(month.forecastAmount)}</div></td>
                        <td className="px-4 py-4 text-slate-300">{percent(month.actualPercent)}<div className="mt-1 text-[10px] text-slate-700">{money(month.actualAmount)}</div></td>
                        <td className="px-4 py-4 font-semibold text-emerald-200">{money(month.revenueAmount)}</td>
                        <td className="px-4 py-4 text-slate-400">{money(month.staffCostAmount)}</td>
                        <td className="px-4 py-4 text-slate-400">{money(month.otherCostAmount)}</td>
                        <td className={cn("px-4 py-4 font-semibold", month.projectedProfitAmount >= 0 ? "text-emerald-200" : "text-rose-200")}>{money(month.projectedProfitAmount)}</td>
                        <td className={cn("px-4 py-4 font-semibold", month.projectedMarginPercent >= 0 ? "text-emerald-200" : "text-rose-200")}>{percent(month.projectedMarginPercent)}</td>
                        <td className="max-w-[280px] whitespace-normal px-4 py-4 text-xs leading-5 text-slate-500">{month.notes || "-"}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" disabled={!data.canEdit || saving} onClick={() => { setModalError(""); setEditor(formFromMonth(month)); }} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 hover:text-cyan-200 disabled:opacity-40" title="Sửa"><Edit3 className="size-3.5" /></button>
                            <button type="button" disabled={!data.canEdit || saving} onClick={() => void deleteMonth(month)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 hover:text-rose-200 disabled:opacity-40" title="Xóa"><Trash2 className="size-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!data.months.length ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-600">Chưa có dữ liệu tài chính theo tháng. Bấm Thêm tháng để nhập forecast, actual, revenue và chi phí.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="border-b border-white/[0.07] p-4">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Revenue Chart</div>
                <h2 className="mt-1.5 text-sm font-semibold text-white">Forecast vs Revenue</h2>
              </div>
              <div className="space-y-4 p-4">
                {data.months.map((month) => (
                  <div key={month.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{monthLabel(month.monthDate)}</span>
                      <span className="text-slate-600">{money(month.revenueAmount)}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 rounded-full bg-white/[0.04]"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, (month.forecastAmount / maxRevenue) * 100)}%` }} /></div>
                      <div className="h-2 rounded-full bg-white/[0.04]"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, (month.revenueAmount / maxRevenue) * 100)}%` }} /></div>
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.12em] text-slate-700"><span>Forecast</span><span>Revenue</span></div>
                  </div>
                ))}
                {!data.months.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có dữ liệu biểu đồ.</div> : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {editor && data ? (
        <FinancialMonthModal
          projectContractValue={data.project.contractValue}
          initial={editor}
          saving={saving}
          error={modalError}
          onClose={() => {
            if (!saving) setEditor(null);
          }}
          onSave={(form) => void saveMonth(form)}
        />
      ) : null}
    </>
  );
}
