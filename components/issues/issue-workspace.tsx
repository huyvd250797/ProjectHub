"use client";

import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FilterX,
  Layers3,
  ListTodo,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/components/project-context";
import { IssueDrawer } from "@/components/issues/issue-drawer";
import { FloatingSelect } from "@/components/ui/floating-select";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { IssueDetailApiResponse, IssueMutationResponse, IssueRow, IssuesApiResponse, IssuesData, SelectOption } from "@/lib/issues/types";
import { cn } from "@/lib/utils";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)); } catch { return value; }
}

function isOverdue(value: string | null) {
  if (!value) return false;
  return value < new Date().toISOString().slice(0, 10);
}

function statusTone(code: string | null) {
  if (code === "released" || code === "resolved") return "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200";
  if (code === "processing") return "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200";
  if (code === "waiting" || code === "waiting_customer") return "border-amber-300/15 bg-amber-300/[0.06] text-amber-200";
  if (code === "not_feasible" || code === "no_action") return "border-slate-400/10 bg-slate-400/[0.04] text-slate-400";
  return "border-white/[0.07] bg-white/[0.025] text-slate-500";
}

function priorityTone(code: string | null) {
  if (code === "A") return "border-rose-300/15 bg-rose-300/[0.06] text-rose-200";
  if (code === "B") return "border-amber-300/15 bg-amber-300/[0.06] text-amber-200";
  if (code === "C") return "border-cyan-300/12 bg-cyan-300/[0.05] text-cyan-200";
  return "border-white/[0.07] bg-white/[0.025] text-slate-500";
}

function label(options: SelectOption[], value: string | null, fallback = "—") {
  if (!value) return fallback;
  return options.find((item) => item.value === value)?.label ?? value;
}

const filterKeys = [
  "status", "customerStatus", "priority", "stage", "moduleId", "departmentId", "assigneeId",
  "missingModule", "missingDepartment", "missingAssignee", "overdue", "nearDue", "mine",
];

export function IssueWorkspace() {
  const { selectedProject } = useProject();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<IssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueRow | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState("");
  const previousProject = useRef(selectedProject.id);

  const queryString = searchParams.toString();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const issueIdParam = searchParams.get("issueId");

  function replaceParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function setFilter(key: string, value: string | null) {
    replaceParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
    });
  }

  function setPage(nextPage: number) {
    replaceParams((params) => {
      if (nextPage <= 1) params.delete("page");
      else params.set("page", String(nextPage));
    });
  }

  function clearFilters(keepSearch = false) {
    replaceParams((params) => {
      filterKeys.forEach((key) => params.delete(key));
      params.delete("page");
      if (!keepSearch) params.delete("search");
    });
    if (!keepSearch) setSearchValue("");
  }

  useEffect(() => {
    if (previousProject.current === selectedProject.id) return;
    previousProject.current = selectedProject.id;
    setSelectedIssue(null);
    setCreateMode(false);
    setSearchValue("");
    const params = new URLSearchParams();
    router.replace(pathname, { scroll: false });
    void params;
  }, [selectedProject.id, pathname, router]);

  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (searchValue.trim() === current) return;
      replaceParams((params) => {
        if (searchValue.trim()) params.set("search", searchValue.trim());
        else params.delete("search");
        params.delete("page");
      });
    }, 420);
    return () => window.clearTimeout(timer);
    // searchParams is intentionally represented by queryString to avoid object-identity loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, queryString]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", selectedProject.id);
    params.set("pageSize", "50");
    fetch(`/api/issues?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as IssuesApiResponse;
        if (!body.ok) throw new Error("message" in body ? body.message : "Không tải được dữ liệu.");
        if (!cancelled) setData(body.data);
      })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : "Không tải được ISSUE."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selectedProject.id, queryString, reloadKey]);

  useEffect(() => {
    if (!issueIdParam || createMode) return;
    const inPage = data?.rows.find((row) => row.id === issueIdParam);
    if (inPage) {
      setSelectedIssue(inPage);
      return;
    }
    if (!data || data.source === "demo") return;
    let cancelled = false;
    fetch(`/api/issues/${encodeURIComponent(issueIdParam)}?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as IssueDetailApiResponse;
        if (!body.ok) throw new Error("message" in body ? body.message : "Không tải được dữ liệu.");
        if (!cancelled) setSelectedIssue(body.data.issue);
      })
      .catch(() => {
        if (!cancelled) replaceParams((params) => params.delete("issueId"));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueIdParam, data?.rows, selectedProject.id, createMode]);

  const activeFilterCount = useMemo(
    () => filterKeys.filter((key) => searchParams.has(key)).length,
    [queryString, searchParams],
  );

  const summaryCards = data ? [
    ["Tổng ISSUE", data.summary.total, ListTodo, "text-cyan-200", () => clearFilters(true)],
    ["Chưa bàn giao", data.summary.notHandedOver, CircleAlert, "text-amber-200", () => setFilter("customerStatus", "not_handed_over")],
    ["Tôi phụ trách", data.summary.mine, UserRound, "text-violet-200", () => setFilter("mine", "1")],
    ["Quá hạn", data.summary.overdue, CalendarClock, "text-rose-200", () => setFilter("overdue", "1")],
    ["Chờ xử lý", data.summary.waiting, CheckCircle2, "text-amber-200", () => setFilter("status", "waiting")],
    ["Thiếu phụ trách", data.summary.missingAssignee, AlertTriangle, "text-rose-200", () => setFilter("missingAssignee", "1")],
  ] as const : [];

  async function inlineUpdate(issue: IssueRow, field: string, value: string | null) {
    if (!data?.canEdit || data.source !== "database") return;
    setSavingId(issue.id);
    setNotice("");
    try {
      const response = await fetch(`/api/issues/${encodeURIComponent(issue.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, [field]: value }),
      });
      const body = (await response.json()) as IssueMutationResponse;
      if (!body.ok) throw new Error("message" in body ? body.message : "Không tải được dữ liệu.");
      setData((current) => current ? { ...current, rows: current.rows.map((row) => row.id === issue.id ? body.issue : row) } : current);
      if (selectedIssue?.id === issue.id) setSelectedIssue(body.issue);
      setNotice(`Đã cập nhật ISSUE #${body.issue.issueNo ?? "—"}`);
      setReloadKey((key) => key + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được ISSUE.");
    } finally {
      setSavingId(null);
    }
  }

  function openIssue(issue: IssueRow) {
    setCreateMode(false);
    setSelectedIssue(issue);
    replaceParams((params) => params.set("issueId", issue.id));
  }

  function closeDrawer() {
    setCreateMode(false);
    setSelectedIssue(null);
    replaceParams((params) => params.delete("issueId"));
  }

  function onSaved(issue: IssueRow) {
    setSelectedIssue(issue);
    setCreateMode(false);
    replaceParams((params) => params.set("issueId", issue.id));
    setNotice(`Đã lưu ISSUE #${issue.issueNo ?? "—"}`);
    setReloadKey((key) => key + 1);
  }

  function onArchived(issueId: string) {
    if (selectedIssue?.id === issueId) closeDrawer();
    setNotice("Đã archive ISSUE.");
    setReloadKey((key) => key + 1);
  }

  if (loading && !data) {
    return (
      <div className="tech-panel grid min-h-[480px] place-items-center rounded-2xl">
        <div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-cyan-300/70" /><div className="mt-4 text-xs font-medium text-slate-300">Đang tải ISSUE Core...</div><div className="mt-1 text-[10px] text-slate-600">Project • Filter • Relation • History</div></div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="tech-panel rounded-2xl border-rose-300/10 p-6">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 text-rose-200" /><div><div className="text-sm font-semibold text-rose-100">Không tải được ISSUE Core</div><div className="mt-1 text-xs leading-5 text-slate-500">{error}</div><button onClick={() => setReloadKey((k) => k + 1)} className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-slate-300"><RefreshCw className="size-3.5" /> Tải lại</button></div></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map(([title, value, Icon, tone, onClick]) => (
          <button key={title} type="button" onClick={onClick} className="tech-panel tech-panel-hover rounded-2xl p-4 text-left">
            <div className="flex items-start justify-between"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</div><Icon className={cn("size-4", tone)} /></div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{formatNumber(value)}</div>
          </button>
        ))}
      </div>

      {data.source === "demo" ? (
        <div className="mb-4 rounded-xl border border-amber-300/12 bg-amber-300/[0.045] px-4 py-3 text-[10px] text-amber-100/55">Demo Mode • ISSUE đang là dữ liệu minh họa. Khi Supabase được cấu hình, màn hình sẽ chuyển sang CRUD thật theo project.</div>
      ) : null}
      {notice ? <div className="mb-4 rounded-xl border border-emerald-300/12 bg-emerald-300/[0.045] px-4 py-3 text-[10px] text-emerald-100/65">{notice}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-rose-300/12 bg-rose-300/[0.045] px-4 py-3 text-[10px] text-rose-100/65">{error}</div> : null}

      <div className="tech-panel overflow-visible rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
            <input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Tìm nội dung, Jira, Module, phòng ban, người phụ trách..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="w-[155px]"><ThemedSelect ariaLabel="Lọc trạng thái" value={searchParams.get("status") ?? ""} onChange={(value) => setFilter("status", value || null)} options={data.lookups.statuses} placeholder="Trạng thái" /></div>
            <div className="w-[150px]"><ThemedSelect ariaLabel="Lọc ưu tiên" value={searchParams.get("priority") ?? ""} onChange={(value) => setFilter("priority", value || null)} options={data.lookups.priorities} placeholder="Ưu tiên" /></div>
            <div className="w-[180px]"><ThemedSelect ariaLabel="Lọc phòng ban" value={searchParams.get("departmentId") ?? ""} onChange={(value) => setFilter("departmentId", value || null)} options={data.lookups.departments} placeholder="Phòng ban" /></div>
            {activeFilterCount || searchParams.get("search") ? (
              <button type="button" onClick={() => clearFilters()} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-slate-200"><FilterX className="size-3.5" /> Xóa lọc {activeFilterCount ? `(${activeFilterCount})` : ""}</button>
            ) : null}
            <button type="button" disabled={!data.canEdit || data.source === "demo"} onClick={() => { setSelectedIssue(null); setCreateMode(true); }} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-4" /> Thêm ISSUE</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/[0.05] px-4 py-3">
          <div className="w-[180px]"><ThemedSelect ariaLabel="Trạng thái khách hàng" value={searchParams.get("customerStatus") ?? ""} onChange={(value) => setFilter("customerStatus", value || null)} options={data.lookups.customerStatuses} placeholder="Trạng thái KH" /></div>
          <div className="w-[180px]"><ThemedSelect ariaLabel="Giai đoạn" value={searchParams.get("stage") ?? ""} onChange={(value) => setFilter("stage", value || null)} options={data.lookups.stages} placeholder="Giai đoạn" /></div>
          <div className="w-[220px]"><ThemedSelect ariaLabel="Module" value={searchParams.get("moduleId") ?? ""} onChange={(value) => setFilter("moduleId", value || null)} options={data.lookups.modules} placeholder="Module" menuClassName="min-w-[360px]" /></div>
          <div className="w-[190px]"><ThemedSelect ariaLabel="Người phụ trách" value={searchParams.get("assigneeId") ?? ""} onChange={(value) => setFilter("assigneeId", value || null)} options={data.lookups.assignees} placeholder="Phụ trách" /></div>
          {[['overdue','Quá hạn'], ['nearDue','Gần hạn 7 ngày'], ['missingModule','Thiếu Module'], ['missingDepartment','Thiếu Phòng ban'], ['missingAssignee','Thiếu phụ trách']].map(([key, title]) => {
            const active = key === 'nearDue' ? searchParams.has('nearDue') : searchParams.get(key) === '1';
            return <button key={key} type="button" onClick={() => setFilter(key, active ? null : key === 'nearDue' ? '7' : '1')} className={cn("h-10 rounded-xl border px-3 text-[10px] transition", active ? "border-cyan-300/18 bg-cyan-300/[0.07] text-cyan-100" : "border-white/[0.07] bg-white/[0.02] text-slate-600 hover:text-slate-300")}>{title}</button>;
          })}
          <div className="ml-auto flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-slate-700"><span className="size-1.5 rounded-full bg-emerald-300/70" /> {data.role}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] border-collapse text-left">
            <thead className="bg-white/[0.025] text-[9px] uppercase tracking-[0.13em] text-slate-600">
              <tr>
                {['Mã', 'Nội dung yêu cầu', 'Trạng thái', 'KH', 'Ưu tiên', 'Module', 'Phòng ban', 'Phụ trách', 'Due Date', 'Jira'].map((head) => <th key={head} className="border-b border-white/[0.06] px-3 py-3 font-semibold">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? data.rows.map((issue) => (
                <tr key={issue.id} onClick={() => openIssue(issue)} className="group cursor-pointer border-b border-white/[0.04] text-xs text-slate-400 transition hover:bg-white/[0.025]">
                  <td className="px-3 py-3.5 font-mono text-[10px] text-cyan-300/65">#{issue.issueNo ?? "—"}</td>
                  <td className="max-w-[430px] px-3 py-3.5"><div className="line-clamp-2 font-medium leading-5 text-slate-300 group-hover:text-white">{issue.content}</div>{issue.requesterName ? <div className="mt-1 text-[9px] text-slate-700">YC: {issue.requesterName}</div> : null}</td>
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <FloatingSelect ariaLabel="Trạng thái" compact disabled={!data.canEdit || data.source === 'demo' || savingId === issue.id} value={issue.statusCode} options={data.lookups.statuses} onChange={(value) => inlineUpdate(issue, 'statusCode', value)} tone={statusTone(issue.statusCode)} />
                  </td>
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}><FloatingSelect ariaLabel="Trạng thái khách hàng" compact disabled={!data.canEdit || data.source === 'demo' || savingId === issue.id} value={issue.customerStatusCode} options={data.lookups.customerStatuses} onChange={(value) => inlineUpdate(issue, 'customerStatusCode', value)} placeholder="Chưa bàn giao" /></td>
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}><FloatingSelect ariaLabel="Ưu tiên" compact disabled={!data.canEdit || data.source === 'demo' || savingId === issue.id} value={issue.priorityCode} options={data.lookups.priorities} onChange={(value) => inlineUpdate(issue, 'priorityCode', value)} tone={priorityTone(issue.priorityCode)} /></td>
                  <td className="max-w-[190px] px-3 py-3.5" onClick={(e) => e.stopPropagation()}><FloatingSelect ariaLabel="Module" compact disabled={!data.canEdit || data.source === 'demo' || savingId === issue.id} value={issue.moduleId} options={data.lookups.modules} onChange={(value) => inlineUpdate(issue, 'moduleId', value)} placeholder="Chưa Module" /></td>
                  <td className="max-w-[170px] px-3 py-3.5" onClick={(e) => e.stopPropagation()}><FloatingSelect ariaLabel="Phòng ban" compact disabled={!data.canEdit || data.source === 'demo' || savingId === issue.id} value={issue.departmentId} options={data.lookups.departments} onChange={(value) => inlineUpdate(issue, 'departmentId', value)} placeholder="Chưa phòng ban" /></td>
                  <td className="max-w-[150px] px-3 py-3.5" onClick={(e) => e.stopPropagation()}><FloatingSelect ariaLabel="Phụ trách" compact disabled={!data.canEdit || data.source === 'demo' || savingId === issue.id} value={issue.assigneeId} options={data.lookups.assignees} onChange={(value) => inlineUpdate(issue, 'assigneeId', value)} placeholder="Chưa phụ trách" /></td>
                  <td className={cn("px-3 py-3.5 text-[10px]", isOverdue(issue.dueDate) ? "font-semibold text-rose-300/80" : "text-slate-600")}>{formatDate(issue.dueDate)}</td>
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>{issue.jiraUrl ? <a href={issue.jiraUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2 py-1 text-[9px] text-cyan-300/60 hover:border-cyan-300/18 hover:text-cyan-200"><ExternalLink className="size-3" /> Jira</a> : <span className="text-slate-800">—</span>}</td>
                </tr>
              )) : (
                <tr><td colSpan={10} className="px-4 py-16 text-center"><Layers3 className="mx-auto size-6 text-slate-800" /><div className="mt-3 text-xs text-slate-500">Không có ISSUE phù hợp bộ lọc.</div><button onClick={() => clearFilters()} className="mt-3 text-[10px] text-cyan-300/60 hover:text-cyan-200">Xóa bộ lọc</button></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.05] px-4 py-3 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>Hiển thị {data.rows.length ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} / {formatNumber(data.total)} ISSUE theo bộ lọc</div>
          <div className="flex items-center gap-2">
            {loading ? <LoaderCircle className="mr-2 size-3.5 animate-spin text-cyan-300/60" /> : null}
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] disabled:opacity-25"><ChevronLeft className="size-3.5" /></button>
            <span className="min-w-[72px] text-center">Trang {data.page}/{data.totalPages}</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] disabled:opacity-25"><ChevronRight className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {(createMode || selectedIssue) ? (
        <IssueDrawer
          projectId={selectedProject.id}
          issue={selectedIssue}
          createMode={createMode}
          lookups={data.lookups}
          canEdit={data.canEdit}
          canArchive={data.canArchive}
          source={data.source}
          onClose={closeDrawer}
          onSaved={onSaved}
          onArchived={onArchived}
        />
      ) : null}
    </>
  );
}
