"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Gauge,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  Search,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useProject } from "@/components/project-context";
import { cn } from "@/lib/utils";
import type { WorkloadApiResponse, WorkloadData, WorkloadLevel, WorkloadMember } from "@/lib/workload/types";

const levelClass: Record<WorkloadLevel, string> = {
  low: "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200",
  normal: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
  high: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
  overloaded: "border-rose-300/20 bg-rose-300/[0.075] text-rose-200",
};

const levelLabel: Record<WorkloadLevel, string> = {
  low: "Còn trống",
  normal: "Ổn định",
  high: "Tải cao",
  overloaded: "Quá tải",
};

const itemIcon = {
  issue: ListTodo,
  task: CheckCircle2,
  milestone: CalendarDays,
  reminder: BellRing,
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function KpiCard({ label, value, note, icon: Icon, tone = "cyan" }: { label: string; value: number | string; note: string; icon: typeof Gauge; tone?: "cyan" | "emerald" | "amber" | "rose" }) {
  const toneClass = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-200",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200",
    amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200",
    rose: "border-rose-300/18 bg-rose-300/[0.07] text-rose-200",
  }[tone];
  return (
    <div className="tech-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
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

function CapacityBar({ member }: { member: WorkloadMember }) {
  const bar = member.level === "overloaded" ? "bg-rose-300" : member.level === "high" ? "bg-amber-300" : member.level === "normal" ? "bg-cyan-300" : "bg-emerald-300";
  return (
    <div className="min-w-[180px]">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold", levelClass[member.level])}>{levelLabel[member.level]}</span>
        <span className="text-xs font-semibold text-slate-200">{member.capacityScore}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/[0.04]">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${member.capacityScore}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-700">Focus risk {member.focusScore}%</div>
    </div>
  );
}

function WorkloadSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="tech-panel h-[118px] animate-pulse rounded-2xl bg-white/[0.02]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <div className="tech-panel h-[440px] animate-pulse rounded-2xl bg-white/[0.02]" />
        <div className="tech-panel h-[440px] animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    </div>
  );
}

export function WorkloadDashboard() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | WorkloadLevel>("all");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/workload?projectId=${encodeURIComponent(selectedProject.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as WorkloadApiResponse;
        if (cancelled) return;
        if (!body.ok) throw new Error(body.message);
        setData(body.data);
      } catch (reason) {
        if (!cancelled && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được Workload & Capacity Planning.");
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

  const visibleMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (data?.members ?? []).filter((member) => {
      const matchesLevel = level === "all" || member.level === level;
      const matchesText = !keyword || [member.name, member.title, member.email, member.departmentName, member.role].some((value) => String(value ?? "").toLowerCase().includes(keyword));
      return matchesLevel && matchesText;
    });
  }, [data?.members, level, query]);

  return (
    <>
      <PageHeader
        eyebrow="Workload & Capacity Planning"
        title={`${selectedProject.code} • Capacity`}
        description="Quản lý tải việc nhân sự, phát hiện ai đang quá tải, ai còn trống và gợi ý phân bổ lại ISSUE/task theo project đang chọn."
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-xl border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]", data?.source === "demo" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200")}>
              {data?.source === "demo" ? "Demo data" : "Live Supabase"}
            </span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 hover:text-cyan-200" aria-label="Tải lại Workload">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {loading && !data ? <WorkloadSkeleton /> : null}

      {data ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <KpiCard label="Nhân sự" value={data.summary.memberCount} note="ASC active trong project" icon={UsersRound} />
            <KpiCard label="Quá tải" value={data.summary.overloadedMembers} note="Capacity >= 85% hoặc nhiều rủi ro" icon={AlertTriangle} tone={data.summary.overloadedMembers ? "rose" : "emerald"} />
            <KpiCard label="Còn trống" value={data.summary.availableMembers} note="Low/normal capacity" icon={UserCheck} tone="emerald" />
            <KpiCard label="Open Work" value={data.summary.totalOpenWork} note="ISSUE + task + milestone + reminder" icon={BriefcaseBusiness} />
            <KpiCard label="Quá hạn" value={data.summary.overdueWork} note={`${data.summary.blockedTasks} task blocked`} icon={ListTodo} tone={data.summary.overdueWork ? "rose" : "emerald"} />
            <KpiCard label="Avg Capacity" value={`${data.summary.averageCapacity}%`} note={`${data.summary.dueSoonWork} việc đến hạn trong 7 ngày`} icon={Gauge} tone={data.summary.averageCapacity >= 85 ? "rose" : data.summary.averageCapacity >= 65 ? "amber" : "cyan"} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Team Capacity Board</div>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">Tải việc theo nhân sự</h2>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex h-11 min-w-[280px] items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-slate-600">
                    <Search className="size-4" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhân sự, phòng ban, vai trò..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-700" />
                  </label>
                  <select value={level} onChange={(event) => setLevel(event.target.value as typeof level)} className="h-11 rounded-xl border border-white/[0.08] bg-[#13243a] px-3 text-sm font-semibold text-slate-200 outline-none">
                    <option value="all">Tất cả tải việc</option>
                    <option value="overloaded">Quá tải</option>
                    <option value="high">Tải cao</option>
                    <option value="normal">Ổn định</option>
                    <option value="low">Còn trống</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="asc-data-grid min-w-[1120px] w-full text-left text-sm">
                  <thead className="border-b border-white/[0.07] bg-white/[0.018] text-[10px] uppercase tracking-[0.16em] text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Nhân sự</th>
                      <th className="px-4 py-3">Capacity Score</th>
                      <th className="px-4 py-3">ISSUE</th>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Milestone</th>
                      <th className="px-4 py-3">Reminder</th>
                      <th className="px-4 py-3">Deadline gần nhất</th>
                      <th className="px-4 py-3">Khuyến nghị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.055]">
                    {visibleMembers.map((member) => (
                      <tr key={member.id} className="align-top hover:bg-white/[0.018]">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-100">{member.name}</div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{member.title ?? member.role ?? "ASC Team"}{member.departmentName ? ` • ${member.departmentName}` : ""}</div>
                          <div className="mt-3 space-y-1.5">
                            {member.items.map((item) => {
                              const Icon = itemIcon[item.type];
                              return (
                                <Link key={`${item.type}-${item.id}`} href={item.href} className="flex items-start gap-2 rounded-lg border border-white/[0.045] bg-white/[0.015] px-2.5 py-2 text-[11px] leading-4 text-slate-500 hover:border-cyan-300/15 hover:text-cyan-100">
                                  <Icon className="mt-0.5 size-3.5 shrink-0" />
                                  <span className="min-w-0 whitespace-normal break-words">{item.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-4"><CapacityBar member={member} /></td>
                        <td className="px-4 py-4 text-slate-300">{member.openIssues}<div className="mt-1 text-[10px] text-slate-700">{member.overdueIssues} quá hạn • {member.dueSoonIssues} sắp hạn</div></td>
                        <td className="px-4 py-4 text-slate-300">{member.openTasks}<div className="mt-1 text-[10px] text-slate-700">{member.blockedTasks} blocked • {member.overdueTasks} quá hạn</div></td>
                        <td className="px-4 py-4 text-slate-300">{member.openMilestones}<div className="mt-1 text-[10px] text-slate-700">{member.overdueMilestones} quá hạn</div></td>
                        <td className="px-4 py-4 text-slate-300">{member.openReminders}<div className="mt-1 text-[10px] text-slate-700">{member.overdueReminders} quá hạn</div></td>
                        <td className="px-4 py-4 text-slate-300">{formatDate(member.nextDueDate)}</td>
                        <td className="max-w-[300px] whitespace-normal break-words px-4 py-4 text-xs leading-5 text-slate-500">{member.recommendation}</td>
                      </tr>
                    ))}
                    {!visibleMembers.length ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-600">Không có nhân sự phù hợp bộ lọc hiện tại.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="tech-panel rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Assignment Suggestions</div>
                    <h2 className="mt-1.5 text-sm font-semibold text-white">Người nên nhận thêm việc</h2>
                  </div>
                  <UserCheck className="size-5 text-emerald-300/70" />
                </div>
                <div className="space-y-2.5">
                  {data.suggestions.map((suggestion) => (
                    <div key={suggestion.memberId} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100">{suggestion.name}</div>
                          <div className="mt-1 text-[10px] text-slate-600">{suggestion.departmentName ?? "Chưa gắn phòng ban"}</div>
                        </div>
                        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold", levelClass[suggestion.level])}>{suggestion.capacityScore}%</span>
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-slate-500">{suggestion.reason}</div>
                    </div>
                  ))}
                  {!data.suggestions.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-600">Chưa có nhân sự còn capacity rõ ràng.</div> : null}
                </div>
              </div>

              <div className="tech-panel rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Capacity Risks</div>
                    <h2 className="mt-1.5 text-sm font-semibold text-white">Rủi ro điều phối</h2>
                  </div>
                  <AlertTriangle className="size-5 text-amber-300/70" />
                </div>
                <div className="space-y-2.5">
                  {data.risks.map((risk) => (
                    <Link key={risk.id} href={risk.href} className={cn("block rounded-xl border p-3", risk.severity === "critical" ? "border-rose-300/18 bg-rose-300/[0.07] text-rose-200" : risk.severity === "warning" ? "border-amber-300/15 bg-amber-300/[0.055] text-amber-200" : "border-cyan-300/12 bg-cyan-300/[0.045] text-cyan-200")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold">{risk.title}</div>
                          <div className="mt-1 text-[10px] leading-4 opacity-70">{risk.summary}</div>
                          {risk.ownerName ? <div className="mt-2 text-[9px] uppercase tracking-[0.12em] opacity-60">{risk.ownerName}</div> : null}
                        </div>
                        <ArrowRight className="mt-1 size-3.5 shrink-0" />
                      </div>
                    </Link>
                  ))}
                  {!data.risks.length ? <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-300/45" /><div className="mt-3 text-xs text-slate-500">Không có rủi ro capacity nổi bật.</div></div> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="tech-panel rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Capacity Calendar</div>
                <h2 className="mt-1.5 text-sm font-semibold text-white">Mật độ deadline 4 tuần tới</h2>
              </div>
              <CalendarDays className="size-5 text-cyan-300/70" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {data.calendar.map((bucket) => (
                <div key={bucket.startDate} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-4">
                  <div className="text-xs font-semibold text-slate-100">{bucket.label}</div>
                  <div className="mt-1 text-[10px] text-slate-600">{formatDate(bucket.startDate)} → {formatDate(bucket.endDate)}</div>
                  <div className="mt-4 text-2xl font-semibold text-white">{bucket.dueItems}</div>
                  <div className="mt-1 text-[10px] text-slate-600">{bucket.overloadedDueItems} việc thuộc người quá tải</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : loading ? null : (
        <div className="tech-panel rounded-2xl p-10 text-center text-sm text-slate-500">
          <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-cyan-300/70" />
          Đang chuẩn bị dữ liệu Workload.
        </div>
      )}
    </>
  );
}
