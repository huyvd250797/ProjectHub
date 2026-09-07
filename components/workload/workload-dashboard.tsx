"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Gauge,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  Search,
  UserCheck,
  UsersRound,
  X,
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

function formatDate(value: string | null) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value}T00:00:00.000Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatHours(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}h`;
}

function jiraCodeFromUrl(value: string | null) {
  if (!value) return null;
  const match = value.match(/\/browse\/([^/?#]+)/i);
  if (!match?.[1]) return "Jira";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
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
  const width = Math.min(100, member.allocationPercent);
  return (
    <div className="min-w-[180px]">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold", levelClass[member.level])}>{levelLabel[member.level]}</span>
        <span className="text-xs font-semibold text-slate-200">{member.allocationPercent}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/[0.04]">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-700">{formatHours(member.plannedHours)} / {formatHours(member.effectiveCapacityHours)} • risk {member.focusScore}%</div>
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

function MemberIssueModal({ member, onClose }: { member: WorkloadMember; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filteredIssues = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return member.issueItems;
    return member.issueItems.filter((issue) =>
      [
        issue.issueNo ? `#${issue.issueNo}` : "",
        issue.content,
        issue.statusCode,
        issue.priorityCode,
        issue.moduleName,
        issue.departmentName,
        issue.jiraUrl,
      ].some((value) => String(value ?? "").toLowerCase().includes(keyword)),
    );
  }, [member.issueItems, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#07111f] p-3 md:p-4">
      <div className="mb-3 flex shrink-0 items-center gap-3 rounded-2xl border border-cyan-300/12 bg-[#0b1727] px-4 py-3 shadow-xl">
        <div className="grid size-9 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
          <ListTodo className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60">ISSUE Full Screen</div>
          <div className="mt-1 truncate text-xs font-medium text-slate-200">{member.name} • {member.openIssues.toLocaleString("vi-VN")} ISSUE đang phụ trách</div>
        </div>
        <div className="ml-auto hidden items-center gap-4 text-[10px] text-slate-500 md:flex">
          <span>Quá hạn <b className="text-rose-200">{member.overdueIssues.toLocaleString("vi-VN")}</b></span>
          <span>Sắp hạn <b className="text-amber-200">{member.dueSoonIssues.toLocaleString("vi-VN")}</b></span>
          <span>Allocation <b className="text-cyan-200">{member.allocationPercent}%</b></span>
          <span>Planned <b className="text-cyan-200">{formatHours(member.plannedHours)}</b></span>
        </div>
        <button type="button" onClick={onClose} className="ml-2 flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-[10px] text-slate-300 hover:border-cyan-300/20 hover:text-white" title="Đóng modal (Esc)">
          <X className="size-3.5" /> Đóng
        </button>
      </div>

      <div className="tech-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.07] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Assignee Issue Detail</div>
            <h2 className="mt-1.5 text-sm font-semibold text-white">Danh sách ISSUE của {member.name}</h2>
          </div>
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-sm text-slate-600 lg:w-[420px]">
            <Search className="size-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung, module, phòng ban, Jira..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-700" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="asc-data-grid min-w-[1180px] w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#122238] text-[10px] uppercase tracking-[0.16em] text-slate-600">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Nội dung yêu cầu</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3">Ưu tiên</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Est. Hours</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Jira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.055]">
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="align-top hover:bg-white/[0.018]">
                  <td className="px-4 py-4 text-xs font-semibold text-cyan-300">{issue.issueNo ? `#${issue.issueNo}` : "—"}</td>
                  <td className="max-w-[520px] whitespace-normal break-words px-4 py-4 text-sm font-semibold leading-6 text-slate-100">{issue.content}</td>
                  <td className="max-w-[260px] whitespace-normal break-words px-4 py-4 text-xs text-slate-400">{issue.moduleName ?? "—"}</td>
                  <td className="max-w-[240px] whitespace-normal break-words px-4 py-4 text-xs text-slate-400">{issue.departmentName ?? "—"}</td>
                  <td className="px-4 py-4"><span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10px] font-semibold text-slate-300">{issue.priorityCode ?? "—"}</span></td>
                  <td className="px-4 py-4 text-xs text-slate-300">{formatDate(issue.dueDate)}</td>
                  <td className="px-4 py-4 font-mono text-xs text-cyan-200/75">{formatHours(issue.estimatedHours)}</td>
                  <td className="px-4 py-4"><span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10px] font-semibold text-slate-300">{issue.statusCode ?? "—"}</span></td>
                  <td className="px-4 py-4">
                    {issue.jiraUrl ? (
                      <a href={issue.jiraUrl} target="_blank" rel="noreferrer" title={issue.jiraUrl} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-cyan-300/12 px-2 py-1 text-[10px] font-medium text-cyan-300/75 hover:border-cyan-300/25 hover:text-cyan-200">
                        <ExternalLink className="size-3 shrink-0" />
                        <span className="whitespace-normal break-all">{jiraCodeFromUrl(issue.jiraUrl)}</span>
                      </a>
                    ) : <span className="text-slate-800">—</span>}
                  </td>
                </tr>
              ))}
              {!filteredIssues.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-600">Không có ISSUE phù hợp bộ lọc hiện tại.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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

  const selectedMember = useMemo(() => data?.members.find((member) => member.id === selectedMemberId) ?? null, [data?.members, selectedMemberId]);

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
            <KpiCard label="Quá tải" value={data.summary.overloadedMembers} note="Allocation >=100% hoặc nhiều rủi ro" icon={AlertTriangle} tone={data.summary.overloadedMembers ? "rose" : "emerald"} />
            <KpiCard label="Planned Hours" value={formatHours(data.summary.totalPlannedHours)} note={`${data.summary.totalOpenWork} đầu việc đang mở`} icon={BriefcaseBusiness} />
            <KpiCard label="Available Hours" value={formatHours(data.summary.availableHours)} note={`${data.summary.availableMembers} người còn capacity`} icon={UserCheck} tone="emerald" />
            <KpiCard label="Overload Hours" value={formatHours(data.summary.overloadHours)} note={`${data.summary.blockedTasks} task blocked`} icon={ListTodo} tone={data.summary.overloadHours ? "rose" : "emerald"} />
            <KpiCard label="Avg Allocation" value={`${data.summary.averageAllocation}%`} note={`${data.summary.dueSoonWork} việc đến hạn trong 7 ngày`} icon={Gauge} tone={data.summary.averageAllocation >= 100 ? "rose" : data.summary.averageAllocation >= 85 ? "amber" : "cyan"} />
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
                      <th className="px-4 py-3">Allocation</th>
                      <th className="px-4 py-3">Capacity/Week</th>
                      <th className="px-4 py-3">Planned Hours</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3">ISSUE</th>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Deadline gần nhất</th>
                      <th className="px-4 py-3">Khuyến nghị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.055]">
                    {visibleMembers.map((member) => (
                      <tr key={member.id} className="align-top hover:bg-white/[0.018]">
                        <td className="px-4 py-4">
                          <button type="button" onClick={() => setSelectedMemberId(member.id)} className="text-left font-semibold text-cyan-100 underline-offset-4 hover:text-cyan-200 hover:underline" title="Xem danh sách ISSUE đang phụ trách">
                            {member.name}
                          </button>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{member.title ?? member.role ?? "ASC Team"}{member.departmentName ? ` • ${member.departmentName}` : ""}</div>
                          <div className="mt-2 text-[10px] text-slate-700">Bấm tên để xem {member.openIssues.toLocaleString("vi-VN")} ISSUE</div>
                        </td>
                        <td className="px-4 py-4"><CapacityBar member={member} /></td>
                        <td className="px-4 py-4 text-slate-300">{formatHours(member.effectiveCapacityHours)}<div className="mt-1 text-[10px] text-slate-700">{formatHours(member.capacityHoursPerWeek)} × {member.allocationTargetPercent}%</div></td>
                        <td className="px-4 py-4 text-slate-300">{formatHours(member.plannedHours)}<div className="mt-1 text-[10px] text-slate-700">Issue {formatHours(member.issueEstimatedHours)} • Task {formatHours(member.taskEstimatedHours)}</div></td>
                        <td className={cn("px-4 py-4", member.overloadHours ? "font-semibold text-rose-200" : "text-emerald-200")}>{member.overloadHours ? `-${formatHours(member.overloadHours)}` : formatHours(member.availableHours)}<div className="mt-1 text-[10px] text-slate-700">Milestone/Reminder {formatHours(member.milestoneEstimatedHours + member.reminderEstimatedHours)}</div></td>
                        <td className="px-4 py-4 text-slate-300">{member.openIssues}<div className="mt-1 text-[10px] text-slate-700">{member.overdueIssues} quá hạn • {member.dueSoonIssues} sắp hạn</div></td>
                        <td className="px-4 py-4 text-slate-300">{member.openTasks}<div className="mt-1 text-[10px] text-slate-700">{member.blockedTasks} blocked • {member.overdueTasks} quá hạn</div></td>
                        <td className="px-4 py-4 text-slate-300">{formatDate(member.nextDueDate)}</td>
                        <td className="max-w-[300px] whitespace-normal break-words px-4 py-4 text-xs leading-5 text-slate-500">{member.recommendation}</td>
                      </tr>
                    ))}
                    {!visibleMembers.length ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-600">Không có nhân sự phù hợp bộ lọc hiện tại.</td>
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
                        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold", levelClass[suggestion.level])}>{suggestion.allocationPercent}%</span>
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
      {selectedMember ? <MemberIssueModal member={selectedMember} onClose={() => setSelectedMemberId(null)} /> : null}
    </>
  );
}
