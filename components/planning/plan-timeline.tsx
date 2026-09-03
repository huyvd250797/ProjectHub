"use client";

import { CalendarRange, Diamond, Flag, Milestone as MilestoneIcon } from "lucide-react";
import { diffCalendarDays, parseDateOnly } from "@/lib/planning/schedule";
import type { MasterPlan, ProjectMilestone, ProjectPlanStage } from "@/lib/planning/types";

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(parseDateOnly(value));
}

function monthTicks(start: string, end: string) {
  const first = parseDateOnly(start);
  first.setUTCDate(1);
  const last = parseDateOnly(end);
  const ticks: Array<{ key: string; date: string; label: string }> = [];
  let guard = 0;
  while (first <= last && guard < 240) {
    const value = first.toISOString().slice(0, 10);
    ticks.push({
      key: value,
      date: value < start ? start : value,
      label: new Intl.DateTimeFormat("vi-VN", { month: "short", year: "numeric", timeZone: "UTC" }).format(first),
    });
    first.setUTCMonth(first.getUTCMonth() + 1);
    guard += 1;
  }
  return ticks;
}

export function PlanTimeline({
  masterPlan,
  stages,
  milestones,
}: {
  masterPlan: MasterPlan | null;
  stages: ProjectPlanStage[];
  milestones: ProjectMilestone[];
}) {
  const stageDates = stages.flatMap((stage) => [stage.startDate, stage.endDate]).filter((value): value is string => Boolean(value));
  const milestoneDates = milestones.map((milestone) => milestone.dueDate).filter(Boolean);
  const candidates = [masterPlan?.startDate, masterPlan?.targetEndDate, ...stageDates, ...milestoneDates].filter((value): value is string => Boolean(value));

  if (!masterPlan || !candidates.length || !stageDates.length) {
    return (
      <div className="tech-panel grid min-h-[360px] place-items-center rounded-2xl px-6 text-center">
        <div>
          <CalendarRange className="mx-auto size-8 text-slate-700" />
          <div className="mt-4 text-sm font-semibold text-slate-300">Timeline chưa sẵn sàng</div>
          <div className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600">Thiết lập ngày bắt đầu Master Plan, thêm thời lượng hoặc khoảng ngày cho Project Stages rồi chọn “Tính lại lịch”.</div>
        </div>
      </div>
    );
  }

  const start = [...candidates].sort()[0];
  const end = [...candidates].sort().at(-1) as string;
  const totalDays = Math.max(1, diffCalendarDays(start, end) + 1);
  const trackWidth = Math.min(9_000, Math.max(980, totalDays * 7));
  const ticks = monthTicks(start, end);
  const today = new Date().toISOString().slice(0, 10);
  const position = (date: string) => Math.max(0, Math.min(100, (diffCalendarDays(start, date) / Math.max(1, totalDays - 1)) * 100));
  const barWidth = (stage: ProjectPlanStage) => {
    if (!stage.startDate || !stage.endDate) return 0;
    return Math.max(0.6, ((diffCalendarDays(stage.startDate, stage.endDate) + 1) / totalDays) * 100);
  };
  const todayVisible = today >= start && today <= end;
  const targetVisible = Boolean(masterPlan.targetEndDate && masterPlan.targetEndDate >= start && masterPlan.targetEndDate <= end);

  return (
    <div className="tech-panel overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65">Gantt Timeline</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{displayDate(start)} → {displayDate(end)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-cyan-300" /> Stage</span>
          <span className="flex items-center gap-1.5"><Diamond className="size-2.5 fill-amber-300 text-amber-300" /> Milestone</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-px bg-rose-300" /> Hôm nay</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-px border-l border-dashed border-violet-300" /> Target</span>
        </div>
      </div>

      <div className="scrollbar-thin overflow-x-auto">
        <div style={{ minWidth: trackWidth + 240 }}>
          <div className="flex h-12 border-b border-white/[0.06] bg-black/10">
            <div className="sticky left-0 z-20 flex w-60 shrink-0 items-center border-r border-white/[0.07] bg-[#0b1727]/95 px-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Project Stage</div>
            <div className="relative h-full" style={{ width: trackWidth }}>
              {ticks.map((tick, index) => {
                const left = position(tick.date);
                const next = ticks[index + 1]?.date ?? end;
                const width = Math.max(2, position(next) - left);
                return <div key={tick.key} className="absolute inset-y-0 border-l border-white/[0.07] px-2 py-3 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-600" style={{ left: `${left}%`, width: `${width}%` }}>{tick.label}</div>;
              })}
            </div>
          </div>

          {stages.map((stage) => {
            const related = milestones.filter((milestone) => milestone.stageId === stage.id);
            return (
              <div key={stage.id} className="group flex h-[68px] border-b border-white/[0.045] hover:bg-white/[0.018]">
                <div className="sticky left-0 z-20 flex w-60 shrink-0 items-center gap-3 border-r border-white/[0.07] bg-[#0b1727]/95 px-4 group-hover:bg-[#0e1c2e]">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color, boxShadow: `0 0 14px ${stage.color}55` }} />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-slate-300">{stage.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-600"><span>{stage.code}</span><span>•</span><span>{stage.durationDays} ngày</span>{stage.dateMode === "manual" ? <><span>•</span><span className="text-violet-300/70">Nhập ngày</span></> : null}</div>
                  </div>
                </div>
                <div className="relative h-full" style={{ width: trackWidth }}>
                  {ticks.map((tick) => <span key={tick.key} className="absolute inset-y-0 border-l border-white/[0.045]" style={{ left: `${position(tick.date)}%` }} />)}
                  {todayVisible ? <span className="absolute inset-y-0 z-10 w-px bg-rose-300/70" style={{ left: `${position(today)}%` }} title={`Hôm nay: ${displayDate(today)}`} /> : null}
                  {targetVisible && masterPlan.targetEndDate ? <span className="absolute inset-y-0 z-10 border-l border-dashed border-violet-300/80" style={{ left: `${position(masterPlan.targetEndDate)}%` }} title={`Target: ${displayDate(masterPlan.targetEndDate)}`} /> : null}
                  {stage.startDate && stage.endDate ? (
                    <div className="absolute top-[19px] h-[28px] overflow-hidden rounded-lg border shadow-[0_8px_20px_rgba(0,0,0,.18)]" style={{ left: `${position(stage.startDate)}%`, width: `${barWidth(stage)}%`, minWidth: 22, borderColor: `${stage.color}66`, backgroundColor: `${stage.color}20` }} title={`${stage.name}: ${displayDate(stage.startDate)} → ${displayDate(stage.endDate)}`}>
                      <div className="h-full rounded-lg" style={{ width: `${stage.progress}%`, background: `linear-gradient(90deg, ${stage.color}C8, ${stage.color}80)` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-white drop-shadow">{stage.progress}%</span>
                    </div>
                  ) : null}
                  {related.map((milestone, index) => (
                    <span key={milestone.id} className="absolute z-20 grid size-4 -translate-x-1/2 rotate-45 place-items-center rounded-[3px] border border-amber-200/70 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,.3)]" style={{ left: `${position(milestone.dueDate)}%`, top: index % 2 ? 7 : 49 }} title={`${milestone.title} • ${displayDate(milestone.dueDate)}`}><MilestoneIcon className="size-2 -rotate-45 text-amber-950" /></span>
                  ))}
                </div>
              </div>
            );
          })}

          {milestones.some((milestone) => !milestone.stageId) ? (
            <div className="flex h-[58px] bg-amber-300/[0.015]">
              <div className="sticky left-0 z-20 flex w-60 shrink-0 items-center gap-3 border-r border-white/[0.07] bg-[#0b1727]/95 px-4"><Flag className="size-4 text-amber-300/70" /><div><div className="text-xs font-medium text-slate-400">Milestone độc lập</div><div className="mt-1 text-[9px] text-slate-600">Không gắn với stage</div></div></div>
              <div className="relative h-full" style={{ width: trackWidth }}>
                {ticks.map((tick) => <span key={tick.key} className="absolute inset-y-0 border-l border-white/[0.045]" style={{ left: `${position(tick.date)}%` }} />)}
                {milestones.filter((milestone) => !milestone.stageId).map((milestone) => <span key={milestone.id} className="absolute top-5 z-20 size-4 -translate-x-1/2 rotate-45 rounded-[3px] border border-amber-200/70 bg-amber-300" style={{ left: `${position(milestone.dueDate)}%` }} title={`${milestone.title} • ${displayDate(milestone.dueDate)}`} />)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
