"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers3,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import type { EnterpriseGate, EnterprisePriorityAction, EnterpriseSuiteApiResponse, EnterpriseSuiteData, EnterpriseTone } from "@/lib/enterprise/types";
import { cn } from "@/lib/utils";

const toneClass: Record<EnterpriseTone, string> = {
  cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
  emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
  amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  rose: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
  violet: "border-violet-300/15 bg-violet-300/[0.055] text-violet-200",
};

const severityClass: Record<EnterprisePriorityAction["severity"], string> = {
  info: "border-cyan-300/12 bg-cyan-300/[0.045] text-cyan-200",
  warning: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  critical: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
};

const gateClass: Record<EnterpriseGate["status"], string> = {
  ready: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
  attention: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  blocked: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function valueText(value: number | string) {
  return typeof value === "number" ? value.toLocaleString("vi-VN") : value;
}

function ScoreRing({ score }: { score: number }) {
  const background = `conic-gradient(rgb(34 211 238) ${Math.max(0, Math.min(100, score)) * 3.6}deg, rgba(148, 163, 184, 0.12) 0deg)`;
  return (
    <div className="relative grid size-36 shrink-0 place-items-center rounded-full" style={{ background }}>
      <div className="grid size-[118px] place-items-center rounded-full border border-white/[0.08] bg-[#0b1422]">
        <div className="text-center">
          <div className="text-4xl font-semibold tracking-[-0.06em] text-white">{score}</div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">PMO Score</div>
        </div>
      </div>
    </div>
  );
}

function EnterpriseSkeleton() {
  return (
    <div className="space-y-4">
      <div className="tech-panel h-[280px] animate-pulse rounded-2xl bg-white/[0.02]" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="tech-panel h-[118px] animate-pulse rounded-2xl bg-white/[0.02]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <div className="tech-panel h-[360px] animate-pulse rounded-2xl bg-white/[0.02]" />
        <div className="tech-panel h-[360px] animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, note, tone, icon: Icon }: EnterpriseSuiteData["kpis"][number] & { icon: typeof Gauge }) {
  return (
    <div className="tech-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div>
          <div className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] text-white">{valueText(value)}</div>
          <div className="mt-2 text-[10px] leading-4 text-slate-600">{note}</div>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border", toneClass[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function GateCard({ gate }: { gate: EnterpriseGate }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{gate.title}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">{gate.summary}</div>
        </div>
        <span className={cn("rounded-xl border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]", gateClass[gate.status])}>
          {gate.status}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-white/[0.04]">
          <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(0, Math.min(100, gate.score))}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-semibold text-cyan-200">{gate.score}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {gate.actions.map((action) => (
          <Link key={action.href} href={action.href} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold text-slate-300 hover:border-cyan-300/20 hover:text-cyan-100">
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PriorityAction({ action }: { action: EnterprisePriorityAction }) {
  return (
    <Link href={action.href} className="block rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 transition hover:border-cyan-300/15 hover:bg-white/[0.035]">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border", severityClass[action.severity])}>
          <AlertTriangle className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-xs font-semibold text-slate-200">{action.title}</div>
          <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600">{action.detail}</div>
        </div>
        <ArrowRight className="mt-2 size-3.5 shrink-0 text-slate-700" />
      </div>
    </Link>
  );
}

export function EnterpriseSuite() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<EnterpriseSuiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/enterprise?projectId=${encodeURIComponent(selectedProject.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as EnterpriseSuiteApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được Enterprise Project Suite.");
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

  const cardIcons = useMemo(() => [ShieldCheck, ListChecks, ClipboardCheck, UsersRound, Gauge, BarChart3], []);

  return (
    <>
      <PageHeader
        eyebrow="Enterprise Project Suite"
        title={`${selectedProject.code} • Enterprise Suite`}
        description="Chuẩn hóa hệ thống quản trị dự án ở tầng PMO: dữ liệu gốc, tiến độ, nguồn lực, rủi ro và báo cáo điều hành trên cùng một màn."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]", data?.source === "demo" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200")}>
              {data?.source === "demo" ? "Demo data" : "Live Supabase"}
            </span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại Enterprise Suite">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {loading && !data ? <EnterpriseSkeleton /> : null}

      {data ? (
        <div className="space-y-4">
          <section className="tech-panel overflow-hidden rounded-2xl">
            <div className="grid grid-cols-1 gap-6 p-5 xl:grid-cols-[280px_1fr_360px] xl:p-6">
              <div className="flex items-center justify-center xl:justify-start">
                <ScoreRing score={data.maturityScore} />
              </div>
              <div className="min-w-0">
                <div className="inline-flex rounded-xl border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                  V3.0.0 • {data.maturityLevel}
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">Enterprise project operating layer</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{data.executiveSummary}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] text-slate-600 md:grid-cols-4">
                  <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-slate-700">Project</span><b className="mt-1 block truncate text-slate-300">{data.project.code}</b></div>
                  <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-slate-700">Status</span><b className="mt-1 block truncate text-slate-300">{data.project.status}</b></div>
                  <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-slate-700">Start</span><b className="mt-1 block text-slate-300">{formatDate(data.project.startDate)}</b></div>
                  <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-slate-700">Due</span><b className="mt-1 block text-slate-300">{formatDate(data.project.dueDate)}</b></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600"><BriefcaseBusiness className="size-3.5" /> PMO Focus</div>
                <div className="mt-4 space-y-2.5">
                  {data.gates.slice(0, 3).map((gate) => (
                    <Link key={gate.id} href={gate.actions[0]?.href ?? "/command-center"} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-2.5 hover:bg-white/[0.035]">
                      <span className="min-w-0 truncate text-xs font-semibold text-slate-300">{gate.title}</span>
                      <span className={cn("rounded-lg border px-2 py-1 text-[9px] font-semibold uppercase", gateClass[gate.status])}>{gate.score}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            {data.kpis.map((card, index) => <KpiCard key={card.id} {...card} icon={cardIcons[index] ?? Gauge} />)}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_430px]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Enterprise Readiness Gates</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Các cổng kiểm soát chuẩn hóa dự án</h2>
                </div>
                <ShieldCheck className="size-5 text-cyan-300/70" />
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {data.gates.map((gate) => <GateCard key={gate.id} gate={gate} />)}
              </div>
            </div>

            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Priority Board</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Việc ưu tiên cho quản lý</h2>
                </div>
                <AlertTriangle className="size-5 text-amber-300/70" />
              </div>
              <div className="max-h-[560px] space-y-2 overflow-y-auto p-4">
                {data.priorityActions.map((action) => <PriorityAction key={action.id} action={action} />)}
                {!data.priorityActions.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có hành động ưu tiên.</div> : null}
              </div>
            </div>
          </section>

          <section className="tech-panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">PMO Operating Model</div>
                <h2 className="mt-1.5 text-sm font-semibold text-white">Mô hình vận hành dự án chuyên nghiệp</h2>
              </div>
              <Layers3 className="size-5 text-violet-300/70" />
            </div>
            <div className="overflow-x-auto">
              <table className="asc-data-grid w-full min-w-[980px] text-left">
                <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.18em] text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Pillar</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Cadence</th>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3 text-right">Điều hướng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.055] text-sm">
                  {data.operatingModel.map((pillar) => (
                    <tr key={pillar.id} className="align-top hover:bg-white/[0.018]">
                      <td className="px-4 py-4 font-semibold text-slate-200">{pillar.title}</td>
                      <td className="px-4 py-4 text-slate-500">{pillar.owner}</td>
                      <td className="px-4 py-4 text-slate-500">{pillar.cadence}</td>
                      <td className="px-4 py-4 text-slate-400">{pillar.metric}</td>
                      <td className="px-4 py-4 text-right">
                        <Link href={pillar.href} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-300/20">
                          Mở <ArrowRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link href="/command-center" className="tech-panel rounded-2xl p-5 hover:border-cyan-300/20">
              <Gauge className="size-5 text-cyan-300/70" />
              <div className="mt-4 text-sm font-semibold text-white">Command Center</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">Điều hành sức khỏe dự án và action board hằng ngày.</div>
            </Link>
            <Link href="/portfolio" className="tech-panel rounded-2xl p-5 hover:border-cyan-300/20">
              <BarChart3 className="size-5 text-violet-300/70" />
              <div className="mt-4 text-sm font-semibold text-white">Portfolio</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">So sánh nhiều dự án, ranking rủi ro và ưu tiên quản trị.</div>
            </Link>
            <Link href="/reports" className="tech-panel rounded-2xl p-5 hover:border-cyan-300/20">
              <FileText className="size-5 text-emerald-300/70" />
              <div className="mt-4 text-sm font-semibold text-white">Executive Reports</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">Lưu snapshot, báo cáo PM và thông tin steering.</div>
            </Link>
          </section>
        </div>
      ) : null}
    </>
  );
}
