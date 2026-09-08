"use client";

import { AlertTriangle, CalendarRange, Camera, Diamond, GripVertical, LoaderCircle, Route, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { addScheduleDuration, countScheduleDays, diffCalendarDays, parseDateOnly } from "@/lib/planning/schedule";
import type { MasterPlan, PlanningMutationResponse, ProjectMilestone, ProjectPlanStage, ProjectPlanTask } from "@/lib/planning/types";
import { cn } from "@/lib/utils";

function displayDate(value: string | null | undefined, short = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", short ? { day: "2-digit", month: "2-digit", timeZone: "UTC" } : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(parseDateOnly(value));
}

function monthTicks(start: string, end: string) {
  const cursor = parseDateOnly(start);
  cursor.setUTCDate(1);
  const last = parseDateOnly(end);
  const ticks: Array<{ key: string; date: string; label: string }> = [];
  let guard = 0;
  while (cursor <= last && guard < 240) {
    const date = cursor.toISOString().slice(0, 10);
    ticks.push({ key: date, date: date < start ? start : date, label: new Intl.DateTimeFormat("vi-VN", { month: "short", year: "numeric", timeZone: "UTC" }).format(cursor) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    guard += 1;
  }
  return ticks;
}

function dateFromPointer(event: React.DragEvent<HTMLDivElement>, start: string, end: string) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const date = parseDateOnly(start);
  date.setUTCDate(date.getUTCDate() + Math.round(ratio * Math.max(0, diffCalendarDays(start, end))));
  return date.toISOString().slice(0, 10);
}

function rowPosition(start: string, end: string, date: string) {
  return Math.max(0, Math.min(100, (diffCalendarDays(start, date) / Math.max(1, diffCalendarDays(start, end))) * 100));
}

function rowWidth(start: string, end: string, from: string, to: string) {
  return Math.max(0.75, ((diffCalendarDays(from, to) + 1) / Math.max(1, diffCalendarDays(start, end) + 1)) * 100);
}

async function mutation(response: Response) {
  const body = (await response.json()) as PlanningMutationResponse;
  if (!body.ok) throw new Error(body.message);
  return body;
}

export function PlanTimeline({
  masterPlan,
  stages,
  milestones,
  tasks,
  canEdit,
  projectId,
  onChanged,
}: {
  masterPlan: MasterPlan | null;
  stages: ProjectPlanStage[];
  milestones: ProjectMilestone[];
  tasks: ProjectPlanTask[];
  canEdit: boolean;
  projectId: string;
  onChanged: (message: string) => void;
}) {
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const stageRows = useMemo(() => [...stages].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, "vi")), [stages]);
  const candidates = [masterPlan?.startDate, masterPlan?.targetEndDate, ...stageRows.flatMap((stage) => [stage.startDate, stage.endDate, stage.baselineStartDate, stage.baselineEndDate]), ...milestones.map((milestone) => milestone.dueDate), ...tasks.map((task) => task.dueDate)].filter((value): value is string => Boolean(value)).sort();

  if (!masterPlan || !stageRows.length || !candidates.length) {
    return <div className="tech-panel grid min-h-[360px] place-items-center rounded-2xl px-6 text-center"><div><CalendarRange className="mx-auto size-8 text-slate-700" /><div className="mt-4 text-sm font-semibold text-slate-300">Timeline Pro chưa sẵn sàng</div><div className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600">Thiết lập Master Plan và thêm stage có ngày bắt đầu/kết thúc để dựng Gantt chuyên nghiệp.</div></div></div>;
  }

  const start = candidates[0];
  const end = candidates.at(-1) as string;
  const totalDays = Math.max(1, diffCalendarDays(start, end) + 1);
  const trackWidth = Math.min(12_000, Math.max(1_180, totalDays * 8));
  const ticks = monthTicks(start, end);
  const today = new Date().toISOString().slice(0, 10);
  const todayVisible = today >= start && today <= end;
  const targetVisible = Boolean(masterPlan.targetEndDate && masterPlan.targetEndDate >= start && masterPlan.targetEndDate <= end);
  const criticalCount = stageRows.filter((stage) => stage.isCritical).length;
  const delayedCount = stageRows.filter((stage) => (stage.delayDays ?? 0) > 0 || (stage.endDate && stage.endDate < today && stage.status !== "completed")).length;

  async function snapshotBaseline() {
    setSaving("baseline"); setError("");
    try {
      const result = await mutation(await fetch("/api/plan/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, action: "snapshot_baseline" }) }));
      onChanged(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không chụp được baseline."); } finally { setSaving(""); }
  }

  async function dropItem(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!canEdit) return;
    const type = event.dataTransfer.getData("application/asc-timeline-type");
    const id = event.dataTransfer.getData("application/asc-timeline-id");
    if (!type || !id) return;
    const date = dateFromPointer(event, start, end);
    const stage = stageRows.find((item) => item.id === id);
    setSaving(`${type}-${id}`); setError("");
    try {
      const payload = type === "stage"
        ? { projectId, action: "move_stage", id, startDate: date, endDate: stage?.startDate && stage?.endDate ? addScheduleDuration(date, Math.max(1, countScheduleDays(stage.startDate, stage.endDate, masterPlan?.scheduleMode ?? "calendar_days")), masterPlan?.scheduleMode ?? "calendar_days") : date }
        : { projectId, action: "move_task", id, dueDate: date };
      const result = await mutation(await fetch("/api/plan/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
      onChanged(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không cập nhật được lịch."); } finally { setSaving(""); }
  }

  function beginDrag(event: React.DragEvent<HTMLElement>, type: "stage" | "task", id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/asc-timeline-type", type);
    event.dataTransfer.setData("application/asc-timeline-id", id);
  }

  return (
    <div className="tech-panel overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div><div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65"><Route className="size-3.5" /> Project Timeline Pro</div><h2 className="mt-1.5 text-lg font-semibold text-white">Gantt Timeline Pro — Baseline, critical path & delivery variance</h2><p className="mt-1 text-[10px] leading-5 text-slate-600">Kéo thả stage/task trên timeline để điều chỉnh lịch. Baseline chỉ thay đổi khi Boss chụp lại baseline mới.</p></div>
          <div className="flex flex-wrap items-center gap-2">{canEdit ? <button type="button" disabled={Boolean(saving)} onClick={() => void snapshotBaseline()} className="flex h-9 items-center gap-2 rounded-xl border border-violet-300/18 bg-violet-300/[0.06] px-3 text-[10px] text-violet-100 hover:bg-violet-300/[0.1] disabled:opacity-40">{saving === "baseline" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />} Chụp baseline hiện tại</button> : null}<span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 text-[9px] text-slate-500"><span className="text-cyan-200">{criticalCount}</span> critical stage</span><span className={cn("rounded-lg border px-2.5 py-2 text-[9px]", delayedCount ? "border-rose-300/18 bg-rose-300/[0.06] text-rose-200" : "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200")}><span className="font-semibold">{delayedCount}</span> cảnh báo trễ</span></div>
        </div>
        {error ? <div className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-3 py-2 text-[10px] text-rose-200">{error}</div> : null}
        <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-cyan-300/70" /> Current plan</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-dashed border-slate-400" /> Baseline</span><span className="flex items-center gap-1.5"><Diamond className="size-2.5 fill-amber-300 text-amber-300" /> Milestone / Milestone độc lập</span><span className="flex items-center gap-1.5"><Target className="size-3 text-violet-300" /> Target</span><span className="flex items-center gap-1.5"><i className="h-3 w-px bg-rose-300" /> Hôm nay</span><span className="flex items-center gap-1.5"><AlertTriangle className="size-3 text-rose-300" /> Trễ</span></div>
      </div>

      <div className="scrollbar-thin overflow-x-auto"><div style={{ minWidth: trackWidth + 290 }}>
        <div className="flex h-12 border-b border-white/[0.06] bg-black/10"><div className="sticky left-0 z-30 flex w-72 shrink-0 items-center border-r border-white/[0.07] bg-[#0b1727]/95 px-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Timeline item</div><div className="relative h-full" style={{ width: trackWidth }}>{ticks.map((tick, index) => { const left = rowPosition(start, end, tick.date); const next = ticks[index + 1]?.date ?? end; return <div key={tick.key} className="absolute inset-y-0 border-l border-white/[0.07] px-2 py-3 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-600" style={{ left: `${left}%`, width: `${Math.max(2, rowPosition(start, end, next) - left)}%` }}>{tick.label}</div>; })}</div></div>
        {stageRows.map((stage) => {
          const relatedTasks = tasks.filter((task) => task.stageId === stage.id).sort((a, b) => a.sortOrder - b.sortOrder);
          const relatedMilestones = milestones.filter((milestone) => milestone.stageId === stage.id);
          const currentStart = stage.startDate ?? stage.baselineStartDate;
          const currentEnd = stage.endDate ?? stage.baselineEndDate;
          const delayed = (stage.delayDays ?? 0) > 0 || (currentEnd && currentEnd < today && stage.status !== "completed");
          return <div key={stage.id}>
            <div className={cn("group flex h-[76px] border-b border-white/[0.045]", delayed && "bg-rose-300/[0.02]")}>
              <div className="sticky left-0 z-20 flex w-72 shrink-0 items-center gap-3 border-r border-white/[0.07] bg-[#0b1727]/95 px-4 group-hover:bg-[#0e1c2e]"><span draggable={canEdit} onDragStart={(event) => beginDrag(event, "stage", stage.id)}><GripVertical className="size-3.5 cursor-grab text-slate-700" /></span><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color, boxShadow: `0 0 14px ${stage.color}55` }} /><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-xs font-medium text-slate-300">{stage.name}</span>{stage.isCritical ? <span className="rounded-md border border-rose-300/15 bg-rose-300/[0.05] px-1.5 py-0.5 text-[8px] text-rose-200">Critical</span> : null}</div><div className="mt-1 flex items-center gap-2 text-[9px] text-slate-600"><span>{stage.code}</span><span>•</span><span>{displayDate(currentStart, true)} → {displayDate(currentEnd, true)}</span>{delayed ? <span className="text-rose-300">+{stage.delayDays || 1} ngày</span> : null}</div></div></div>
              <div className="relative h-full" style={{ width: trackWidth }} onDragOver={(event) => { if (canEdit) event.preventDefault(); }} onDrop={(event) => void dropItem(event)}>{ticks.map((tick) => <span key={tick.key} className="absolute inset-y-0 border-l border-white/[0.045]" style={{ left: `${rowPosition(start, end, tick.date)}%` }} />)}{todayVisible ? <span className="absolute inset-y-0 z-10 w-px bg-rose-300/70" style={{ left: `${rowPosition(start, end, today)}%` }} /> : null}{targetVisible && masterPlan.targetEndDate ? <span className="absolute inset-y-0 z-10 border-l border-dashed border-violet-300/80" style={{ left: `${rowPosition(start, end, masterPlan.targetEndDate)}%` }} /> : null}{stage.baselineStartDate && stage.baselineEndDate ? <div className="absolute top-[25px] h-7 rounded-lg border border-dashed border-slate-400/50 bg-slate-400/[0.06]" style={{ left: `${rowPosition(start, end, stage.baselineStartDate)}%`, width: `${rowWidth(start, end, stage.baselineStartDate, stage.baselineEndDate)}%` }} /> : null}{currentStart && currentEnd ? <div draggable={canEdit} onDragStart={(event) => beginDrag(event, "stage", stage.id)} className={cn("absolute top-[22px] h-7 cursor-grab overflow-hidden rounded-lg border shadow-[0_8px_20px_rgba(0,0,0,.18)]", delayed ? "border-rose-300/60 bg-rose-300/20" : "border-cyan-200/35 bg-cyan-300/20")} style={{ left: `${rowPosition(start, end, currentStart)}%`, width: `${rowWidth(start, end, currentStart, currentEnd)}%`, minWidth: 26 }} title="Kéo để thay đổi ngày stage"><div className="h-full rounded-lg" style={{ width: `${stage.progress}%`, background: `linear-gradient(90deg, ${stage.color}D0, ${stage.color}70)` }} /><span className="absolute inset-0 flex items-center gap-1 px-2 text-[9px] font-semibold text-white drop-shadow">{stage.progress}% {delayed ? <AlertTriangle className="size-3 text-rose-200" /> : null}</span></div> : null}{relatedMilestones.map((milestone) => <span key={milestone.id} className="absolute top-[8px] z-20 grid size-4 -translate-x-1/2 rotate-45 place-items-center rounded-[3px] border border-amber-200/70 bg-amber-300" style={{ left: `${rowPosition(start, end, milestone.dueDate)}%` }} title={`${milestone.title} • ${displayDate(milestone.dueDate)}`}><Diamond className="size-2 -rotate-45 text-amber-950" /></span>)}</div>
            </div>
            {relatedTasks.map((task) => <div key={task.id} className="group flex h-[48px] border-b border-white/[0.035] bg-black/[0.06]"><div className="sticky left-0 z-20 flex w-72 shrink-0 items-center gap-3 border-r border-white/[0.07] bg-[#0d1b2d]/95 pl-12 pr-4 group-hover:bg-[#102238]"><span draggable={canEdit} onDragStart={(event) => beginDrag(event, "task", task.id)}><GripVertical className="size-3 cursor-grab text-slate-700" /></span><span className={cn("size-1.5 rounded-full", task.status === "done" ? "bg-emerald-300" : task.status === "blocked" ? "bg-rose-300" : "bg-cyan-300")} /><span className="truncate text-[10px] text-slate-500">{task.title}</span>{(task.delayDays ?? 0) > 0 ? <span className="shrink-0 text-[8px] text-rose-300">+{task.delayDays}d</span> : null}</div><div className="relative h-full" style={{ width: trackWidth }} onDragOver={(event) => { if (canEdit) event.preventDefault(); }} onDrop={(event) => void dropItem(event)}>{ticks.map((tick) => <span key={tick.key} className="absolute inset-y-0 border-l border-white/[0.03]" style={{ left: `${rowPosition(start, end, tick.date)}%` }} />)}{task.baselineDueDate ? <span className="absolute top-[20px] z-10 size-2 -translate-x-1/2 rounded-full border border-dashed border-slate-300/70" style={{ left: `${rowPosition(start, end, task.baselineDueDate)}%` }} /> : null}{task.dueDate ? <span draggable={canEdit} onDragStart={(event) => beginDrag(event, "task", task.id)} className={cn("absolute top-[17px] z-20 size-4 -translate-x-1/2 cursor-grab rounded-full border-2", (task.delayDays ?? 0) > 0 ? "border-rose-200 bg-rose-400" : "border-cyan-100 bg-cyan-300")} style={{ left: `${rowPosition(start, end, task.dueDate)}%` }} title={`Deadline: ${displayDate(task.dueDate)}`} /> : null}</div></div>)}
          </div>;
        })}
        {tasks.filter((task) => !task.stageId).map((task) => <div key={task.id} className="flex h-[48px] border-b border-white/[0.035] bg-black/[0.06]"><div className="sticky left-0 z-20 flex w-72 shrink-0 items-center gap-3 border-r border-white/[0.07] bg-[#0d1b2d]/95 pl-12 pr-4"><span draggable={canEdit} onDragStart={(event) => beginDrag(event, "task", task.id)}><GripVertical className="size-3 cursor-grab text-slate-700" /></span><span className="truncate text-[10px] text-slate-500">{task.title}</span></div><div className="relative h-full" style={{ width: trackWidth }} onDragOver={(event) => { if (canEdit) event.preventDefault(); }} onDrop={(event) => void dropItem(event)}>{task.dueDate ? <span className="absolute top-[17px] z-20 size-4 -translate-x-1/2 rounded-full border-2 border-cyan-100 bg-cyan-300" style={{ left: `${rowPosition(start, end, task.dueDate)}%` }} /> : null}</div></div>)}
      </div></div>
    </div>
  );
}
