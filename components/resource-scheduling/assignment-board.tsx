"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  GripVertical,
  LoaderCircle,
  RefreshCw,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import { DateInput, formatDateDisplay } from "@/components/ui/date-input";
import { cn } from "@/lib/utils";
import type {
  ResourceScheduleApiResponse,
  ResourceScheduleAssignResponse,
  ResourceScheduleData,
  ResourceScheduleItem,
  ResourceScheduleMember,
  ResourceScheduleMemberWeek,
} from "@/lib/resource-scheduling/types";

const levelClass = {
  available: "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200",
  balanced: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
  tight: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  overloaded: "border-rose-300/20 bg-rose-300/[0.075] text-rose-200",
};

const levelLabel = {
  available: "Còn trống",
  balanced: "Ổn định",
  tight: "Gần đầy",
  overloaded: "Quá tải",
};

function todayOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatHours(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}h`;
}

function KpiCard({ label, value, note, icon: Icon, tone = "cyan" }: { label: string; value: string | number; note: string; icon: LucideIcon; tone?: "cyan" | "emerald" | "amber" | "rose" }) {
  const toneClass = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
    amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
    rose: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
  }[tone];
  return (
    <div className="tech-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div>
          <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</div>
          <div className="mt-2 text-[10px] leading-4 text-slate-600">{note}</div>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border", toneClass)}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function WorkItemCard({
  item,
  members,
  assigning,
  onAssign,
  onDragStart,
}: {
  item: ResourceScheduleItem;
  members: ResourceScheduleMember[];
  assigning: boolean;
  onAssign: (item: ResourceScheduleItem, assigneeId: string | null) => void;
  onDragStart: (item: ResourceScheduleItem) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(item)}
      className="group rounded-xl border border-white/[0.065] bg-[#0e1d31] p-3 shadow-sm transition hover:border-cyan-300/18 hover:bg-[#11243c]"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-slate-700 group-hover:text-cyan-300/60" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg border border-cyan-300/12 bg-cyan-300/[0.055] px-2 py-0.5 text-[10px] font-semibold text-cyan-200">{item.code}</span>
            <span className="rounded-lg border border-white/[0.07] px-2 py-0.5 text-[10px] text-slate-500">{item.type === "issue" ? "ISSUE" : "Task"}</span>
            <span className="ml-auto text-[10px] font-semibold text-amber-200">{formatHours(item.estimatedHours)}</span>
          </div>
          <div className="mt-2 whitespace-normal break-words text-xs font-semibold leading-5 text-slate-100">{item.title}</div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
            <span>{item.dueDate ? formatDateDisplay(item.dueDate) : "Chưa có hạn"}</span>
            {item.moduleName ? <span>• {item.moduleName}</span> : null}
            {item.stageName ? <span>• {item.stageName}</span> : null}
          </div>
          <select
            value={item.ownerId ?? ""}
            disabled={assigning}
            onChange={(event) => onAssign(item, event.target.value || null)}
            className="mt-3 h-9 w-full rounded-lg border border-white/[0.08] bg-[#13243a] px-2 text-[11px] font-medium text-slate-200 outline-none disabled:opacity-50"
          >
            <option value="">Chưa phân công</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function MemberCell({
  member,
  week,
  members,
  draggingItem,
  assigningKey,
  onAssign,
  onDragStart,
}: {
  member: ResourceScheduleMember;
  week: ResourceScheduleMemberWeek;
  members: ResourceScheduleMember[];
  draggingItem: ResourceScheduleItem | null;
  assigningKey: string;
  onAssign: (item: ResourceScheduleItem, assigneeId: string | null) => void;
  onDragStart: (item: ResourceScheduleItem) => void;
}) {
  const previewHours = draggingItem && draggingItem.ownerId !== member.id ? week.plannedHours + draggingItem.estimatedHours : week.plannedHours;
  const wouldOverload = previewHours > member.effectiveCapacityHours;
  return (
    <td
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (draggingItem) onAssign(draggingItem, member.id);
      }}
      className={cn("min-w-[260px] border-l border-white/[0.045] p-3 align-top transition", wouldOverload && "bg-rose-300/[0.045]")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", levelClass[week.level])}>{levelLabel[week.level]}</span>
        <span className={cn("text-[11px] font-semibold", week.overloadHours ? "text-rose-200" : "text-slate-300")}>{week.allocationPercent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04]">
        <div
          className={cn("h-full rounded-full", week.level === "overloaded" ? "bg-rose-300" : week.level === "tight" ? "bg-amber-300" : week.level === "balanced" ? "bg-cyan-300" : "bg-emerald-300")}
          style={{ width: `${Math.min(100, week.allocationPercent)}%` }}
        />
      </div>
      <div className="mt-1.5 text-[10px] text-slate-600">
        {formatHours(week.plannedHours)} / {formatHours(member.effectiveCapacityHours)}
        {week.overloadHours ? <span className="text-rose-200"> • vượt {formatHours(week.overloadHours)}</span> : <span> • còn {formatHours(week.availableHours)}</span>}
      </div>
      {wouldOverload ? <div className="mt-2 rounded-lg border border-rose-300/15 bg-rose-300/[0.055] px-2 py-1 text-[10px] text-rose-100">Nếu thả vào đây sẽ vượt capacity tuần.</div> : null}
      <div className="mt-3 space-y-2">
        {week.items.map((item) => (
          <WorkItemCard
            key={`${item.type}-${item.id}`}
            item={item}
            members={members}
            assigning={assigningKey === `${item.type}:${item.id}`}
            onAssign={onAssign}
            onDragStart={onDragStart}
          />
        ))}
        {!week.items.length ? <div className="rounded-xl border border-dashed border-white/[0.07] px-3 py-6 text-center text-[10px] text-slate-700">Thả việc vào đây để phân công</div> : null}
      </div>
    </td>
  );
}

export function AssignmentBoard() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<ResourceScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(todayOnly());
  const [draggingItem, setDraggingItem] = useState<ResourceScheduleItem | null>(null);
  const [assigningKey, setAssigningKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ projectId: selectedProject.id, startDate });
        const response = await fetch(`/api/resource-scheduling?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const body = (await response.json()) as ResourceScheduleApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được Resource Scheduling.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedProject.id, startDate, reloadKey]);

  const members = data?.members ?? [];
  const visibleUnassigned = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (data?.unassignedItems ?? []).filter((item) => !keyword || [item.code, item.title, item.status, item.priority, item.moduleName, item.departmentName, item.stageName].some((value) => String(value ?? "").toLowerCase().includes(keyword)));
  }, [data?.unassignedItems, query]);

  async function assignItem(item: ResourceScheduleItem, assigneeId: string | null) {
    if (item.ownerId === assigneeId) return;
    setAssigningKey(`${item.type}:${item.id}`);
    setError("");
    try {
      const response = await fetch("/api/resource-scheduling", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, itemType: item.type, itemId: item.id, assigneeId }),
      });
      const body = (await response.json()) as ResourceScheduleAssignResponse;
      if (!body.ok) throw new Error(body.message);
      setDraggingItem(null);
      setReloadKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được phân công.");
    } finally {
      setAssigningKey("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Resource Scheduling"
        title={`${selectedProject.code} • Assignment Board`}
        description="Điều phối nhân sự bằng bảng phân bổ theo tuần, thấy ngay ai còn capacity, ai quá tải và việc nào chưa có người phụ trách."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[170px]">
              <DateInput value={startDate} onChange={setStartDate} placeholder="DD/MM/YYYY" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-semibold text-slate-100 outline-none" />
            </div>
            <span className={cn("rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]", data?.source === "demo" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200")}>
              {data?.source === "demo" ? "Demo data" : "Live Supabase"}
            </span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại Assignment Board">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="tech-panel h-[110px] animate-pulse rounded-2xl bg-white/[0.02]" />)}</div>
          <div className="tech-panel h-[520px] animate-pulse rounded-2xl bg-white/[0.02]" />
        </div>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <KpiCard label="Nhân sự" value={data.summary.memberCount} note="ASC active trong project" icon={UsersRound} />
            <KpiCard label="Assignable" value={data.summary.assignableItems} note="ISSUE/task đã có lịch phân bổ" icon={CalendarDays} />
            <KpiCard label="Chưa phân công" value={data.summary.unassignedItems} note="Cần kéo vào người phù hợp" icon={UserPlus} tone={data.summary.unassignedItems ? "amber" : "emerald"} />
            <KpiCard label="Overload slot" value={data.summary.overloadedSlots} note="Ô tuần vượt capacity" icon={AlertTriangle} tone={data.summary.overloadedSlots ? "rose" : "emerald"} />
            <KpiCard label="Planned" value={formatHours(data.summary.totalPlannedHours)} note="Tổng giờ đã xếp lịch" icon={Clock3} />
            <KpiCard label="Available" value={formatHours(data.summary.totalAvailableHours)} note={`Overload ${formatHours(data.summary.totalOverloadHours)}`} icon={UsersRound} tone="emerald" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="tech-panel h-fit rounded-2xl">
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggingItem) void assignItem(draggingItem, null);
                }}
                className="border-b border-white/[0.07] p-4"
              >
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Unassigned Work Queue</div>
                <h2 className="mt-1.5 text-sm font-semibold text-white">Việc chưa phân công</h2>
                <div className="mt-3 rounded-xl border border-dashed border-cyan-300/14 bg-cyan-300/[0.035] px-3 py-2 text-[10px] leading-4 text-cyan-100/75">
                  Kéo card vào đây để bỏ phân công, hoặc kéo từ queue sang ô nhân sự.
                </div>
                <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-slate-600">
                  <Search className="size-4" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm ISSUE/task..." className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-700" />
                </label>
              </div>
              <div className="max-h-[680px] space-y-2 overflow-auto p-4">
                {visibleUnassigned.map((item) => (
                  <WorkItemCard key={`${item.type}-${item.id}`} item={item} members={members} assigning={assigningKey === `${item.type}:${item.id}`} onAssign={assignItem} onDragStart={setDraggingItem} />
                ))}
                {!visibleUnassigned.length ? <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center text-xs text-slate-600">Không có việc chưa phân công phù hợp.</div> : null}
              </div>
            </aside>

            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-2 border-b border-white/[0.07] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Weekly Assignment Board</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Bảng phân bổ theo tuần</h2>
                </div>
                <div className="text-[10px] text-slate-600">Kéo card giữa các nhân sự để điều phối lại. Board tự cảnh báo khi vượt capacity.</div>
              </div>
              <div className="overflow-auto">
                <table className="asc-data-grid min-w-[1760px] w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#122238] text-[10px] uppercase tracking-[0.16em] text-slate-600">
                    <tr>
                      <th className="w-[260px] px-4 py-3">Nhân sự</th>
                      {data.weeks.map((week) => (
                        <th key={week.id} className="min-w-[260px] border-l border-white/[0.045] px-4 py-3">
                          <div className="text-slate-400">{week.label}</div>
                          <div className="mt-1 normal-case tracking-normal text-slate-700">{formatDateDisplay(week.startDate)} - {formatDateDisplay(week.endDate)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.055]">
                    {members.map((member) => (
                      <tr key={member.id} className="align-top">
                        <td className="sticky left-0 z-[2] w-[260px] bg-[#102035] px-4 py-4">
                          <div className="font-semibold text-cyan-100">{member.name}</div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{member.title ?? member.role ?? "ASC Team"}{member.departmentName ? ` • ${member.departmentName}` : ""}</div>
                          <div className="mt-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                            <div className="text-[10px] text-slate-600">Capacity/tuần</div>
                            <div className="mt-1 text-sm font-semibold text-white">{formatHours(member.effectiveCapacityHours)}</div>
                            <div className="mt-1 text-[10px] text-slate-700">{formatHours(member.capacityHoursPerWeek)} × {member.allocationTargetPercent}% target</div>
                          </div>
                          <div className="mt-2 text-[10px] text-slate-600">Avg allocation {member.averageAllocationPercent}% • overload {formatHours(member.totalOverloadHours)}</div>
                        </td>
                        {member.weeks.map((week) => (
                          <MemberCell key={`${member.id}-${week.weekId}`} member={member} week={week} members={members} draggingItem={draggingItem} assigningKey={assigningKey} onAssign={assignItem} onDragStart={setDraggingItem} />
                        ))}
                      </tr>
                    ))}
                    {!members.length ? (
                      <tr>
                        <td colSpan={data.weeks.length + 1} className="px-4 py-12 text-center text-xs text-slate-600">Chưa có nhân sự ASC trong project.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : loading ? null : (
        <div className="tech-panel rounded-2xl p-10 text-center text-sm text-slate-500">
          <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-cyan-300/70" />
          Đang chuẩn bị Resource Scheduling.
        </div>
      )}
    </>
  );
}
