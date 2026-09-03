"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Download,
  Edit3,
  Flag,
  Gauge,
  Layers3,
  LoaderCircle,
  Map,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import { MasterPlanModal, MilestoneModal, StageModal } from "@/components/planning/plan-modals";
import { PlanTimeline } from "@/components/planning/plan-timeline";
import { parseDateOnly } from "@/lib/planning/schedule";
import type {
  PlanningMutationResponse,
  ProjectMilestone,
  ProjectPlanApiResponse,
  ProjectPlanData,
  ProjectPlanStage,
} from "@/lib/planning/types";
import { cn } from "@/lib/utils";

type ViewMode = "overview" | "timeline" | "stages" | "milestones";

const planStatusMeta = {
  draft: { label: "Bản nháp", tone: "border-slate-300/15 bg-slate-300/[0.05] text-slate-300" },
  active: { label: "Đang thực hiện", tone: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200" },
  on_hold: { label: "Tạm dừng", tone: "border-amber-300/20 bg-amber-300/[0.07] text-amber-200" },
  completed: { label: "Hoàn tất", tone: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200" },
} as const;

const stageStatusMeta = {
  not_started: { label: "Chưa bắt đầu", dot: "bg-slate-500", tone: "border-white/[0.08] bg-white/[0.025] text-slate-400" },
  in_progress: { label: "Đang thực hiện", dot: "bg-cyan-300", tone: "border-cyan-300/16 bg-cyan-300/[0.06] text-cyan-200" },
  blocked: { label: "Bị chặn", dot: "bg-rose-400", tone: "border-rose-300/16 bg-rose-300/[0.06] text-rose-200" },
  completed: { label: "Hoàn tất", dot: "bg-emerald-400", tone: "border-emerald-300/16 bg-emerald-300/[0.06] text-emerald-200" },
} as const;

const milestoneStatusMeta = {
  pending: { label: "Chờ thực hiện", tone: "border-white/[0.08] bg-white/[0.025] text-slate-400", icon: Clock3 },
  at_risk: { label: "Có rủi ro", tone: "border-amber-300/18 bg-amber-300/[0.06] text-amber-200", icon: AlertTriangle },
  completed: { label: "Hoàn tất", tone: "border-emerald-300/18 bg-emerald-300/[0.06] text-emerald-200", icon: CheckCircle2 },
  missed: { label: "Không đạt", tone: "border-rose-300/18 bg-rose-300/[0.06] text-rose-200", icon: AlertTriangle },
} as const;

const healthMeta = {
  no_plan: { label: "CHƯA THIẾT LẬP", tone: "border-white/[0.08] bg-white/[0.025] text-slate-400", note: "Cần khởi tạo Master Plan" },
  on_track: { label: "ON TRACK", tone: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200", note: "Tiến độ trong giới hạn kế hoạch" },
  at_risk: { label: "AT RISK", tone: "border-amber-300/20 bg-amber-300/[0.07] text-amber-200", note: "Có stage hoặc milestone cần chú ý" },
  late: { label: "LATE", tone: "border-rose-300/20 bg-rose-300/[0.07] text-rose-200", note: "Forecast đang vượt ngày mục tiêu" },
  completed: { label: "COMPLETED", tone: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200", note: "Master Plan đã hoàn tất" },
} as const;

function displayDate(value: string | null | undefined, short = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", short ? { day: "2-digit", month: "2-digit", timeZone: "UTC" } : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(parseDateOnly(value));
}

function number(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportPlan(data: ProjectPlanData) {
  const rows: unknown[][] = [
    ["ASC WORKING", "Master Plan & Project Stages"],
    ["Project", data.projectCode],
    ["Tên Master Plan", data.masterPlan?.title ?? ""],
    ["Ngày bắt đầu", data.masterPlan?.startDate ?? ""],
    ["Ngày mục tiêu", data.masterPlan?.targetEndDate ?? ""],
    ["Forecast", data.summary.forecastEndDate ?? ""],
    ["Tiến độ tổng", `${data.summary.overallProgress}%`],
    [],
    ["PROJECT STAGES"],
    ["Thứ tự", "Mã", "Tên stage", "Số ngày", "Bắt đầu", "Kết thúc", "Trạng thái", "Tiến độ", "Phụ trách", "Mô tả"],
    ...data.stages.map((stage, index) => [index + 1, stage.code, stage.name, stage.durationDays, stage.startDate ?? "", stage.endDate ?? "", stageStatusMeta[stage.status].label, `${stage.progress}%`, stage.ownerName ?? "", stage.description ?? ""]),
    [],
    ["MILESTONES"],
    ["Tên milestone", "Ngày", "Trạng thái", "Stage", "Phụ trách", "Mô tả"],
    ...data.milestones.map((milestone) => [milestone.title, milestone.dueDate, milestoneStatusMeta[milestone.status].label, milestone.stageName ?? "", milestone.ownerName ?? "", milestone.description ?? ""]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ASC-WORKING-${data.projectCode}-Master-Plan.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, note, icon: Icon, tone = "cyan" }: { label: string; value: string; note: string; icon: LucideIcon; tone?: "cyan" | "emerald" | "amber" | "rose" | "violet" }) {
  const iconTone = tone === "emerald" ? "text-emerald-300/75" : tone === "amber" ? "text-amber-300/75" : tone === "rose" ? "text-rose-300/75" : tone === "violet" ? "text-violet-300/75" : "text-cyan-300/75";
  return <div className="tech-panel rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</div><div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div><div className="mt-1 text-[9px] text-slate-600">{note}</div></div><Icon className={cn("size-5", iconTone)} /></div></div>;
}

function StageRoadmap({ stages }: { stages: ProjectPlanStage[] }) {
  if (!stages.length) return <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có Project Stage.</div>;
  return (
    <div className="space-y-0">
      {stages.map((stage, index) => {
        const meta = stageStatusMeta[stage.status];
        return <div key={stage.id} className="relative flex gap-4 pb-5 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center"><span className="z-10 mt-1 size-3 rounded-full border-2 border-[#14243a]" style={{ backgroundColor: stage.color, boxShadow: `0 0 12px ${stage.color}55` }} />{index < stages.length - 1 ? <span className="absolute bottom-0 top-3 w-px bg-white/[0.08]" /> : null}</div><div className="min-w-0 flex-1 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-300">{stage.name}</span><span className="text-[9px] text-slate-600">{stage.code}</span></div><div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-600"><span>{stage.durationDays} ngày</span><span>{displayDate(stage.startDate, true)} → {displayDate(stage.endDate, true)}</span><span>{stage.ownerName || "Chưa phân công"}</span></div></div><span className={cn("shrink-0 rounded-lg border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em]", meta.tone)}>{meta.label}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full" style={{ width: `${stage.progress}%`, backgroundColor: stage.color }} /></div></div></div>;
      })}
    </div>
  );
}

export function PlanWorkspace() {
  const { selectedProject } = useProject();
  const [view, setView] = useState<ViewMode>("overview");
  const [data, setData] = useState<ProjectPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState("");
  const [masterOpen, setMasterOpen] = useState(false);
  const [stageEditor, setStageEditor] = useState<ProjectPlanStage | null | undefined>(undefined);
  const [milestoneEditor, setMilestoneEditor] = useState<ProjectMilestone | null | undefined>(undefined);

  const loadPlan = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/plan?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body = (await response.json()) as ProjectPlanApiResponse;
      if (!body.ok) throw new Error(body.message);
      setData(body.data);
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Không tải được Master Plan.");
    } finally { setLoading(false); }
  }, [selectedProject.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setView("overview"); setNotice(""); setMasterOpen(false); setStageEditor(undefined); setMilestoneEditor(undefined);
      void loadPlan();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadPlan]);

  const suggestedStageCode = useMemo(() => {
    const used = new Set((data?.stages ?? []).map((stage) => stage.code));
    let index = 1;
    while (used.has(`STAGE-${String(index).padStart(2, "0")}`)) index += 1;
    return `STAGE-${String(index).padStart(2, "0")}`;
  }, [data?.stages]);

  const currentStage = data?.stages.find((stage) => stage.status === "blocked") ?? data?.stages.find((stage) => stage.status === "in_progress") ?? data?.stages.find((stage) => stage.status === "not_started") ?? null;
  const health = data ? healthMeta[data.summary.health] : healthMeta.no_plan;

  async function mutation(url: string, options: RequestInit, key: string) {
    setAction(key); setError(""); setNotice("");
    try {
      const response = await fetch(url, options);
      const body = (await response.json()) as PlanningMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setNotice(body.message);
      await loadPlan();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thực hiện được thao tác.");
    } finally { setAction(""); }
  }

  function saved(message: string) {
    setMasterOpen(false); setStageEditor(undefined); setMilestoneEditor(undefined); setNotice(message); void loadPlan();
  }

  async function recalculate() {
    await mutation("/api/plan/recalculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id }) }, "recalculate");
  }

  async function deleteStage(stage: ProjectPlanStage) {
    if (!window.confirm(`Xóa stage “${stage.name}”? Milestone liên quan vẫn được giữ lại nhưng sẽ bỏ liên kết stage.`)) return;
    await mutation(`/api/plan/stages/${stage.id}?projectId=${encodeURIComponent(selectedProject.id)}`, { method: "DELETE" }, `delete-stage-${stage.id}`);
  }

  async function deleteMilestone(milestone: ProjectMilestone) {
    if (!window.confirm(`Xóa milestone “${milestone.title}”?`)) return;
    await mutation(`/api/plan/milestones/${milestone.id}?projectId=${encodeURIComponent(selectedProject.id)}`, { method: "DELETE" }, `delete-milestone-${milestone.id}`);
  }

  async function moveStage(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.stages.length) return;
    const ordered = data.stages.map((stage) => stage.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await mutation("/api/plan/stages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, orderedIds: ordered }) }, "reorder");
  }

  async function completeMilestone(milestone: ProjectMilestone) {
    await mutation(`/api/plan/milestones/${milestone.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: selectedProject.id, title: milestone.title, description: milestone.description, dueDate: milestone.dueDate, status: "completed", stageId: milestone.stageId, ownerId: milestone.ownerId, sortOrder: milestone.sortOrder }),
    }, `complete-milestone-${milestone.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Planning & Delivery Control"
        title="Master Plan"
        description={`Lập kế hoạch tổng thể, Project Stages, timeline và milestone theo riêng Project ${selectedProject.code}.`}
        actions={<div className="flex flex-wrap items-center gap-2">
          {data ? <button type="button" onClick={() => exportPlan(data)} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-white"><Download className="size-3.5" /> Export</button> : null}
          <button type="button" onClick={() => void loadPlan()} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Làm mới"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>
          {data?.canEdit && data.masterPlan ? <button type="button" disabled={Boolean(action)} onClick={() => void recalculate()} className="flex h-10 items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.055] px-3 text-[10px] text-violet-200 hover:bg-violet-300/[0.09] disabled:opacity-40">{action === "recalculate" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Route className="size-3.5" />} Tính lại lịch</button> : null}
          {data?.canEdit ? <button type="button" onClick={() => setMasterOpen(true)} className="flex h-10 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] px-3 text-[10px] font-medium text-cyan-100 hover:bg-cyan-300/[0.14]"><Target className="size-3.5" /> {data.masterPlan ? "Chỉnh Master Plan" : "Tạo Master Plan"}</button> : null}
        </div>}
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-3 text-xs text-emerald-200">{notice}</div> : null}
      {data?.source === "demo" ? <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-4 py-3 text-xs leading-5 text-amber-100/80"><Sparkles className="mt-0.5 size-4 shrink-0" /><span>Demo Mode đang hiển thị một kế hoạch mẫu hoàn chỉnh. Kết nối Supabase và chạy migration V1.6.0 để tạo dữ liệu thật.</span></div> : null}

      {loading ? <div className="grid min-h-[460px] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-cyan-300" /><div className="mt-3 text-xs text-slate-600">Đang tải Master Plan...</div></div></div> : null}

      {!loading && data ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-2 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-1 overflow-x-auto">
              {([
                ["overview", "Tổng quan", Map, null],
                ["timeline", "Timeline", CalendarDays, null],
                ["stages", "Project Stages", Layers3, data.stages.length],
                ["milestones", "Milestones", Flag, data.milestones.length],
              ] as const).map(([value, label, Icon, count]) => <button key={value} type="button" onClick={() => setView(value)} className={cn("flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[10px] transition", view === value ? "border-cyan-300/16 bg-cyan-300/[0.075] text-cyan-100" : "border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300")}><Icon className="size-3.5" /> {label}{count !== null ? <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[8px]">{count}</span> : null}</button>)}
            </div>
            <div className="flex items-center gap-2 px-2 text-[9px] uppercase tracking-[0.12em] text-slate-600"><span className={cn("rounded-lg border px-2 py-1", health.tone)}>{health.label}</span><span>{data.canEdit ? "Có quyền chỉnh sửa" : "Chỉ xem"}</span></div>
          </div>

          {view === "overview" ? (
            <>
              {!data.masterPlan ? (
                <div className="tech-panel grid min-h-[360px] place-items-center rounded-2xl px-6 text-center"><div><Target className="mx-auto size-10 text-cyan-300/45" /><h2 className="mt-5 text-lg font-semibold text-white">Project chưa có Master Plan</h2><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">Khởi tạo ngày bắt đầu, ngày mục tiêu và cách tính thời lượng. Sau đó thêm Project Stages; hệ thống sẽ tự dựng timeline tuần tự.</p>{data.canEdit ? <button type="button" onClick={() => setMasterOpen(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] px-4 text-xs text-cyan-100"><Plus className="size-4" /> Khởi tạo Master Plan</button> : null}</div></div>
              ) : (
                <>
                  <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <MetricCard label="Tiến độ tổng" value={`${data.summary.overallProgress}%`} note={`${data.summary.completedStages}/${data.summary.stageCount} stage hoàn tất`} icon={Gauge} tone="cyan" />
                    <MetricCard label="Tổng thời lượng" value={`${number(data.summary.totalDurationDays)} ngày`} note={data.masterPlan.scheduleMode === "business_days" ? "Không tính cuối tuần" : "Tính theo ngày lịch"} icon={CalendarClock} tone="violet" />
                    <MetricCard label="Forecast kết thúc" value={displayDate(data.summary.forecastEndDate, true)} note={data.summary.varianceDays === null ? "Chưa có target để so sánh" : data.summary.varianceDays > 0 ? `Trễ ${data.summary.varianceDays} ngày so với target` : data.summary.varianceDays < 0 ? `Sớm ${Math.abs(data.summary.varianceDays)} ngày` : "Đúng ngày mục tiêu"} icon={CalendarCheck} tone={data.summary.varianceDays !== null && data.summary.varianceDays > 0 ? "rose" : "emerald"} />
                    <MetricCard label="Milestone" value={`${data.summary.completedMilestones}/${data.summary.milestoneCount}`} note={data.summary.overdueMilestones ? `${data.summary.overdueMilestones} milestone quá hạn` : "Không có milestone quá hạn"} icon={Flag} tone={data.summary.overdueMilestones ? "rose" : "amber"} />
                  </section>

                  <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_.75fr]">
                    <div className="tech-panel rounded-2xl p-5 md:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65">Master Plan</div><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{data.masterPlan.title}</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">{data.masterPlan.objective || "Chưa khai báo mục tiêu tổng thể."}</p></div><span className={cn("shrink-0 rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em]", planStatusMeta[data.masterPlan.status].tone)}>{planStatusMeta[data.masterPlan.status].label}</span></div>
                      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
                        ["Bắt đầu", displayDate(data.masterPlan.startDate), CalendarDays],
                        ["Target", displayDate(data.masterPlan.targetEndDate), Target],
                        ["Forecast", displayDate(data.summary.forecastEndDate), Route],
                        ["Cách tính", data.masterPlan.scheduleMode === "business_days" ? "Ngày làm việc" : "Ngày lịch", Clock3],
                      ].map(([label, value, Icon]) => { const C = Icon as LucideIcon; return <div key={String(label)} className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"><C className="size-4 text-cyan-300/60" /><div className="mt-3 text-[9px] uppercase tracking-[0.12em] text-slate-600">{String(label)}</div><div className="mt-1 text-xs font-medium text-slate-300">{String(value)}</div></div>; })}</div>
                      <div className="mt-6"><div className="mb-2 flex items-center justify-between text-[10px]"><span className="text-slate-500">Tiến độ có trọng số theo thời lượng stage</span><span className="font-semibold text-cyan-200">{data.summary.overallProgress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300/80 via-violet-300/75 to-emerald-300/75" style={{ width: `${data.summary.overallProgress}%` }} /></div></div>
                      {data.masterPlan.notes ? <div className="mt-5 rounded-xl border border-white/[0.055] bg-black/10 p-4"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">Ghi chú điều hành</div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{data.masterPlan.notes}</p></div> : null}
                    </div>

                    <div className="space-y-4">
                      <div className="tech-panel rounded-2xl p-5"><div className="flex items-start justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Schedule Health</div><div className="mt-2 text-lg font-semibold text-white">{health.label}</div><div className="mt-1 text-[10px] text-slate-500">{health.note}</div></div><div className={cn("grid size-11 place-items-center rounded-xl border", health.tone)}>{data.summary.health === "on_track" || data.summary.health === "completed" ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}</div></div></div>
                      <div className="tech-panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Stage hiện tại</div><div className="mt-2 text-sm font-semibold text-white">{currentStage?.name ?? "Không có stage đang mở"}</div></div><CircleDot className="size-5 text-cyan-300/65" /></div>{currentStage ? <><div className="mt-3 flex flex-wrap gap-2 text-[9px] text-slate-600"><span>{currentStage.code}</span><span>•</span><span>{currentStage.ownerName || "Chưa phân công"}</span><span>•</span><span>{currentStage.progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full" style={{ width: `${currentStage.progress}%`, backgroundColor: currentStage.color }} /></div></> : null}</div>
                      <div className="tech-panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Milestone tiếp theo</div><div className="mt-2 text-sm font-semibold text-white">{data.summary.nextMilestone?.title ?? "Chưa có milestone mở"}</div></div><Flag className="size-5 text-amber-300/65" /></div>{data.summary.nextMilestone ? <div className="mt-3 text-[10px] text-slate-500">{displayDate(data.summary.nextMilestone.dueDate)} • {data.summary.nextMilestone.ownerName || "Chưa phân công"}</div> : null}</div>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_.85fr]">
                    <div className="tech-panel rounded-2xl p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Delivery Roadmap</div><h3 className="mt-1.5 text-sm font-semibold text-white">Luồng Project Stages</h3></div><button type="button" onClick={() => setView("stages")} className="text-[10px] text-cyan-300/70 hover:text-cyan-200">Quản lý stage →</button></div><StageRoadmap stages={data.stages} /></div>
                    <div className="tech-panel rounded-2xl p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Upcoming Milestones</div><h3 className="mt-1.5 text-sm font-semibold text-white">Mốc sắp tới</h3></div><button type="button" onClick={() => setView("milestones")} className="text-[10px] text-amber-300/70 hover:text-amber-200">Xem tất cả →</button></div><div className="space-y-2.5">{data.milestones.filter((item) => item.status !== "completed").slice(0, 6).map((milestone) => { const meta = milestoneStatusMeta[milestone.status]; const Icon = meta.icon; return <div key={milestone.id} className="flex items-start gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", meta.tone)}><Icon className="size-3.5" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-300">{milestone.title}</div><div className="mt-1 text-[9px] text-slate-600">{displayDate(milestone.dueDate)} • {milestone.stageName || "Milestone độc lập"}</div></div></div>; })}{!data.milestones.some((item) => item.status !== "completed") ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có milestone đang mở.</div> : null}</div></div>
                  </section>
                </>
              )}
            </>
          ) : null}

          {view === "timeline" ? <PlanTimeline masterPlan={data.masterPlan} stages={data.stages} milestones={data.milestones} /> : null}

          {view === "stages" ? (
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 md:flex-row md:items-center md:justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Project Stages</div><h2 className="mt-1.5 text-sm font-semibold text-white">Danh mục giai đoạn & số ngày</h2><p className="mt-1 text-[10px] text-slate-600">Thứ tự stage quyết định cách hệ thống nối lịch tự động.</p></div>{data.canEdit ? <button type="button" onClick={() => setStageEditor(null)} className="flex h-9 items-center gap-2 rounded-xl border border-cyan-300/18 bg-cyan-300/[0.075] px-3 text-[10px] text-cyan-100"><Plus className="size-3.5" /> Thêm stage</button> : null}</div>
              {data.stages.length ? <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[1080px] text-left"><thead className="border-b border-white/[0.06] bg-black/10 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600"><tr><th className="w-24 px-4 py-3">Thứ tự</th><th className="px-4 py-3">Stage</th><th className="w-40 px-4 py-3">Phụ trách</th><th className="w-24 px-4 py-3">Số ngày</th><th className="w-44 px-4 py-3">Lịch</th><th className="w-48 px-4 py-3">Tiến độ</th><th className="w-28 px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{data.stages.map((stage, index) => { const meta = stageStatusMeta[stage.status]; return <tr key={stage.id} className="border-b border-white/[0.045] hover:bg-white/[0.018]"><td className="px-4 py-4"><div className="flex items-center gap-1"><span className="mr-1 w-5 text-center text-[10px] font-semibold text-slate-600">{index + 1}</span>{data.canEdit ? <><button type="button" disabled={index === 0 || Boolean(action)} onClick={() => void moveStage(index, -1)} className="grid size-7 place-items-center rounded-lg border border-white/[0.06] text-slate-600 hover:text-cyan-200 disabled:opacity-25"><ArrowUp className="size-3" /></button><button type="button" disabled={index === data.stages.length - 1 || Boolean(action)} onClick={() => void moveStage(index, 1)} className="grid size-7 place-items-center rounded-lg border border-white/[0.06] text-slate-600 hover:text-cyan-200 disabled:opacity-25"><ArrowDown className="size-3" /></button></> : null}</div></td><td className="px-4 py-4"><div className="flex items-start gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color, boxShadow: `0 0 12px ${stage.color}55` }} /><div><div className="text-xs font-medium text-slate-300">{stage.name}</div><div className="mt-1 text-[9px] text-slate-600">{stage.code}{stage.description ? ` • ${stage.description}` : ""}</div></div></div></td><td className="px-4 py-4"><div className="flex items-center gap-2 text-[10px] text-slate-500"><UserRound className="size-3.5" /> <span className="truncate">{stage.ownerName || "Chưa phân công"}</span></div></td><td className="px-4 py-4"><span className="text-sm font-semibold text-white">{stage.durationDays}</span><span className="ml-1 text-[9px] text-slate-600">ngày</span></td><td className="px-4 py-4"><div className="text-[10px] text-slate-400">{displayDate(stage.startDate, true)} → {displayDate(stage.endDate, true)}</div></td><td className="px-4 py-4"><div className="mb-2 flex items-center justify-between gap-2"><span className={cn("rounded-md border px-2 py-1 text-[8px]", meta.tone)}>{meta.label}</span><span className="text-[9px] font-semibold text-slate-400">{stage.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full" style={{ width: `${stage.progress}%`, backgroundColor: stage.color }} /></div></td><td className="px-4 py-4"><div className="flex justify-end gap-1.5">{data.canEdit ? <><button type="button" onClick={() => setStageEditor(stage)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 hover:text-cyan-200" aria-label={`Sửa ${stage.name}`}><Edit3 className="size-3.5" /></button><button type="button" disabled={action === `delete-stage-${stage.id}`} onClick={() => void deleteStage(stage)} className="grid size-8 place-items-center rounded-lg border border-rose-300/10 text-slate-600 hover:bg-rose-300/[0.05] hover:text-rose-200" aria-label={`Xóa ${stage.name}`}>{action === `delete-stage-${stage.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></> : <span className="text-[9px] text-slate-700">Read only</span>}</div></td></tr>; })}</tbody></table></div> : <div className="grid min-h-72 place-items-center px-6 text-center"><div><Layers3 className="mx-auto size-7 text-slate-700" /><div className="mt-3 text-sm font-medium text-slate-300">Chưa có Project Stage</div><div className="mt-1 text-xs text-slate-600">Thêm các giai đoạn để xây dựng timeline.</div>{data.canEdit ? <button type="button" onClick={() => setStageEditor(null)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/18 bg-cyan-300/[0.07] px-3 text-[10px] text-cyan-100"><Plus className="size-3.5" /> Thêm stage đầu tiên</button> : null}</div></div>}
            </div>
          ) : null}

          {view === "milestones" ? (
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 md:flex-row md:items-center md:justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Milestones</div><h2 className="mt-1.5 text-sm font-semibold text-white">Mốc bàn giao & phê duyệt</h2><p className="mt-1 text-[10px] text-slate-600">Theo dõi các quyết định và đầu ra quan trọng của dự án.</p></div>{data.canEdit ? <button type="button" onClick={() => setMilestoneEditor(null)} className="flex h-9 items-center gap-2 rounded-xl border border-amber-300/18 bg-amber-300/[0.06] px-3 text-[10px] text-amber-100"><Plus className="size-3.5" /> Thêm milestone</button> : null}</div>
              {data.milestones.length ? <div>{data.milestones.map((milestone) => { const meta = milestoneStatusMeta[milestone.status]; const Icon = meta.icon; const overdue = milestone.status !== "completed" && milestone.dueDate < new Date().toISOString().slice(0, 10); return <div key={milestone.id} className="flex flex-col gap-4 border-b border-white/[0.045] px-4 py-4 hover:bg-white/[0.018] md:flex-row md:items-center"><div className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", overdue ? "border-rose-300/18 bg-rose-300/[0.06] text-rose-200" : meta.tone)}><Icon className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-300">{milestone.title}</span>{overdue ? <span className="rounded-md border border-rose-300/15 bg-rose-300/[0.05] px-2 py-1 text-[8px] font-semibold uppercase text-rose-200">Quá hạn</span> : <span className={cn("rounded-md border px-2 py-1 text-[8px]", meta.tone)}>{meta.label}</span>}</div>{milestone.description ? <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600">{milestone.description}</div> : null}<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-600"><span className="flex items-center gap-1.5"><CalendarDays className="size-3" /> {displayDate(milestone.dueDate)}</span><span className="flex items-center gap-1.5"><Layers3 className="size-3" /> {milestone.stageName || "Milestone độc lập"}</span><span className="flex items-center gap-1.5"><UserRound className="size-3" /> {milestone.ownerName || "Chưa phân công"}</span></div></div>{data.canEdit ? <div className="flex shrink-0 gap-2">{milestone.status !== "completed" ? <button type="button" disabled={action === `complete-milestone-${milestone.id}`} onClick={() => void completeMilestone(milestone)} className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300/12 bg-emerald-300/[0.04] px-2.5 text-[9px] text-emerald-200 hover:bg-emerald-300/[0.08]">{action === `complete-milestone-${milestone.id}` ? <LoaderCircle className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} Hoàn tất</button> : null}<button type="button" onClick={() => setMilestoneEditor(milestone)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 hover:text-cyan-200"><Edit3 className="size-3.5" /></button><button type="button" disabled={action === `delete-milestone-${milestone.id}`} onClick={() => void deleteMilestone(milestone)} className="grid size-8 place-items-center rounded-lg border border-rose-300/10 text-slate-600 hover:text-rose-200">{action === `delete-milestone-${milestone.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></div> : null}</div>; })}</div> : <div className="grid min-h-72 place-items-center px-6 text-center"><div><Flag className="mx-auto size-7 text-slate-700" /><div className="mt-3 text-sm font-medium text-slate-300">Chưa có Milestone</div><div className="mt-1 text-xs text-slate-600">Thêm các mốc bàn giao, phê duyệt hoặc Go-live quan trọng.</div>{data.canEdit ? <button type="button" onClick={() => setMilestoneEditor(null)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-amber-300/18 bg-amber-300/[0.06] px-3 text-[10px] text-amber-100"><Plus className="size-3.5" /> Thêm milestone đầu tiên</button> : null}</div></div>}
            </div>
          ) : null}
        </div>
      ) : null}

      {masterOpen && data ? <MasterPlanModal projectId={selectedProject.id} projectName={selectedProject.code} plan={data.masterPlan} onClose={() => setMasterOpen(false)} onSaved={saved} /> : null}
      {stageEditor !== undefined && data ? <StageModal projectId={selectedProject.id} stage={stageEditor} suggestedCode={suggestedStageCode} people={data.people} onClose={() => setStageEditor(undefined)} onSaved={saved} /> : null}
      {milestoneEditor !== undefined && data ? <MilestoneModal projectId={selectedProject.id} milestone={milestoneEditor} defaultDate={data.masterPlan?.targetEndDate ?? data.summary.forecastEndDate ?? new Date().toISOString().slice(0, 10)} stages={data.stages} people={data.people} onClose={() => setMilestoneEditor(undefined)} onSaved={saved} /> : null}
    </>
  );
}
