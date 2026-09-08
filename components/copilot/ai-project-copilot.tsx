"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  DollarSign,
  FileText,
  Gauge,
  Lightbulb,
  Loader2,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import type { CopilotAction, CopilotApiResponse, CopilotData, CopilotDomain, CopilotMetric, CopilotRisk, CopilotSeverity } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

const severityClass: Record<CopilotSeverity, string> = {
  good: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
  info: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
  warning: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  critical: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
};

const domainLabel: Record<CopilotDomain, string> = {
  project: "Project",
  timeline: "Timeline",
  issue: "ISSUE",
  workload: "Workload",
  finance: "Finance",
  report: "Report",
};

const domainIcon: Record<CopilotDomain, typeof Gauge> = {
  project: Gauge,
  timeline: Route,
  issue: ShieldAlert,
  workload: UsersRound,
  finance: DollarSign,
  report: FileText,
};

function formatDate(value: string | null) {
  if (!value) return "Chưa có hạn";
  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function MetricCard({ metric, icon: Icon }: { metric: CopilotMetric; icon: typeof Gauge }) {
  return (
    <div className="tech-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{metric.label}</div>
          <div className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] text-white">{typeof metric.value === "number" ? metric.value.toLocaleString("vi-VN") : metric.value}</div>
          <div className="mt-2 text-[10px] leading-4 text-slate-600">{metric.note}</div>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border", severityClass[metric.severity])}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: CopilotAction }) {
  const Icon = domainIcon[action.domain];
  return (
    <Link href={action.href} className="block rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 transition hover:border-cyan-300/18 hover:bg-white/[0.035]">
      <div className="flex items-start gap-3">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", severityClass[action.severity])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-lg border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]", severityClass[action.severity])}>{domainLabel[action.domain]}</span>
            <span className="text-[10px] text-slate-700">{formatDate(action.dueDate)}</span>
          </div>
          <div className="mt-3 text-sm font-semibold text-white">{action.title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">{action.detail}</div>
          <div className="mt-3 rounded-xl border border-white/[0.055] bg-black/10 px-3 py-2 text-[10px] leading-4 text-slate-500">{action.reason}</div>
          {action.ownerName ? <div className="mt-2 text-[10px] text-slate-600">Owner: {action.ownerName}</div> : null}
        </div>
        <ArrowRight className="mt-2 size-4 shrink-0 text-slate-700" />
      </div>
    </Link>
  );
}

function RiskCard({ risk }: { risk: CopilotRisk }) {
  const Icon = domainIcon[risk.domain];
  return (
    <Link href={risk.href} className={cn("block rounded-2xl border p-4 transition hover:bg-white/[0.03]", severityClass[risk.severity])}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">{domainLabel[risk.domain]}</div>
          <div className="mt-1 text-sm font-semibold">{risk.title}</div>
          <div className="mt-1 text-xs leading-5 opacity-75">{risk.summary}</div>
        </div>
      </div>
    </Link>
  );
}

function CopilotSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="tech-panel h-[118px] animate-pulse rounded-2xl bg-white/[0.02]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <div className="tech-panel h-[420px] animate-pulse rounded-2xl bg-white/[0.02]" />
        <div className="tech-panel h-[420px] animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    </div>
  );
}

export function AiProjectCopilot() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/copilot?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store", signal: controller.signal });
        const body = (await response.json()) as CopilotApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được AI Project Copilot.");
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

  const metricIcons = useMemo(() => [Gauge, Route, ShieldAlert, UsersRound, DollarSign, Sparkles], []);
  const scoreTone: CopilotSeverity = data && data.healthScore >= 85 ? "good" : data && data.healthScore >= 70 ? "info" : data && data.healthScore >= 55 ? "warning" : "critical";

  async function copyReport() {
    if (!data) return;
    await navigator.clipboard.writeText(data.reportDraft.plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Project Copilot"
        title={`${selectedProject.code} • AI Project Copilot`}
        description="Tự tóm tắt tình hình dự án, đề xuất việc cần xử lý, viết báo cáo nhanh và cảnh báo rủi ro vận hành từ dữ liệu ASC WORKING hiện có."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]", data?.source === "demo" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200")}>
              {data?.source === "demo" ? "Demo data" : "Live Supabase"}
            </span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại Copilot">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {loading && !data ? <CopilotSkeleton /> : null}

      {data ? (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_1fr]">
            <div className="tech-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Executive Signal</div>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-6xl font-semibold tracking-[-0.07em] text-white">{data.healthScore}</span>
                    <span className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-600">/ 100</span>
                  </div>
                  <div className={cn("mt-4 inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]", severityClass[scoreTone])}>{data.healthLabel}</div>
                </div>
                <div className={cn("grid size-12 shrink-0 place-items-center rounded-2xl border", severityClass[scoreTone])}>
                  <Bot className="size-6" />
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.045] p-4 text-sm leading-6 text-cyan-50/90">{data.executiveSummary}</div>
              <div className="mt-4 text-[10px] text-slate-600">Confidence {data.confidence}% • Generated {formatDate(data.generatedAt)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {data.metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} icon={metricIcons[index] ?? Gauge} />)}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_430px]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Next Best Actions</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Copilot đề xuất việc cần xử lý</h2>
                </div>
                <Lightbulb className="size-5 text-amber-300/70" />
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {data.actions.map((action) => <ActionCard key={action.id} action={action} />)}
                {!data.actions.length ? <div className="col-span-full rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-slate-600">Chưa có hành động ưu tiên. Dự án đang khá gọn.</div> : null}
              </div>
            </div>

            <div className="tech-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Risk Radar</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Cảnh báo vận hành</h2>
                </div>
                <AlertTriangle className="size-5 text-amber-300/70" />
              </div>
              <div className="space-y-3">
                {data.risks.map((risk) => <RiskCard key={risk.id} risk={risk} />)}
                {!data.risks.length ? <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-300/45" /><div className="mt-3 text-xs text-slate-500">Không có cảnh báo nổi bật.</div></div> : null}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_430px]">
            <div className="tech-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Executive Summary</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Tóm tắt nhanh cho quản lý</h2>
                </div>
                <Sparkles className="size-5 text-cyan-300/70" />
              </div>
              <div className="space-y-3">
                {data.summaryBullets.map((item, index) => (
                  <div key={`${index}-${item}`} className="flex gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.018] p-4">
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.055] text-[10px] font-semibold text-cyan-200">{index + 1}</span>
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="tech-panel rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Report Writer</div>
                    <h2 className="mt-1.5 text-sm font-semibold text-white">{data.reportDraft.title}</h2>
                  </div>
                  <button type="button" onClick={() => void copyReport()} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] px-3 text-[10px] font-semibold text-cyan-100">
                    {copied ? <CheckCircle2 className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
                    {copied ? "Đã copy" : "Copy"}
                  </button>
                </div>
                <div className="scrollbar-thin max-h-[420px] space-y-4 overflow-y-auto pr-1">
                  {data.reportDraft.sections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-white/[0.055] bg-black/10 p-4">
                      <div className="text-xs font-semibold text-slate-200">{section.title}</div>
                      <div className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-500">{section.body}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tech-panel rounded-2xl p-5">
                <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Prompt Templates</div>
                <div className="space-y-2">
                  {data.prompts.map((prompt) => (
                    <div key={prompt.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                      <div className="text-xs font-semibold text-slate-200">{prompt.title}</div>
                      <div className="mt-1 text-[10px] leading-4 text-slate-600">{prompt.prompt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {loading ? <div className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/15 bg-[#081421]/95 px-4 py-3 text-xs text-cyan-100 shadow-2xl"><Loader2 className="size-4 animate-spin" /> Copilot đang cập nhật...</div> : null}
        </div>
      ) : null}
    </>
  );
}
