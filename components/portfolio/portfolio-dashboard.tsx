"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BellRing, BriefcaseBusiness, CalendarClock, CheckCircle2, CircleGauge, FileStack, LoaderCircle, RefreshCw, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import type { PortfolioApiResponse, PortfolioData, PortfolioHealth, PortfolioProjectRow } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";

const healthMeta: Record<PortfolioHealth, { label: string; tone: string }> = {
  on_track: { label: "ON TRACK", tone: "border-emerald-300/16 bg-emerald-300/[0.06] text-emerald-200" },
  at_risk: { label: "AT RISK", tone: "border-amber-300/16 bg-amber-300/[0.06] text-amber-200" },
  late: { label: "LATE", tone: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200" },
  completed: { label: "COMPLETED", tone: "border-cyan-300/16 bg-cyan-300/[0.06] text-cyan-200" },
  not_scheduled: { label: "NO SCHEDULE", tone: "border-white/[0.08] bg-white/[0.03] text-slate-500" },
};

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value) + " ₫";
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function Kpi({ label, value, note, tone = "cyan", icon: Icon }: { label: string; value: string; note: string; tone?: "cyan" | "emerald" | "amber" | "rose" | "violet"; icon: typeof CircleGauge }) {
  const color = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
    amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
    rose: "border-rose-300/15 bg-rose-300/[0.055] text-rose-200",
    violet: "border-violet-300/15 bg-violet-300/[0.055] text-violet-200",
  }[tone];
  return <div className="tech-panel rounded-2xl p-4 md:p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div><div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div><div className="mt-2 text-[10px] text-slate-600">{note}</div></div><div className={cn("grid size-9 place-items-center rounded-xl border", color)}><Icon className="size-4" /></div></div></div>;
}

function ProjectRow({ project, active, onSelect }: { project: PortfolioProjectRow; active: boolean; onSelect: () => void }) {
  const health = healthMeta[project.health];
  return (
    <tr className={cn("border-t border-white/[0.045] hover:bg-white/[0.018]", active && "bg-cyan-300/[0.035]")}>
      <td className="px-4 py-4"><div className="font-semibold text-slate-200">{project.code}</div><div className="mt-1 max-w-[260px] truncate text-[10px] text-slate-600">{project.organizationName || project.name}</div></td>
      <td className="px-4 py-4"><span className={cn("rounded-lg border px-2 py-1 text-[9px] font-semibold", health.tone)}>{health.label}</span></td>
      <td className="px-4 py-4 text-[10px] text-slate-500">{project.stageProgress}% stage<br />{project.openIssues}/{project.totalIssues} issue mở</td>
      <td className="px-4 py-4 text-[10px] text-slate-500">{project.overdueIssues} issue<br />{project.overdueTasks} task</td>
      <td className="px-4 py-4 text-[10px] text-slate-500">{project.blockedTasks} blocker<br />{project.openReminders} reminder</td>
      <td className="px-4 py-4 text-[10px] text-slate-500">{date(project.nextDueDate)}</td>
      <td className="px-4 py-4 text-right"><button type="button" onClick={onSelect} className="mr-2 rounded-lg border border-white/[0.07] px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-cyan-200">Chọn</button><Link href="/dashboard" className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/12 bg-cyan-300/[0.045] px-2.5 py-1.5 text-[10px] text-cyan-100">Mở <ArrowRight className="size-3" /></Link></td>
    </tr>
  );
}

export function PortfolioDashboard() {
  const { selectedProject, selectProject } = useProject();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store" });
        const body = (await response.json()) as PortfolioApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Không tải được Portfolio Dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const topRisks = useMemo(() => (data?.projects ?? []).filter((project) => project.alertScore > 0).slice(0, 5), [data?.projects]);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio Command Center"
        title="Cross-Project Portfolio"
        description="Theo dõi sức khỏe, rủi ro timeline, ISSUE, task và reminder của toàn bộ project bạn có quyền truy cập."
        actions={<div className="flex items-center gap-2">{data?.source === "demo" ? <span className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200">Demo data</span> : <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Live Supabase</span>}<button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button></div>}
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {loading && !data ? <div className="grid min-h-[420px] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-cyan-300" /><div className="mt-3 text-xs text-slate-600">Đang tải Portfolio Dashboard...</div></div></div> : null}

      {data ? <div className="space-y-4">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Kpi label="Projects" value={String(data.summary.projectCount)} note={`${data.summary.activeProjects} project đang active`} icon={BriefcaseBusiness} />
          <Kpi label="At Risk / Late" value={`${data.summary.atRiskProjects}/${data.summary.lateProjects}`} note="Dự án cần chú ý" icon={AlertTriangle} tone={data.summary.lateProjects ? "rose" : "amber"} />
          <Kpi label="Open Issues" value={String(data.summary.openIssues)} note={`${data.summary.overdueIssues} issue quá hạn`} icon={CircleGauge} tone={data.summary.overdueIssues ? "rose" : "cyan"} />
          <Kpi label="Reminders" value={String(data.summary.openReminders)} note={`${data.summary.overdueReminders} reminder quá hạn`} icon={BellRing} tone={data.summary.overdueReminders ? "rose" : "violet"} />
          <Kpi label="Contract Value" value={money(data.summary.totalContractValue)} note="Tổng giá trị project có quyền xem" icon={TrendingUp} tone="emerald" />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
          <div className="tech-panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Project Ranking</div><h2 className="mt-1.5 text-sm font-semibold text-white">Xếp hạng theo mức cần xử lý</h2></div><FileStack className="size-5 text-cyan-300/60" /></div>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-black/10 text-[9px] uppercase tracking-[0.13em] text-slate-600"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Health</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Overdue</th><th className="px-4 py-3">Attention</th><th className="px-4 py-3">Next Due</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                <tbody>{data.projects.map((project) => <ProjectRow key={project.id} project={project} active={selectedProject.id === project.id} onSelect={() => selectProject(project.id)} />)}</tbody>
              </table>
            </div>
            {!data.projects.length ? <div className="grid min-h-72 place-items-center text-center text-xs text-slate-600">Chưa có project để tổng hợp.</div> : null}
          </div>

          <div className="tech-panel rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Priority Board</div><h2 className="mt-1.5 text-sm font-semibold text-white">Cần xử lý trước</h2></div><CalendarClock className="size-5 text-amber-300/65" /></div>
            <div className="space-y-2.5">
              {topRisks.map((project) => <button key={project.id} type="button" onClick={() => selectProject(project.id)} className="w-full rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 text-left hover:bg-white/[0.035]"><div className="flex items-center justify-between gap-3"><div className="font-semibold text-slate-300">{project.code}</div><span className={cn("rounded-md border px-2 py-1 text-[8px]", healthMeta[project.health].tone)}>{healthMeta[project.health].label}</span></div><div className="mt-2 text-[10px] leading-4 text-slate-600">{project.alertScore} điểm cảnh báo • {project.overdueIssues} issue quá hạn • {project.blockedTasks} blocker • {project.openReminders} reminder</div></button>)}
              {!topRisks.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-300/45" /><div className="mt-3 text-xs text-slate-500">Không có project rủi ro nổi bật.</div></div> : null}
            </div>
          </div>
        </section>
      </div> : null}
    </>
  );
}
