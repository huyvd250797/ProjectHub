"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Columns3,
  CopyPlus,
  Download,
  ExternalLink,
  FilterX,
  Layers3,
  ListTodo,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/components/project-context";
import { IssueDrawer } from "@/components/issues/issue-drawer";
import {
  ColumnManager,
  DEFAULT_ISSUE_PREFERENCES,
  ISSUE_COLUMNS,
  SaveViewModal,
  SavedViewsMenu,
} from "@/components/issues/productivity-panels";
import { FloatingSelect } from "@/components/ui/floating-select";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  IssueBulkMutationResponse,
  IssueColumnId,
  IssueColumnPreferences,
  IssueDetailApiResponse,
  IssueMutationResponse,
  IssuePreferencesApiResponse,
  IssueRow,
  IssueSavedView,
  IssuesApiResponse,
  IssuesData,
  IssueViewsApiResponse,
  SelectOption,
} from "@/lib/issues/types";
import { cn } from "@/lib/utils";

function formatNumber(value: number) { return new Intl.NumberFormat("vi-VN").format(value); }
function formatDate(value: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)); } catch { return value; }
}
function isOverdue(value: string | null) { return Boolean(value && value < new Date().toISOString().slice(0, 10)); }
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

const filterKeys = [
  "status", "customerStatus", "priority", "stage", "moduleId", "departmentId", "assigneeId",
  "missingModule", "missingDepartment", "missingAssignee", "overdue", "nearDue", "mine",
];
const savedViewKeys = ["search", ...filterKeys];
const bulkFieldOptions: SelectOption[] = [
  { value: "statusCode", label: "Trạng thái" },
  { value: "customerStatusCode", label: "Trạng thái khách hàng" },
  { value: "priorityCode", label: "Ưu tiên" },
  { value: "stageCode", label: "Giai đoạn" },
  { value: "moduleId", label: "Module" },
  { value: "departmentId", label: "Phòng ban" },
  { value: "assigneeId", label: "Người phụ trách" },
  { value: "dueDate", label: "Due Date" },
];

export function IssueWorkspace() {
  const { selectedProject } = useProject();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<IssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueRow | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState("statusCode");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickContent, setQuickContent] = useState("");
  const [quickPriority, setQuickPriority] = useState("B");
  const [quickSaving, setQuickSaving] = useState(false);
  const [preferences, setPreferences] = useState<IssueColumnPreferences>(DEFAULT_ISSUE_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<IssueSavedView[]>([]);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);
  const previousProject = useRef(selectedProject.id);
  const preferenceSaveTimer = useRef<number | null>(null);

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
    replaceParams((params) => { if (value) params.set(key, value); else params.delete(key); params.delete("page"); });
  }
  function setPage(nextPage: number) {
    replaceParams((params) => { if (nextPage <= 1) params.delete("page"); else params.set("page", String(nextPage)); });
  }
  function clearFilters(keepSearch = false) {
    replaceParams((params) => {
      filterKeys.forEach((key) => params.delete(key));
      params.delete("page"); params.delete("issueId");
      if (!keepSearch) params.delete("search");
    });
    if (!keepSearch) setSearchValue("");
  }
  function currentSavedViewParams() {
    const result: Record<string, string> = {};
    for (const key of savedViewKeys) { const value = searchParams.get(key); if (value) result[key] = value; }
    return result;
  }

  useEffect(() => {
    if (previousProject.current === selectedProject.id) return;
    previousProject.current = selectedProject.id;
    setSelectedIssue(null); setCreateMode(false); setSearchValue(""); setSelectedIds(new Set());
    router.replace(pathname, { scroll: false });
  }, [selectedProject.id, pathname, router]);

  useEffect(() => { setSearchValue(searchParams.get("search") ?? ""); }, [searchParams]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (searchValue.trim() === current) return;
      replaceParams((params) => { if (searchValue.trim()) params.set("search", searchValue.trim()); else params.delete("search"); params.delete("page"); });
    }, 360);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, queryString]);

  useEffect(() => {
    let cancelled = false;
    setPreferencesReady(false);
    fetch(`/api/issues/preferences?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" })
      .then(async (response) => (await response.json()) as IssuePreferencesApiResponse)
      .then((body) => { if (!cancelled && body.ok) setPreferences(body.preferences); })
      .finally(() => { if (!cancelled) setPreferencesReady(true); });
    return () => { cancelled = true; };
  }, [selectedProject.id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/issues/views?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" })
      .then(async (response) => (await response.json()) as IssueViewsApiResponse)
      .then((body) => { if (!cancelled && body.ok) setSavedViews(body.views); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedProject.id]);

  useEffect(() => {
    if (!preferencesReady || data?.source !== "database") return;
    if (preferenceSaveTimer.current) window.clearTimeout(preferenceSaveTimer.current);
    preferenceSaveTimer.current = window.setTimeout(() => {
      void fetch("/api/issues/preferences", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, ...preferences }),
      });
    }, 650);
    return () => { if (preferenceSaveTimer.current) window.clearTimeout(preferenceSaveTimer.current); };
  }, [preferences, preferencesReady, data?.source, selectedProject.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", selectedProject.id);
    params.set("pageSize", String(preferences.pageSize));
    fetch(`/api/issues?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => { const body = (await response.json()) as IssuesApiResponse; if (!body.ok) throw new Error(body.message); if (!cancelled) setData(body.data); })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : "Không tải được ISSUE."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [selectedProject.id, queryString, reloadKey, preferences.pageSize]);

  useEffect(() => { setSelectedIds(new Set()); }, [selectedProject.id, queryString]);

  useEffect(() => {
    if (!issueIdParam || createMode) return;
    const inPage = data?.rows.find((row) => row.id === issueIdParam);
    if (inPage) { setSelectedIssue(inPage); return; }
    if (!data || data.source === "demo") return;
    let cancelled = false;
    fetch(`/api/issues/${encodeURIComponent(issueIdParam)}?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" })
      .then(async (response) => { const body = (await response.json()) as IssueDetailApiResponse; if (!body.ok) throw new Error(body.message); if (!cancelled) setSelectedIssue(body.data.issue); })
      .catch(() => { if (!cancelled) replaceParams((params) => params.delete("issueId")); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueIdParam, data?.rows, selectedProject.id, createMode]);

  const activeFilterCount = useMemo(() => filterKeys.filter((key) => searchParams.has(key)).length, [queryString, searchParams]);
  const summaryCards = data ? [
    ["Tổng ISSUE", data.summary.total, ListTodo, "text-cyan-200", () => clearFilters(true)],
    ["Chưa bàn giao", data.summary.notHandedOver, CircleAlert, "text-amber-200", () => setFilter("customerStatus", "not_handed_over")],
    ["Tôi phụ trách", data.summary.mine, UserRound, "text-violet-200", () => setFilter("mine", "1")],
    ["Quá hạn", data.summary.overdue, CalendarClock, "text-rose-200", () => setFilter("overdue", "1")],
    ["Chờ xử lý", data.summary.waiting, CheckCircle2, "text-amber-200", () => setFilter("status", "waiting")],
    ["Thiếu phụ trách", data.summary.missingAssignee, AlertTriangle, "text-rose-200", () => setFilter("missingAssignee", "1")],
  ] as const : [];

  const orderedVisibleColumns = useMemo(() => preferences.columnOrder.filter((id) => preferences.visibleColumns.includes(id)), [preferences]);
  const totalTableWidth = useMemo(() => 46 + orderedVisibleColumns.reduce((sum, id) => sum + (preferences.columnWidths[id] ?? 160), 0), [orderedVisibleColumns, preferences.columnWidths]);
  function pinnedLeft(id: IssueColumnId) {
    if (!preferences.pinnedColumns.includes(id)) return undefined;
    let left = 46;
    for (const current of orderedVisibleColumns) {
      if (current === id) break;
      if (preferences.pinnedColumns.includes(current)) left += preferences.columnWidths[current] ?? 160;
    }
    return left;
  }

  async function inlineUpdate(issue: IssueRow, field: string, value: string | null) {
    if (!data?.canEdit || data.source !== "database") return;
    setSavingId(issue.id); setNotice(""); setError("");
    try {
      const response = await fetch(`/api/issues/${encodeURIComponent(issue.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, [field]: value }) });
      const body = (await response.json()) as IssueMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setData((current) => current ? { ...current, rows: current.rows.map((row) => row.id === issue.id ? body.issue : row) } : current);
      if (selectedIssue?.id === issue.id) setSelectedIssue(body.issue);
      setNotice(`Đã cập nhật ISSUE #${body.issue.issueNo ?? "—"}`); setReloadKey((key) => key + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không cập nhật được ISSUE."); }
    finally { setSavingId(null); }
  }

  async function applyBulkUpdate() {
    if (!data || !selectedIds.size || !data.canEdit || data.source !== "database") return;
    if (!bulkValue) { setError("Chọn giá trị cần cập nhật hàng loạt."); return; }
    setBulkSaving(true); setError(""); setNotice("");
    const value = bulkValue === "__clear__" ? null : bulkValue;
    try {
      const response = await fetch("/api/issues/bulk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, issueIds: [...selectedIds], patch: { [bulkField]: value } }) });
      const body = (await response.json()) as IssueBulkMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setNotice(`Đã cập nhật ${body.updated} ISSUE.`); setSelectedIds(new Set()); setBulkValue(""); setReloadKey((key) => key + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Bulk update thất bại."); }
    finally { setBulkSaving(false); }
  }

  async function quickAdd() {
    if (!data?.canEdit || data.source !== "database" || !quickContent.trim()) return;
    setQuickSaving(true); setError("");
    try {
      const response = await fetch("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, content: quickContent.trim(), statusCode: "waiting", customerStatusCode: "not_handed_over", priorityCode: quickPriority }) });
      const body = (await response.json()) as IssueMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setQuickContent(""); setNotice(`Đã tạo nhanh ISSUE #${body.issue.issueNo ?? "—"}`); setReloadKey((key) => key + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không tạo được ISSUE."); }
    finally { setQuickSaving(false); }
  }

  async function duplicateSelected() {
    if (!data || selectedIds.size !== 1 || data.source !== "database") return;
    const issue = data.rows.find((row) => selectedIds.has(row.id));
    if (!issue) return;
    setBulkSaving(true); setError("");
    try {
      const response = await fetch("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        projectId: selectedProject.id, content: issue.content, statusCode: "waiting", customerStatusCode: "not_handed_over", priorityCode: issue.priorityCode ?? "B", stageCode: issue.stageCode, dueDate: issue.dueDate, moduleId: issue.moduleId, departmentId: issue.departmentId, requesterId: issue.requesterId, assigneeId: issue.assigneeId, notes: issue.notes ? `${issue.notes}\nNhân bản từ ISSUE #${issue.issueNo ?? "—"}` : `Nhân bản từ ISSUE #${issue.issueNo ?? "—"}`,
      }) });
      const body = (await response.json()) as IssueMutationResponse;
      if (!body.ok) throw new Error(body.message);
      setSelectedIds(new Set()); setNotice(`Đã nhân bản thành ISSUE #${body.issue.issueNo ?? "—"}`); setReloadKey((key) => key + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không nhân bản được ISSUE."); }
    finally { setBulkSaving(false); }
  }

  function exportIssues() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); params.delete("issueId"); params.set("projectId", selectedProject.id);
    window.location.href = `/api/issues/export?${params.toString()}`;
  }

  async function saveCurrentView(name: string) {
    setViewSaving(true); setError("");
    try {
      const response = await fetch(`/api/issues/views?projectId=${encodeURIComponent(selectedProject.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, name, queryParams: currentSavedViewParams() }) });
      const body = (await response.json()) as IssueViewsApiResponse;
      if (!body.ok) throw new Error(body.message);
      setSavedViews(body.views); setSaveViewOpen(false); setNotice(`Đã lưu Saved View “${name}”.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được Saved View."); }
    finally { setViewSaving(false); }
  }
  function applySavedView(view: IssueSavedView) {
    const params = new URLSearchParams();
    Object.entries(view.queryParams).forEach(([key, value]) => params.set(key, value));
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }
  async function deleteSavedView(view: IssueSavedView) {
    if (!window.confirm(`Xóa Saved View “${view.name}”?`)) return;
    try {
      const response = await fetch(`/api/issues/views?projectId=${encodeURIComponent(selectedProject.id)}&viewId=${encodeURIComponent(view.id)}`, { method: "DELETE" });
      const body = (await response.json()) as IssueViewsApiResponse;
      if (!body.ok) throw new Error(body.message);
      setSavedViews((current) => current.filter((item) => item.id !== view.id)); setNotice(`Đã xóa Saved View “${view.name}”.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không xóa được Saved View."); }
  }

  function openIssue(issue: IssueRow) { setCreateMode(false); setSelectedIssue(issue); replaceParams((params) => params.set("issueId", issue.id)); }
  function closeDrawer() { setCreateMode(false); setSelectedIssue(null); replaceParams((params) => params.delete("issueId")); }
  function onSaved(issue: IssueRow) { setSelectedIssue(issue); setCreateMode(false); replaceParams((params) => params.set("issueId", issue.id)); setNotice(`Đã lưu ISSUE #${issue.issueNo ?? "—"}`); setReloadKey((key) => key + 1); }
  function onArchived(issueId: string) { if (selectedIssue?.id === issueId) closeDrawer(); setNotice("Đã archive ISSUE."); setReloadKey((key) => key + 1); }

  function bulkOptions(): SelectOption[] {
    const clear = [{ value: "__clear__", label: "Xóa / Chưa gán" }];
    if (!data) return clear;
    if (bulkField === "statusCode") return data.lookups.statuses;
    if (bulkField === "customerStatusCode") return data.lookups.customerStatuses;
    if (bulkField === "priorityCode") return data.lookups.priorities;
    if (bulkField === "stageCode") return [...clear, ...data.lookups.stages];
    if (bulkField === "moduleId") return [...clear, ...data.lookups.modules];
    if (bulkField === "departmentId") return [...clear, ...data.lookups.departments];
    if (bulkField === "assigneeId") return [...clear, ...data.lookups.assignees];
    return clear;
  }

  if (loading && !data) return <div className="tech-panel grid min-h-[480px] place-items-center rounded-2xl"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-cyan-300/70" /><div className="mt-4 text-xs font-medium text-slate-300">Đang tải ISSUE Productivity...</div><div className="mt-1 text-[10px] text-slate-600">Bulk • Saved Views • Columns • Export</div></div></div>;
  if (!data && error) return <div className="tech-panel rounded-2xl border-rose-300/10 p-6"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 text-rose-200" /><div><div className="text-sm font-semibold text-rose-100">Không tải được ISSUE</div><div className="mt-1 text-xs leading-5 text-slate-500">{error}</div><button onClick={() => setReloadKey((k) => k + 1)} className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-slate-300"><RefreshCw className="size-3.5" /> Tải lại</button></div></div></div>;
  if (!data) return null;

  // Capture the narrowed value before entering nested callbacks/functions.
  // TypeScript does not preserve control-flow narrowing of a mutable React state
  // variable inside closures because the closure may run later.
  const currentData = data;
  const allCurrentSelected = currentData.rows.length > 0 && currentData.rows.every((row) => selectedIds.has(row.id));

  function renderCell(issue: IssueRow, id: IssueColumnId) {
    const editingDisabled = !currentData.canEdit || currentData.source === "demo" || savingId === issue.id;
    if (id === "issueNo") return <span className="font-mono text-[10px] text-cyan-300/65">#{issue.issueNo ?? "—"}</span>;
    if (id === "content") return <div><div className="line-clamp-2 font-medium leading-5 text-slate-300 group-hover:text-white">{issue.content}</div>{issue.requesterName ? <div className="mt-1 text-[9px] text-slate-700">YC: {issue.requesterName}</div> : null}</div>;
    if (id === "status") return <FloatingSelect ariaLabel="Trạng thái" compact disabled={editingDisabled} value={issue.statusCode} options={currentData.lookups.statuses} onChange={(value) => inlineUpdate(issue, "statusCode", value)} tone={statusTone(issue.statusCode)} />;
    if (id === "customerStatus") return <FloatingSelect ariaLabel="Trạng thái khách hàng" compact disabled={editingDisabled} value={issue.customerStatusCode} options={currentData.lookups.customerStatuses} onChange={(value) => inlineUpdate(issue, "customerStatusCode", value)} placeholder="Chưa bàn giao" />;
    if (id === "priority") return <FloatingSelect ariaLabel="Ưu tiên" compact disabled={editingDisabled} value={issue.priorityCode} options={currentData.lookups.priorities} onChange={(value) => inlineUpdate(issue, "priorityCode", value)} tone={priorityTone(issue.priorityCode)} />;
    if (id === "module") return <FloatingSelect ariaLabel="Module" compact disabled={editingDisabled} value={issue.moduleId} options={currentData.lookups.modules} onChange={(value) => inlineUpdate(issue, "moduleId", value)} placeholder="Chưa Module" />;
    if (id === "department") return <FloatingSelect ariaLabel="Phòng ban" compact disabled={editingDisabled} value={issue.departmentId} options={currentData.lookups.departments} onChange={(value) => inlineUpdate(issue, "departmentId", value)} placeholder="Chưa phòng ban" />;
    if (id === "assignee") return <FloatingSelect ariaLabel="Phụ trách" compact disabled={editingDisabled} value={issue.assigneeId} options={currentData.lookups.assignees} onChange={(value) => inlineUpdate(issue, "assigneeId", value)} placeholder="Chưa phụ trách" />;
    if (id === "dueDate") return <span className={cn("text-[10px]", isOverdue(issue.dueDate) ? "font-semibold text-rose-300/80" : "text-slate-600")}>{formatDate(issue.dueDate)}</span>;
    return issue.jiraUrl ? <a href={issue.jiraUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2 py-1 text-[9px] text-cyan-300/60 hover:border-cyan-300/18 hover:text-cyan-200"><ExternalLink className="size-3" /> Jira</a> : <span className="text-slate-800">—</span>;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{summaryCards.map(([title, value, Icon, tone, onClick]) => <button key={title} type="button" onClick={onClick} className="tech-panel tech-panel-hover rounded-2xl p-4 text-left"><div className="flex items-start justify-between"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</div><Icon className={cn("size-4", tone)} /></div><div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{formatNumber(value)}</div></button>)}</div>

      {data.source === "demo" ? <div className="mb-4 rounded-xl border border-amber-300/12 bg-amber-300/[0.045] px-4 py-3 text-[10px] text-amber-100/55">Demo Mode • Productivity controls được hiển thị nhưng thao tác ghi dữ liệu bị khóa.</div> : null}
      {notice ? <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-300/12 bg-emerald-300/[0.045] px-4 py-3 text-[10px] text-emerald-100/65"><span>{notice}</span><button onClick={() => setNotice("")}><X className="size-3.5" /></button></div> : null}
      {error ? <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-300/12 bg-rose-300/[0.045] px-4 py-3 text-[10px] text-rose-100/65"><span>{error}</span><button onClick={() => setError("")}><X className="size-3.5" /></button></div> : null}

      <div className="tech-panel overflow-visible rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" /><input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Tìm nội dung, Jira, Module, phòng ban, người phụ trách..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" /></div>
          <div className="flex flex-wrap gap-2">
            <SavedViewsMenu views={savedViews} onApply={applySavedView} onDelete={deleteSavedView} disabled={data.source === "demo"} />
            <button type="button" onClick={() => setSaveViewOpen(true)} disabled={data.source === "demo"} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-slate-200 disabled:opacity-40"><Save className="size-3.5" /> Lưu View</button>
            <button type="button" onClick={() => setColumnManagerOpen(true)} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-slate-200"><Columns3 className="size-3.5" /> Cột</button>
            <button type="button" onClick={exportIssues} disabled={data.source === "demo"} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-slate-200 disabled:opacity-40"><Download className="size-3.5" /> Export</button>
            <button type="button" disabled={!data.canEdit || data.source === "demo"} onClick={() => setQuickOpen((value) => !value)} className={cn("flex h-10 items-center gap-2 rounded-xl border px-3 text-[10px]", quickOpen ? "border-violet-300/18 bg-violet-300/[0.07] text-violet-100" : "border-white/[0.07] bg-white/[0.025] text-slate-500")}><Zap className="size-3.5" /> Thêm nhanh</button>
            <button type="button" disabled={!data.canEdit || data.source === "demo"} onClick={() => { setSelectedIssue(null); setCreateMode(true); }} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-4" /> Thêm ISSUE</button>
          </div>
        </div>

        {quickOpen ? <div className="flex flex-col gap-2 border-b border-violet-300/10 bg-violet-300/[0.025] px-4 py-3 md:flex-row md:items-center"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/70"><Sparkles className="size-3.5" /> Quick Add</div><input autoFocus value={quickContent} onChange={(e) => setQuickContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void quickAdd(); } }} placeholder="Nhập nội dung ISSUE và Enter..." className="h-9 min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-black/10 px-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-violet-300/20" /><div className="w-[105px]"><ThemedSelect ariaLabel="Ưu tiên Quick Add" value={quickPriority} onChange={setQuickPriority} options={data.lookups.priorities} /></div><button disabled={!quickContent.trim() || quickSaving} onClick={() => void quickAdd()} className="flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 text-[10px] font-semibold text-[#0a1020] disabled:opacity-40">{quickSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Tạo</button></div> : null}

        <div className="flex flex-wrap gap-2 border-b border-white/[0.05] px-4 py-3">
          <div className="w-[155px]"><ThemedSelect ariaLabel="Lọc trạng thái" value={searchParams.get("status") ?? ""} onChange={(value) => setFilter("status", value || null)} options={data.lookups.statuses} placeholder="Trạng thái" /></div>
          <div className="w-[150px]"><ThemedSelect ariaLabel="Lọc ưu tiên" value={searchParams.get("priority") ?? ""} onChange={(value) => setFilter("priority", value || null)} options={data.lookups.priorities} placeholder="Ưu tiên" /></div>
          <div className="w-[180px]"><ThemedSelect ariaLabel="Lọc phòng ban" value={searchParams.get("departmentId") ?? ""} onChange={(value) => setFilter("departmentId", value || null)} options={data.lookups.departments} placeholder="Phòng ban" /></div>
          <div className="w-[180px]"><ThemedSelect ariaLabel="Trạng thái khách hàng" value={searchParams.get("customerStatus") ?? ""} onChange={(value) => setFilter("customerStatus", value || null)} options={data.lookups.customerStatuses} placeholder="Trạng thái KH" /></div>
          <div className="w-[180px]"><ThemedSelect ariaLabel="Giai đoạn" value={searchParams.get("stage") ?? ""} onChange={(value) => setFilter("stage", value || null)} options={data.lookups.stages} placeholder="Giai đoạn" /></div>
          <div className="w-[220px]"><ThemedSelect ariaLabel="Module" value={searchParams.get("moduleId") ?? ""} onChange={(value) => setFilter("moduleId", value || null)} options={data.lookups.modules} placeholder="Module" menuClassName="min-w-[360px]" /></div>
          <div className="w-[190px]"><ThemedSelect ariaLabel="Người phụ trách" value={searchParams.get("assigneeId") ?? ""} onChange={(value) => setFilter("assigneeId", value || null)} options={data.lookups.assignees} placeholder="Phụ trách" /></div>
          {[['overdue','Quá hạn'], ['nearDue','Gần hạn 7 ngày'], ['missingModule','Thiếu Module'], ['missingDepartment','Thiếu Phòng ban'], ['missingAssignee','Thiếu phụ trách']].map(([key, title]) => { const active = key === 'nearDue' ? searchParams.has('nearDue') : searchParams.get(key) === '1'; return <button key={key} type="button" onClick={() => setFilter(key, active ? null : key === 'nearDue' ? '7' : '1')} className={cn("h-10 rounded-xl border px-3 text-[10px] transition", active ? "border-cyan-300/18 bg-cyan-300/[0.07] text-cyan-100" : "border-white/[0.07] bg-white/[0.02] text-slate-600 hover:text-slate-300")}>{title}</button>; })}
          {activeFilterCount || searchParams.get("search") ? <button type="button" onClick={() => clearFilters()} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-slate-200"><FilterX className="size-3.5" /> Xóa lọc {activeFilterCount ? `(${activeFilterCount})` : ""}</button> : null}
          <div className="ml-auto flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-slate-700"><span className="size-1.5 rounded-full bg-emerald-300/70" /> {data.role}</div>
        </div>

        {selectedIds.size ? <div className="sticky top-[76px] z-20 flex flex-col gap-2 border-b border-cyan-300/10 bg-[#0a1828]/95 px-4 py-3 shadow-lg backdrop-blur-xl lg:flex-row lg:items-center"><div className="flex items-center gap-2 text-xs font-medium text-cyan-100"><span className="grid size-6 place-items-center rounded-lg bg-cyan-300/[0.1] text-[10px]">{selectedIds.size}</span> ISSUE đã chọn</div><div className="w-[190px]"><ThemedSelect ariaLabel="Trường bulk update" value={bulkField} onChange={(value) => { setBulkField(value); setBulkValue(""); }} options={bulkFieldOptions} /></div>{bulkField === "dueDate" ? <div className="flex gap-1"><input type="date" value={bulkValue === "__clear__" ? "" : bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="h-10 rounded-xl border border-white/[0.08] bg-black/10 px-3 text-xs text-slate-300 outline-none" /><button onClick={() => setBulkValue("__clear__")} className={cn("h-10 rounded-xl border px-3 text-[10px]", bulkValue === "__clear__" ? "border-rose-300/20 bg-rose-300/[0.06] text-rose-200" : "border-white/[0.07] text-slate-600")}>Xóa</button></div> : <div className="w-[240px]"><ThemedSelect ariaLabel="Giá trị bulk update" value={bulkValue} onChange={setBulkValue} options={bulkOptions()} placeholder="Chọn giá trị" menuClassName="min-w-[320px]" /></div>}<button disabled={!bulkValue || bulkSaving} onClick={() => void applyBulkUpdate()} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-[10px] font-semibold text-[#07111f] disabled:opacity-40">{bulkSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />} Cập nhật</button><button disabled={selectedIds.size !== 1 || bulkSaving} onClick={() => void duplicateSelected()} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-400 disabled:opacity-30"><CopyPlus className="size-3.5" /> Nhân bản</button><button onClick={() => setSelectedIds(new Set())} className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-600"><X className="size-3.5" /> Bỏ chọn</button></div> : null}

        <div className="overflow-x-auto">
          <table className="border-collapse text-left" style={{ width: totalTableWidth, minWidth: "100%" }}>
            <thead className="bg-[#0b1727] text-[9px] uppercase tracking-[0.13em] text-slate-600">
              <tr>
                <th className="sticky left-0 z-30 w-[46px] border-b border-r border-white/[0.06] bg-[#0b1727] px-3 py-3"><input type="checkbox" aria-label="Chọn tất cả ISSUE trang này" checked={allCurrentSelected} onChange={(e) => setSelectedIds(e.target.checked ? new Set(data.rows.map((row) => row.id)) : new Set())} className="size-3.5 accent-cyan-300" /></th>
                {orderedVisibleColumns.map((id) => { const spec = ISSUE_COLUMNS.find((item) => item.id === id)!; const width = preferences.columnWidths[id] ?? 160; const left = pinnedLeft(id); const pinned = left !== undefined; return <th key={id} className={cn("border-b border-white/[0.06] px-3 py-3 font-semibold", pinned && "sticky z-20 border-r bg-[#0b1727]")} style={{ width, minWidth: width, maxWidth: width, left }}>{spec.label}</th>; })}
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? data.rows.map((issue) => (
                <tr key={issue.id} onClick={() => openIssue(issue)} className={cn("group cursor-pointer border-b border-white/[0.04] text-xs text-slate-400 transition hover:bg-white/[0.025]", selectedIds.has(issue.id) && "bg-cyan-300/[0.025]") }>
                  <td className="sticky left-0 z-20 w-[46px] border-r border-white/[0.045] bg-[#0b1727] px-3 py-3.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Chọn ISSUE ${issue.issueNo ?? issue.id}`} checked={selectedIds.has(issue.id)} onChange={(e) => setSelectedIds((current) => { const next = new Set(current); if (e.target.checked) next.add(issue.id); else next.delete(issue.id); return next; })} className="size-3.5 accent-cyan-300" /></td>
                  {orderedVisibleColumns.map((id) => { const width = preferences.columnWidths[id] ?? 160; const left = pinnedLeft(id); const pinned = left !== undefined; const interactive = ["status","customerStatus","priority","module","department","assignee","jira"].includes(id); return <td key={id} className={cn("px-3 py-3.5 align-top", pinned && "sticky z-10 border-r border-white/[0.045] bg-[#0b1727]")} style={{ width, minWidth: width, maxWidth: width, left }} onClick={interactive ? (e) => e.stopPropagation() : undefined}><div className="max-w-full overflow-hidden">{renderCell(issue, id)}</div></td>; })}
                </tr>
              )) : <tr><td colSpan={orderedVisibleColumns.length + 1} className="px-4 py-16 text-center"><Layers3 className="mx-auto size-6 text-slate-800" /><div className="mt-3 text-xs text-slate-500">Không có ISSUE phù hợp bộ lọc.</div><button onClick={() => clearFilters()} className="mt-3 text-[10px] text-cyan-300/60 hover:text-cyan-200">Xóa bộ lọc</button></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.05] px-4 py-3 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between"><div>Hiển thị {data.rows.length ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.total)} / {formatNumber(data.total)} ISSUE theo bộ lọc • {preferences.pageSize}/trang</div><div className="flex items-center gap-2">{loading ? <LoaderCircle className="mr-2 size-3.5 animate-spin text-cyan-300/60" /> : null}<button disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] disabled:opacity-25"><ChevronLeft className="size-3.5" /></button><span className="min-w-[72px] text-center">Trang {data.page}/{data.totalPages}</span><button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] disabled:opacity-25"><ChevronRight className="size-3.5" /></button></div></div>
      </div>

      {(createMode || selectedIssue) ? <IssueDrawer projectId={selectedProject.id} issue={selectedIssue} createMode={createMode} lookups={data.lookups} canEdit={data.canEdit} canArchive={data.canArchive} source={data.source} onClose={closeDrawer} onSaved={onSaved} onArchived={onArchived} /> : null}
      <ColumnManager open={columnManagerOpen} value={preferences} onChange={setPreferences} onClose={() => setColumnManagerOpen(false)} />
      <SaveViewModal open={saveViewOpen} onClose={() => setSaveViewOpen(false)} onSave={(name) => void saveCurrentView(name)} saving={viewSaving} />
    </>
  );
}
