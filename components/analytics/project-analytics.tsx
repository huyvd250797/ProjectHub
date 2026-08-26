"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Download,
  Gauge,
  Layers3,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { AnalyticsRiskRow, AnalyticsTrendPoint, ProjectAnalyticsApiResponse, ProjectAnalyticsData } from "@/lib/analytics-types";

const rangeOptions = [
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "180", label: "180 ngày" },
  { value: "365", label: "1 năm" },
  { value: "all", label: "Toàn bộ" },
];

function number(value: number) { return new Intl.NumberFormat("vi-VN").format(value); }
function pct(value: number) { return `${Math.max(0, Math.min(100, Math.round(value)))}%`; }

const healthMeta = {
  healthy: { label: "HEALTHY", text: "text-emerald-200", border: "border-emerald-300/20", bg: "bg-emerald-300/[0.06]" },
  watch: { label: "WATCH", text: "text-amber-200", border: "border-amber-300/20", bg: "bg-amber-300/[0.06]" },
  critical: { label: "CRITICAL", text: "text-rose-200", border: "border-rose-300/20", bg: "bg-rose-300/[0.06]" },
  no_data: { label: "NO DATA", text: "text-slate-400", border: "border-white/[0.08]", bg: "bg-white/[0.03]" },
} as const;

function TrendChart({ points }: { points: AnalyticsTrendPoint[] }) {
  const width = 760;
  const height = 220;
  const padX = 26;
  const padY = 24;
  const max = Math.max(1, ...points.flatMap((point) => [point.created, point.resolved]));
  const x = (index: number) => points.length <= 1 ? width / 2 : padX + index * ((width - padX * 2) / (points.length - 1));
  const y = (value: number) => height - padY - (value / max) * (height - padY * 2);
  const line = (key: "created" | "resolved") => points.map((point, index) => `${x(index)},${y(point[key])}`).join(" ");

  if (!points.length) return <div className="grid h-[220px] place-items-center text-xs text-slate-600">Chưa có dữ liệu xu hướng.</div>;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img" aria-label="Xu hướng ISSUE tạo mới và xử lý">
        {[0.25,0.5,0.75,1].map((ratio) => (
          <line key={ratio} x1={padX} x2={width-padX} y1={y(max*ratio)} y2={y(max*ratio)} stroke="currentColor" className="text-white/[0.055]" strokeWidth="1" />
        ))}
        <polyline points={line("created")} fill="none" stroke="currentColor" className="text-cyan-300" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={line("resolved")} fill="none" stroke="currentColor" className="text-emerald-300" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.period}>
            <circle cx={x(index)} cy={y(point.created)} r="3.5" fill="currentColor" className="text-cyan-300" />
            <circle cx={x(index)} cy={y(point.resolved)} r="3.5" fill="currentColor" className="text-emerald-300" />
            {(index === 0 || index === points.length - 1 || index % Math.max(1, Math.ceil(points.length / 7)) === 0) ? (
              <text x={x(index)} y={height - 3} textAnchor="middle" fill="currentColor" className="text-slate-600" fontSize="9">{point.label}</text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px]"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-300">{pct(value)}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-violet-300/70" style={{ width: pct(value) }} /></div>
    </div>
  );
}

function RiskTable({ title, rows, kind }: { title: string; rows: AnalyticsRiskRow[]; kind: "module" | "department" }) {
  return (
    <div className="tech-panel rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Risk Ranking</div><h3 className="mt-1.5 text-sm font-semibold text-white">{title}</h3></div><AlertTriangle className="size-4 text-amber-300/65" /></div>
      <div className="space-y-2.5">
        {rows.length ? rows.slice(0,8).map((row, index) => (
          <Link key={row.id} href={kind === "module" ? `/issues?moduleId=${encodeURIComponent(row.id)}` : `/issues?departmentId=${encodeURIComponent(row.id)}`} className="group block rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 hover:border-cyan-300/15 hover:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <div className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.06] text-[9px] font-semibold text-slate-600">{index+1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-medium text-slate-300 group-hover:text-white">{row.name}</span><span className={row.riskScore >= 60 ? "text-rose-200" : row.riskScore >= 35 ? "text-amber-200" : "text-emerald-200"}>{row.riskScore}</span></div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-[9px] text-slate-600"><span>{row.total} total</span><span>{row.open} mở</span><span>{row.overdue} quá hạn</span><span>{row.highPriority} A/B</span></div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-cyan-300/55" style={{ width: pct(row.progress) }} /></div>
              </div>
              <ArrowRight className="mt-1 size-3 text-slate-700 group-hover:text-cyan-200" />
            </div>
          </Link>
        )) : <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center text-xs text-slate-600">Chưa có dữ liệu.</div>}
      </div>
    </div>
  );
}

function exportAnalytics(data: ProjectAnalyticsData) {
  const lines: string[][] = [
    ["ASC WORKING", "Advanced Analytics & Project Health"],
    ["Project", data.projectCode],
    ["Generated", data.generatedAt],
    ["Health Score", String(data.health.score)],
    [],
    ["Metric","Value"],
    ["Total ISSUE", String(data.summary.total)], ["Open", String(data.summary.open)], ["Overdue", String(data.summary.overdue)],
    ["Resolved", String(data.summary.resolved)], ["Released", String(data.summary.released)], ["Handed Over", String(data.summary.handedOver)],
    ["High Priority Open", String(data.summary.highPriorityOpen)], ["Average Age Days", String(data.summary.avgAgeDays)], ["Average Resolution Days", String(data.summary.avgResolutionDays)],
    [], ["Top Risk Modules","Total","Open","Overdue","A/B","Risk Score"],
    ...data.topModules.map((row) => [row.name,String(row.total),String(row.open),String(row.overdue),String(row.highPriority),String(row.riskScore)]),
    [], ["Top Risk Departments","Total","Open","Overdue","A/B","Risk Score"],
    ...data.topDepartments.map((row) => [row.name,String(row.total),String(row.open),String(row.overdue),String(row.highPriority),String(row.riskScore)]),
  ];
  const csv = lines.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `ASC-WORKING-${data.projectCode}-Project-Health.csv`; a.click(); URL.revokeObjectURL(url);
}

export function ProjectAnalytics() {
  const { selectedProject } = useProject();
  const [range, setRange] = useState("90");
  const [data, setData] = useState<ProjectAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/analytics?projectId=${encodeURIComponent(selectedProject.id)}&range=${encodeURIComponent(range)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = (await response.json()) as ProjectAnalyticsApiResponse; if (!body.ok) throw new Error(body.message); return body.data; })
      .then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được Analytics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedProject.id, range, reloadKey]);

  const health = data ? healthMeta[data.health.status] : healthMeta.no_data;
  const riskSignals = useMemo(() => data ? [
    ["ISSUE quá hạn", data.summary.overdue, "/issues?overdue=1", "rose"],
    ["Priority A/B đang mở", data.summary.highPriorityOpen, "/issues?priority=A", "amber"],
    ["Thiếu Module", data.attention.missingModule, "/issues?missingModule=1", "amber"],
    ["Thiếu Phòng ban", data.attention.missingDepartment, "/issues?missingDepartment=1", "amber"],
    ["Thiếu phụ trách", data.attention.missingAssignee, "/issues?missingAssignee=1", "amber"],
    ["Gần Due Date", data.attention.nearDue, "/issues?nearDue=7", "cyan"],
  ] as const : [], [data]);

  const metricCards: Array<[string, number, string, LucideIcon, "cyan" | "rose" | "amber" | "emerald" | "violet"]> = data ? [
    ["ISSUE đang mở", data.summary.open, "Backlog hiện tại", Activity, "cyan"],
    ["Quá hạn", data.summary.overdue, "Cần xử lý ngay", AlertTriangle, "rose"],
    ["A/B đang mở", data.summary.highPriorityOpen, "Ưu tiên cao", Target, "amber"],
    ["Đã bàn giao", data.summary.handedOver, `/${data.summary.total} ISSUE`, CheckCircle2, "emerald"],
    ["Tạo trong kỳ", data.summary.createdInRange, `Trong ${data.range.days ?? "ALL"} ngày`, TrendingUp, "cyan"],
    ["Xử lý trong kỳ", data.summary.resolvedInRange, "Resolution flow", TrendingDown, "emerald"],
    ["Tuổi backlog TB", data.summary.avgAgeDays, "ngày", Clock3, "amber"],
    ["Resolution TB", data.summary.avgResolutionDays, "ngày", Gauge, "violet"],
  ] : [];

  return (
    <>
      <PageHeader
        eyebrow="Project Intelligence"
        title="Advanced Analytics & Project Health"
        description={`Phân tích sức khỏe, xu hướng ISSUE, backlog, rủi ro Module/Phòng ban/nhân sự của ${selectedProject.code}.`}
        actions={<div className="flex items-center gap-2"><ThemedSelect value={range} options={rangeOptions} onChange={setRange} ariaLabel="Khoảng thời gian Analytics" className="w-[150px]" leading={<CalendarRange className="size-3.5" />} /><button onClick={() => setReloadKey((v) => v+1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>{data ? <button onClick={() => exportAnalytics(data)} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-[10px] text-slate-400 hover:text-white"><Download className="size-3.5" /> Export</button> : null}</div>}
      />

      {loading ? <div className="grid place-items-center py-28"><LoaderCircle className="size-6 animate-spin text-cyan-300" /><div className="mt-3 text-xs text-slate-600">Đang tính Project Health...</div></div> : null}
      {!loading && error ? <div className="tech-panel rounded-2xl border-rose-300/15 p-6"><div className="flex gap-3"><ShieldAlert className="size-5 text-rose-200" /><div><div className="text-sm font-semibold text-rose-100">Không tải được Analytics</div><div className="mt-2 text-xs leading-5 text-slate-500">{error}</div></div></div></div> : null}

      {!loading && data ? <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[.72fr_1.28fr]">
          <div className="tech-panel rounded-2xl p-5 md:p-6">
            <div className="flex items-start justify-between"><div><div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Project Health Score</div><h2 className="mt-2 text-lg font-semibold text-white">Sức khỏe dự án</h2></div><span className={`rounded-xl border px-3 py-2 text-[9px] font-semibold tracking-[0.14em] ${health.border} ${health.bg} ${health.text}`}>{health.label}</span></div>
            <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative grid size-44 shrink-0 place-items-center rounded-full border border-white/[0.06] bg-black/10">
                <div className="absolute inset-3 rounded-full border-[11px] border-white/[0.045]" />
                <div className="absolute inset-3 rounded-full" style={{ background: `conic-gradient(rgba(46,211,255,.9) 0 ${Math.min(100,data.health.score)}%, rgba(255,255,255,.035) ${Math.min(100,data.health.score)}% 100%)`, mask: "radial-gradient(circle, transparent 57%, black 58%)" }} />
                <div className="text-center"><div className="text-4xl font-semibold tracking-[-0.06em] text-white">{data.health.score}</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-600">/ 100</div></div>
              </div>
              <div className="w-full space-y-4"><ScoreBar label="Xử lý ISSUE" value={data.health.issueScore} /><ScoreBar label="Bàn giao" value={data.health.deliveryScore} /><ScoreBar label="Kiểm soát quá hạn" value={data.health.overdueScore} /><ScoreBar label="Chất lượng dữ liệu" value={data.health.dataQualityScore} /><ScoreBar label="Tiến độ kế hoạch" value={data.health.scheduleScore} /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {metricCards.map(([label,value,note,Icon,tone]) => <div key={label} className="tech-panel rounded-2xl p-4"><div className="flex items-start justify-between"><div><div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">{label}</div><div className="mt-3 text-2xl font-semibold text-white">{number(value)}</div><div className="mt-1 text-[9px] text-slate-600">{note}</div></div><Icon className={`size-4 ${tone === "rose" ? "text-rose-300/70" : tone === "amber" ? "text-amber-300/70" : tone === "emerald" ? "text-emerald-300/70" : tone === "violet" ? "text-violet-300/70" : "text-cyan-300/70"}`} /></div></div>)}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_.6fr]">
          <div className="tech-panel rounded-2xl p-5 md:p-6"><div className="flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Flow Trend</div><h2 className="mt-2 text-lg font-semibold text-white">ISSUE tạo mới vs xử lý</h2></div><div className="flex gap-4 text-[9px]"><span className="flex items-center gap-1.5 text-cyan-200"><i className="size-2 rounded-full bg-cyan-300" /> Tạo mới</span><span className="flex items-center gap-1.5 text-emerald-200"><i className="size-2 rounded-full bg-emerald-300" /> Xử lý</span></div></div><div className="mt-4"><TrendChart points={data.trend} /></div></div>
          <div className="tech-panel rounded-2xl p-5 md:p-6"><div className="mb-5"><div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Backlog Aging</div><h2 className="mt-2 text-lg font-semibold text-white">Tuổi ISSUE đang mở</h2></div><div className="space-y-5">{data.backlogAging.map((row) => <div key={row.code}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">{row.label}</span><span className="font-semibold text-white">{row.value} <small className="font-normal text-slate-600">({row.percent}%)</small></span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300/65 to-violet-300/60" style={{ width: pct(row.percent) }} /></div></div>)}</div></div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2"><RiskTable title="Top Module rủi ro" rows={data.topModules} kind="module" /><RiskTable title="Top Phòng ban rủi ro" rows={data.topDepartments} kind="department" /></section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[.72fr_1.28fr]">
          <div className="tech-panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Risk Signals</div><h3 className="mt-1.5 text-sm font-semibold text-white">Cảnh báo cần chú ý</h3></div><ShieldAlert className="size-4 text-rose-300/65" /></div><div className="space-y-2">{riskSignals.map(([label,value,href,tone]) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-3 hover:bg-white/[0.03]"><span className={`size-2 rounded-full ${tone === "rose" ? "bg-rose-400" : tone === "amber" ? "bg-amber-300" : "bg-cyan-300"}`} /><span className="text-xs text-slate-400">{label}</span><span className="ml-auto text-sm font-semibold text-white">{number(value)}</span><ArrowRight className="size-3 text-slate-700" /></Link>)}</div></div>
          <div className="tech-panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">Team Load</div><h3 className="mt-1.5 text-sm font-semibold text-white">Tải công việc & rủi ro thành viên</h3></div><UsersRound className="size-4 text-cyan-300/65" /></div><div className="grid grid-cols-1 gap-2 md:grid-cols-2">{data.members.length ? data.members.map((row) => <Link key={row.id} href={`/issues?assigneeId=${encodeURIComponent(row.id)}`} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 hover:bg-white/[0.03]"><div className="flex justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-medium text-slate-300">{row.name}</div><div className="mt-1 truncate text-[9px] text-slate-600">{row.email || "Chưa có email đăng nhập"}</div></div><span className={row.riskScore >= 60 ? "text-rose-200" : row.riskScore >= 35 ? "text-amber-200" : "text-emerald-200"}>{row.riskScore}</span></div><div className="mt-3 grid grid-cols-4 gap-1 text-[9px] text-slate-600"><span>{row.total} total</span><span>{row.open} mở</span><span>{row.overdue} hạn</span><span>{row.highPriority} A/B</span></div></Link>) : <div className="text-xs text-slate-600">Chưa có dữ liệu phân công.</div>}</div></div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {([ ["Trạng thái ISSUE", data.statusDistribution], ["Phân bổ ưu tiên", data.priorityDistribution] ] as const).map(([title, rows]) => <div key={title} className="tech-panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">{title}</h3><BarChart3 className="size-4 text-violet-300/60" /></div><div className="space-y-3">{rows.slice(0,8).map((row) => <div key={row.code}><div className="mb-1.5 flex justify-between text-[10px]"><span className="text-slate-400">{row.label}</span><span className="text-slate-300">{row.value} • {row.percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-violet-300/55" style={{ width: pct(row.percent) }} /></div></div>)}</div></div>)}
        </section>

        <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-slate-700"><span>Source: {data.source === "database" ? "Supabase RPC" : "Demo"}</span><span>•</span><span>Project: {data.projectCode}</span><span>•</span><span>Range: {data.range.from || "ALL"} → {data.range.to}</span><span>•</span><span>Updated: {new Date(data.generatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></div>
      </div> : null}
    </>
  );
}
