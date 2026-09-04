"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, Command, FileStack, Gauge, Layers3, ListTodo, RefreshCw, Route, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import type { CommandCenterAction, CommandCenterApiResponse, CommandCenterData, CommandCenterMetric } from "@/lib/command-center/types";
import { cn } from "@/lib/utils";

const toneClass = {
  cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
  emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
  amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  rose: "border-rose-300/15 bg-rose-300/[0.055] text-rose-200",
  violet: "border-violet-300/15 bg-violet-300/[0.055] text-violet-200",
} as const;

const severityClass = {
  info: "border-cyan-300/12 bg-cyan-300/[0.045] text-cyan-200",
  warning: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  critical: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
} as const;

const actionIcon: Record<CommandCenterAction["type"], typeof ListTodo> = {
  issue: ListTodo,
  task: CheckCircle2,
  milestone: Route,
  reminder: BellRing,
  stage: Layers3,
  system: Command,
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function KpiCard({ card, icon: Icon }: { card: CommandCenterMetric; icon: typeof Gauge }) {
  return (
    <div className="tech-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{card.label}</div>
          <div className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] text-white">{typeof card.value === "number" ? card.value.toLocaleString("vi-VN") : card.value}</div>
          <div className="mt-2 text-[10px] leading-4 text-slate-600">{card.note}</div>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border", toneClass[card.tone])}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function ActionRow({ action }: { action: CommandCenterAction }) {
  const Icon = actionIcon[action.type];
  return (
    <Link href={action.href} className="block rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 transition hover:border-cyan-300/15 hover:bg-white/[0.035]">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border", severityClass[action.severity])}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-xs font-semibold text-slate-200">{action.title}</div>
          <div className="mt-1 line-clamp-1 text-[10px] text-slate-600">{action.detail}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-slate-700">
            <span>{formatDate(action.dueDate)}</span>
            {action.ownerName ? <span>• {action.ownerName}</span> : null}
          </div>
        </div>
        <ArrowRight className="mt-2 size-3.5 shrink-0 text-slate-700" />
      </div>
    </Link>
  );
}

function CommandCenterSkeleton() {
  return (
    <div className="space-y-4">
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

export function ProjectCommandCenter() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<CommandCenterData | null>(null);
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
        const response = await fetch(`/api/command-center?projectId=${encodeURIComponent(selectedProject.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as CommandCenterApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được Project Command Center.");
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

  const cardIcons = useMemo(() => [Gauge, CheckCircle2, ListTodo, ShieldAlert, BellRing, FileStack], []);
  const scoreTone = data && data.health.score >= 80 ? "emerald" : data && data.health.score >= 60 ? "amber" : "rose";

  return (
    <>
      <PageHeader
        eyebrow="Project Command Center"
        title={`${selectedProject.code} • Command Center`}
        description="Một màn điều hành tổng hợp để PM nhìn nhanh sức khỏe dự án, việc cần xử lý, rủi ro timeline, tiến độ execution và phạm vi PLHĐ."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]", data?.source === "demo" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200")}>
              {data?.source === "demo" ? "Demo data" : "Live Supabase"}
            </span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại Command Center">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {loading && !data ? <CommandCenterSkeleton /> : null}

      {data ? (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
            <div className="tech-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Project Health</div>
                  <div className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-white">{data.health.score}</div>
                  <div className={cn("mt-3 inline-flex rounded-xl border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]", toneClass[scoreTone])}>{data.health.label}</div>
                </div>
                <Sparkles className="size-6 text-cyan-300/70" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] text-slate-600">
                <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-slate-700">Start</span><b className="mt-1 block text-slate-300">{formatDate(data.project.startDate)}</b></div>
                <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-slate-700">Due</span><b className="mt-1 block text-slate-300">{formatDate(data.project.dueDate)}</b></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {data.cards.map((card, index) => <KpiCard key={card.label} card={card} icon={cardIcons[index] ?? Gauge} />)}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] p-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Action Board</div><h2 className="mt-1.5 text-sm font-semibold text-white">Việc cần xử lý trước</h2></div><Command className="size-5 text-cyan-300/65" /></div>
              <div className="grid gap-2 p-4 md:grid-cols-2">
                {data.actions.map((action) => <ActionRow key={action.id} action={action} />)}
                {!data.actions.length ? <div className="col-span-full rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có hành động ưu tiên trong 7 ngày tới.</div> : null}
              </div>
            </div>

            <div className="tech-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Risk Radar</div><h2 className="mt-1.5 text-sm font-semibold text-white">Cảnh báo thông minh</h2></div><AlertTriangle className="size-5 text-amber-300/70" /></div>
              <div className="space-y-2.5">
                {data.risks.map((risk) => (
                  <Link key={risk.id} href={risk.href} className={cn("block rounded-xl border p-3", risk.severity === "critical" ? severityClass.critical : risk.severity === "warning" ? severityClass.warning : severityClass.info)}>
                    <div className="text-xs font-semibold">{risk.title}</div>
                    <div className="mt-1 text-[10px] leading-4 opacity-70">{risk.summary}</div>
                  </Link>
                ))}
                {!data.risks.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-300/45" /><div className="mt-3 text-xs text-slate-500">Không có cảnh báo nổi bật.</div></div> : null}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <div className="tech-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Delivery Timeline</div><h2 className="mt-1.5 text-sm font-semibold text-white">Stage execution</h2></div><Route className="size-5 text-violet-300/70" /></div>
              <div className="space-y-3">
                {data.stages.map((stage) => (
                  <div key={stage.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                    <div className="flex items-center justify-between gap-4"><div className="min-w-0"><div className="truncate text-xs font-semibold text-slate-200">{stage.code} • {stage.name}</div><div className="mt-1 text-[10px] text-slate-600">{formatDate(stage.startDate)} → {formatDate(stage.endDate)} • {stage.status}</div></div><span className="text-xs font-semibold text-cyan-200">{stage.progress}%</span></div>
                    <div className="mt-3 h-2 rounded-full bg-white/[0.035]"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(0, Math.min(100, stage.progress))}%` }} /></div>
                  </div>
                ))}
                {!data.stages.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có Project Stages.</div> : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="tech-panel rounded-2xl p-5">
                <div className="mb-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Milestones</div>
                <div className="space-y-2">
                  {data.milestones.map((milestone) => <div key={milestone.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="line-clamp-1 text-xs font-semibold text-slate-200">{milestone.title}</div><div className="mt-1 text-[10px] text-slate-600">{formatDate(milestone.dueDate)} • {milestone.status}{milestone.ownerName ? ` • ${milestone.ownerName}` : ""}</div></div>)}
                  {!data.milestones.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-slate-600">Chưa có milestone.</div> : null}
                </div>
              </div>
              <div className="tech-panel rounded-2xl p-5">
                <div className="mb-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Command Links</div>
                <div className="grid gap-2">
                  {data.quickLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 hover:bg-white/[0.035]"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-semibold text-slate-200">{link.label}</div><div className="mt-1 text-[10px] text-slate-600">{link.description}</div></div><ArrowRight className="size-3.5 text-slate-700" /></div></Link>)}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
