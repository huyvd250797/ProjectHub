"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  LoaderCircle,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { ExecutiveReportApiResponse, ExecutiveReportData, ReportPeriodType, ReportSnapshotMutationResponse } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

const periodOptions = [
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
  { value: "all", label: "Toàn bộ" },
  { value: "custom", label: "Tùy chọn" },
];

function fmt(value: number) { return new Intl.NumberFormat("vi-VN").format(value); }
function money(value: number | null) { return value == null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ₫`; }
function date(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("vi-VN").format(parsed);
}
function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

const healthMeta = {
  healthy: { label: "HEALTHY", tone: "text-emerald-200", box: "border-emerald-300/20 bg-emerald-300/[0.06]" },
  watch: { label: "WATCH", tone: "text-amber-200", box: "border-amber-300/20 bg-amber-300/[0.06]" },
  critical: { label: "CRITICAL", tone: "text-rose-200", box: "border-rose-300/20 bg-rose-300/[0.06]" },
  no_data: { label: "NO DATA", tone: "text-slate-400", box: "border-white/[0.08] bg-white/[0.03]" },
} as const;

function Delta({ current, previous, inverse = false, suffix = "" }: { current: number; previous: number; inverse?: boolean; suffix?: string }) {
  const delta = current - previous;
  if (!delta) return <span className="text-slate-600">0{suffix}</span>;
  const good = inverse ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("inline-flex items-center gap-1", good ? "text-emerald-300" : "text-rose-300")}><Icon className="size-3" />{delta > 0 ? "+" : ""}{delta}{suffix}</span>;
}

function MetricCard({ label, value, note, icon: Icon, href }: { label: string; value: string; note: string; icon: typeof Gauge; href?: string }) {
  const body = <div className="tech-panel tech-panel-hover h-full rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">{label}</div><div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div><div className="mt-2 text-[10px] text-slate-600">{note}</div></div><div className="grid size-9 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05] text-cyan-200"><Icon className="size-4" /></div></div></div>;
  return href ? <Link href={href}>{body}</Link> : body;
}

function exportCsv(data: ExecutiveReportData, pmComment: string, nextPlan: string) {
  const rows: Array<Array<string | number>> = [
    ["ASC WORKING", "Executive Report & Project Summary"],
    ["Project", data.project.code], ["Tên dự án", data.project.name], ["Đơn vị", data.project.organizationName],
    ["Kỳ báo cáo", data.period.label], ["Health Score", data.health.score], ["Health", data.health.status],
    [], ["Chỉ số", "Giá trị"], ["Tổng ISSUE", data.summary.total], ["Đang mở", data.summary.open],
    ["Phát sinh trong kỳ", data.summary.createdInRange], ["Xử lý trong kỳ", data.summary.resolvedInRange],
    ["Quá hạn", data.summary.overdue], ["Priority A/B đang mở", data.summary.highPriorityOpen],
    ["Đã bàn giao", data.summary.handedOver], ["Tiến độ bàn giao", `${data.summary.handoverProgress}%`],
    [], ["Nhận xét PM", pmComment], ["Kế hoạch tiếp theo", nextPlan],
    [], ["Top Module rủi ro", "Open", "Overdue", "A/B", "Risk"],
    ...data.topModules.slice(0, 8).map((row) => [row.name, row.open, row.overdue, row.highPriority, row.riskScore]),
    [], ["Top Phòng ban rủi ro", "Open", "Overdue", "A/B", "Risk"],
    ...data.topDepartments.slice(0, 8).map((row) => [row.name, row.open, row.overdue, row.highPriority, row.riskScore]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ASC-WORKING-${data.project.code}-Executive-${data.period.to}.csv`; a.click(); URL.revokeObjectURL(url);
}

export function ExecutiveReport() {
  const { selectedProject } = useProject();
  const [period, setPeriod] = useState<ReportPeriodType>("week");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [pmComment, setPmComment] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [showMoney, setShowMoney] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("asc-working-show-project-money");
    if (saved !== null) setShowMoney(saved === "1");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setNotice("");
    const params = new URLSearchParams({ projectId: selectedProject.id, period });
    if (period === "custom") { params.set("from", from); params.set("to", to); }
    fetch(`/api/reports?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = (await response.json()) as ExecutiveReportApiResponse; if (!body.ok) throw new Error(body.message); return body.data; })
      .then((value) => {
        if (controller.signal.aborted) return;
        setData(value);
        const matching = value.snapshots.find((snapshot) => snapshot.periodType === value.period.type && snapshot.periodStart === value.period.from && snapshot.periodEnd === value.period.to);
        setPmComment(matching?.pmComment ?? "");
        setNextPlan(matching?.nextPlan ?? "");
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được báo cáo."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedProject.id, period, from, to, reloadKey]);

  const previous = data?.previousSnapshot;
  const riskSignals = useMemo(() => data ? [
    ["ISSUE quá hạn", data.summary.overdue, "/issues?overdue=1", "text-rose-200"],
    ["Priority A/B đang mở", data.summary.highPriorityOpen, "/issues?priority=A", "text-amber-200"],
    ["Thiếu Module", data.attention.missingModule, "/issues?missingModule=1", "text-amber-200"],
    ["Thiếu Phòng ban", data.attention.missingDepartment, "/issues?missingDepartment=1", "text-amber-200"],
    ["Thiếu phụ trách", data.attention.missingAssignee, "/issues?missingAssignee=1", "text-amber-200"],
    ["Gần Due Date", data.attention.nearDue, "/issues?nearDue=7", "text-cyan-200"],
  ] as const : [], [data]);

  async function saveSnapshot() {
    if (!data?.canSaveSnapshot) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: data.project.id, periodType: data.period.type, periodStart: data.period.from, periodEnd: data.period.to, title: `Executive Report ${data.period.label}`, pmComment: pmComment.trim() || null, nextPlan: nextPlan.trim() || null }),
      });
      const body = (await response.json()) as ReportSnapshotMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setNotice("Đã lưu snapshot báo cáo và nhận xét PM.");
      setReloadKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được snapshot."); }
    finally { setSaving(false); }
  }

  function toggleMoney() {
    setShowMoney((current) => {
      const next = !current;
      window.localStorage.setItem("asc-working-show-project-money", next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Executive Intelligence"
        title={`Executive Report • ${selectedProject.code}`}
        description="Báo cáo quản trị ngắn gọn theo kỳ: tiến độ, Health Score, ISSUE phát sinh/xử lý, rủi ro và kế hoạch tiếp theo."
        actions={<div className="flex flex-wrap items-center gap-2 print:hidden"><button type="button" onClick={() => setReloadKey((v) => v + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>{data ? <><button type="button" onClick={() => exportCsv(data, pmComment, nextPlan)} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-400 hover:text-white"><Download className="size-3.5" /> CSV</button><button type="button" onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-400 hover:text-white"><Printer className="size-3.5" /> In / PDF</button></> : null}</div>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 print:hidden">
        <div className="w-[190px]"><div className="mb-1.5 text-[9px] uppercase tracking-[0.14em] text-slate-600">Kỳ báo cáo</div><ThemedSelect ariaLabel="Kỳ báo cáo" value={period} onChange={(value) => setPeriod(value as ReportPeriodType)} options={periodOptions} /></div>
        {period === "custom" ? <><label className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Từ ngày<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1.5 block h-10 rounded-xl border border-white/[0.07] bg-black/10 px-3 text-xs normal-case tracking-normal text-slate-300 outline-none" /></label><label className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Đến ngày<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 block h-10 rounded-xl border border-white/[0.07] bg-black/10 px-3 text-xs normal-case tracking-normal text-slate-300 outline-none" /></label></> : null}
        {data ? <div className="ml-auto text-right"><div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Kỳ đang xem</div><div className="mt-1 text-xs font-medium text-slate-300">{data.period.label}</div></div> : null}
      </div>

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-100">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-3 text-xs text-emerald-100">{notice}</div> : null}

      {loading && !data ? <div className="tech-panel grid min-h-[460px] place-items-center rounded-2xl"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-cyan-300" /><div className="mt-3 text-xs text-slate-400">Đang tổng hợp Executive Report...</div></div></div> : null}

      {data ? <div className="space-y-4" id="executive-report-print">
        <section className="tech-panel rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-300/60">Project Summary</div><h2 className="mt-2 text-xl font-semibold text-white">{data.project.name}</h2><div className="mt-1 text-xs text-slate-500">{data.project.organizationName} • {data.project.code}</div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-slate-500"><span>HĐ: <b className="font-medium text-slate-300">{data.project.contractNo || "—"}</b></span><span>Bắt đầu: <b className="font-medium text-slate-300">{date(data.project.startDate)}</b></span><span>Deadline: <b className="font-medium text-slate-300">{date(data.project.dueDate)}</b></span><span className="inline-flex items-center gap-2">Giá trị: <b className="font-medium text-slate-300">{showMoney ? money(data.project.contractValue) : "•••••••• ₫"}</b><button type="button" onClick={toggleMoney} className="print:hidden text-slate-600 hover:text-cyan-200" aria-label={showMoney ? "Ẩn số tiền dự án" : "Hiện số tiền dự án"}>{showMoney ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button></span></div></div>
            <div className={cn("min-w-[220px] rounded-2xl border p-4", healthMeta[data.health.status].box)}><div className="flex items-center justify-between"><div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Project Health</div><Gauge className={cn("size-4", healthMeta[data.health.status].tone)} /></div><div className="mt-3 flex items-end gap-3"><div className={cn("text-4xl font-semibold tracking-[-0.05em]", healthMeta[data.health.status].tone)}>{data.health.score}</div><div className={cn("mb-1 text-[10px] font-semibold", healthMeta[data.health.status].tone)}>{healthMeta[data.health.status].label}</div></div><div className="mt-3 text-[10px] text-slate-500">Tiến độ thời gian {data.schedule.timeProgress == null ? "—" : `${data.schedule.timeProgress}%`} • Còn {data.schedule.remainingDays == null ? "—" : `${data.schedule.remainingDays} ngày`}</div></div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Tổng ISSUE" value={fmt(data.summary.total)} note="Toàn project" icon={FileText} href="/issues" />
          <MetricCard label="Đang mở" value={fmt(data.summary.open)} note="Cần xử lý" icon={Clock3} />
          <MetricCard label="Phát sinh kỳ" value={fmt(data.summary.createdInRange)} note={data.period.label} icon={TrendingUp} />
          <MetricCard label="Xử lý kỳ" value={fmt(data.summary.resolvedInRange)} note={data.period.label} icon={CheckCircle2} />
          <MetricCard label="Quá hạn" value={fmt(data.summary.overdue)} note="Cần ưu tiên" icon={AlertTriangle} href="/issues?overdue=1" />
          <MetricCard label="A/B đang mở" value={fmt(data.summary.highPriorityOpen)} note="Priority cao" icon={Target} />
          <MetricCard label="Đã bàn giao" value={fmt(data.summary.handedOver)} note={`${data.summary.handoverProgress}%`} icon={ShieldCheck} />
          <MetricCard label="Tuổi TB" value={`${data.summary.avgAgeDays}d`} note={`Xử lý TB ${data.summary.avgResolutionDays}d`} icon={CalendarRange} />
        </section>

        {previous ? <section className="tech-panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Snapshot Comparison</div><h3 className="mt-1 text-sm font-semibold text-white">So với snapshot trước • {date(previous.periodEnd)}</h3></div><ClipboardCheck className="size-4 text-violet-300/70" /></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{[
          ["Health", data.health.score, previous.metrics.healthScore, false, ""], ["Đang mở", data.summary.open, previous.metrics.open, true, ""], ["Quá hạn", data.summary.overdue, previous.metrics.overdue, true, ""], ["A/B", data.summary.highPriorityOpen, previous.metrics.highPriorityOpen, true, ""], ["Bàn giao", data.summary.handoverProgress, previous.metrics.handoverProgress, false, "%"], ["Phát sinh", data.summary.createdInRange, previous.metrics.createdInRange, true, ""], ["Xử lý", data.summary.resolvedInRange, previous.metrics.resolvedInRange, false, ""],
        ].map(([label, current, old, inverse, suffix]) => <div key={String(label)} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{label}</div><div className="mt-2 flex items-end justify-between gap-2"><span className="text-lg font-semibold text-white">{current}{suffix}</span><span className="text-[10px]"><Delta current={Number(current)} previous={Number(old)} inverse={Boolean(inverse)} suffix={String(suffix)} /></span></div></div>)}</div></section> : null}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <div className="tech-panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Executive Attention</div><h3 className="mt-1 text-sm font-semibold text-white">Điểm cần follow</h3></div><AlertTriangle className="size-4 text-amber-300/70" /></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{riskSignals.map(([label, value, href, tone]) => <Link key={label} href={href} className="group flex items-center justify-between rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-3 hover:border-cyan-300/15"><span className="text-[10px] text-slate-400">{label}</span><span className={cn("flex items-center gap-2 text-sm font-semibold", tone)}>{value}<ArrowRight className="size-3 opacity-40 group-hover:opacity-100" /></span></Link>)}</div></div>
          <div className="tech-panel rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Team Capacity</div><h3 className="mt-1 text-sm font-semibold text-white">Thành viên cần chú ý</h3></div><UsersRound className="size-4 text-violet-300/70" /></div><div className="space-y-2">{data.members.slice(0, 6).map((row) => <Link href={`/issues?assigneeId=${encodeURIComponent(row.id)}`} key={row.id} className="flex items-center justify-between rounded-xl border border-white/[0.05] px-3 py-2.5 hover:bg-white/[0.025]"><div className="min-w-0"><div className="truncate text-xs text-slate-300">{row.name}</div><div className="mt-1 text-[9px] text-slate-600">{row.open} mở • {row.overdue} quá hạn • {row.highPriority} A/B</div></div><span className={row.riskScore >= 60 ? "text-rose-200" : row.riskScore >= 35 ? "text-amber-200" : "text-emerald-200"}>{row.riskScore}</span></Link>)}</div></div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">{[["Top Module rủi ro", data.topModules, "moduleId"], ["Top Phòng ban rủi ro", data.topDepartments, "departmentId"]] .map(([title, rows, filterKey]) => <div key={String(title)} className="tech-panel rounded-2xl p-5"><h3 className="text-sm font-semibold text-white">{String(title)}</h3><div className="mt-4 space-y-2">{(rows as ExecutiveReportData["topModules"]).slice(0, 6).map((row) => <Link href={`/issues?${String(filterKey)}=${encodeURIComponent(row.id)}`} key={row.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/[0.05] px-3 py-3 hover:bg-white/[0.025]"><div className="min-w-0"><div className="truncate text-xs text-slate-300">{row.name}</div><div className="mt-1 text-[9px] text-slate-600">{row.open} mở • {row.overdue} quá hạn • {row.highPriority} A/B</div></div><div className="text-sm font-semibold text-amber-200">{row.riskScore}</div></Link>)}</div></div>)}</section>

        <section className="tech-panel rounded-2xl p-5 print:break-inside-avoid"><div className="flex flex-col gap-5 xl:flex-row"><div className="flex-1"><div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">PM Comment</div><textarea value={pmComment} onChange={(e) => setPmComment(e.target.value)} disabled={!data.canSaveSnapshot} placeholder="Nhận xét tổng quan: tiến độ, vướng mắc, quyết định cần quản lý hỗ trợ..." className="mt-2 min-h-[130px] w-full resize-y rounded-xl border border-white/[0.07] bg-black/10 p-3 text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-700 disabled:opacity-70" /></div><div className="flex-1"><div className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Kế hoạch tiếp theo</div><textarea value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} disabled={!data.canSaveSnapshot} placeholder="Các đầu việc trọng tâm của kỳ tiếp theo..." className="mt-2 min-h-[130px] w-full resize-y rounded-xl border border-white/[0.07] bg-black/10 p-3 text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-700 disabled:opacity-70" /></div></div><div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">{data.canSaveSnapshot ? <button type="button" onClick={() => void saveSnapshot()} disabled={saving || !data.snapshotFeatureReady} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-[10px] font-semibold text-[#07111f] disabled:opacity-40">{saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Lưu Snapshot</button> : <span className="text-[10px] text-slate-600">Viewer/Member có thể xem báo cáo; chỉ MASTER/Admin/PM được lưu nhận xét snapshot.</span>}{!data.snapshotFeatureReady ? <span className="text-[10px] text-amber-200/70">Chạy migration V1.3.0 để bật Snapshot & PM Notes.</span> : null}</div></section>

        {data.snapshots.length ? <section className="tech-panel rounded-2xl p-5 print:hidden"><div className="mb-4 text-sm font-semibold text-white">Snapshot gần đây</div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data.snapshots.slice(0, 9).map((snapshot) => <div key={snapshot.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-medium text-slate-300">{snapshot.title || snapshot.reportKey}</span><span className="text-[9px] text-slate-600">{date(snapshot.periodEnd)}</span></div><div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-slate-600"><span>Health <b className="text-slate-300">{snapshot.metrics.healthScore}</b></span><span>Open <b className="text-slate-300">{snapshot.metrics.open}</b></span><span>Overdue <b className="text-slate-300">{snapshot.metrics.overdue}</b></span></div></div>)}</div></section> : null}

        <div className="flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.13em] text-slate-700"><span>Source: {data.source === "database" ? "Supabase" : "Demo"}</span><span>•</span><span>{data.period.label}</span><span>•</span><span>Generated {new Date(data.generatedAt).toLocaleString("vi-VN")}</span></div>
      </div> : null}
    </>
  );
}
