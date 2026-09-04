"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileSearch,
  FilterX,
  LoaderCircle,
  Network,
  PanelRightClose,
  Search,
  Unlink2,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { ProjectCatalogMutationResponse } from "@/lib/catalog/types";
import type { ContractApiResponse, ContractData, ContractDetailItem, ContractOverviewItem } from "@/lib/contract/types";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 52;
const VIEWPORT_HEIGHT = 640;
const OVERSCAN = 8;

type PlhdNodeKind = "root" | "subsystem" | "module" | "function";
type PlhdNode = {
  key: string;
  sourceId: string;
  sourceType: "item" | "function" | "virtual";
  parentKey: string | null;
  code: string;
  name: string;
  kind: PlhdNodeKind;
  sortOrder: number;
  ownerDepartmentId: string | null;
  ownerDepartmentName: string | null;
  moduleStatusCode: string | null;
  moduleStatusLabel: string | null;
  issueTotal: number;
  handedOver: number;
  remaining: number;
  progress: number;
  detailCount: number;
  note: string | null;
  classification: string | null;
  hasChildren: boolean;
};
type FlatPlhdRow = { item: PlhdNode; depth: number };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi").trim();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function kindLabel(kind: PlhdNodeKind) {
  if (kind === "root") return "Nhóm";
  if (kind === "subsystem") return "Phân hệ";
  if (kind === "module") return "Module";
  return "Chức năng";
}

function progressTone(progress: number) {
  if (progress >= 85) return "bg-emerald-300/75";
  if (progress >= 60) return "bg-cyan-300/70";
  if (progress >= 35) return "bg-amber-300/75";
  return "bg-rose-300/70";
}

function itemKey(id: string) {
  return `item:${id}`;
}

function functionKey(id: string) {
  return `function:${id}`;
}

function buildChildren(nodes: PlhdNode[]) {
  const children = new Map<string | null, PlhdNode[]>();
  for (const item of nodes) {
    const bucket = children.get(item.parentKey) ?? [];
    bucket.push(item);
    children.set(item.parentKey, bucket);
  }
  for (const bucket of children.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, "vi") || a.name.localeCompare(b.name, "vi"));
  }
  return children;
}

function buildPlhdNodes(overview: ContractOverviewItem[], details: ContractDetailItem[]) {
  const itemIds = new Set(overview.map((item) => item.id));
  const detailIds = new Set(details.map((item) => item.id));
  const nodes: PlhdNode[] = overview.map((item) => ({
    key: itemKey(item.id),
    sourceId: item.id,
    sourceType: "item",
    parentKey: item.parentId && itemIds.has(item.parentId) ? itemKey(item.parentId) : null,
    code: item.code,
    name: item.name,
    kind: item.itemType,
    sortOrder: item.sortOrder,
    ownerDepartmentId: item.ownerDepartmentId,
    ownerDepartmentName: item.ownerDepartmentName,
    moduleStatusCode: item.moduleStatusCode,
    moduleStatusLabel: item.moduleStatusLabel,
    issueTotal: item.issueTotal,
    handedOver: item.handedOver,
    remaining: item.remaining,
    progress: item.progress,
    detailCount: item.detailCount,
    note: null,
    classification: item.classification,
    hasChildren: false,
  }));

  const orphanFunctions = details.filter((item) => !item.parentId && !item.contractItemId);
  if (orphanFunctions.length > 0) {
    nodes.push({
      key: "virtual:unmapped-functions",
      sourceId: "unmapped-functions",
      sourceType: "virtual",
      parentKey: null,
      code: "",
      name: "Chức năng chưa gán Module",
      kind: "root",
      sortOrder: 999999,
      ownerDepartmentId: null,
      ownerDepartmentName: null,
      moduleStatusCode: null,
      moduleStatusLabel: null,
      issueTotal: 0,
      handedOver: 0,
      remaining: 0,
      progress: 0,
      detailCount: orphanFunctions.length,
      note: "Các chức năng này chưa có Module liên kết trong danh mục.",
      classification: null,
      hasChildren: false,
    });
  }

  for (const detail of details) {
    let parentKey: string | null = null;
    if (detail.parentId && detailIds.has(detail.parentId)) parentKey = functionKey(detail.parentId);
    else if (detail.contractItemId && itemIds.has(detail.contractItemId)) parentKey = itemKey(detail.contractItemId);
    else if (!detail.parentId && !detail.contractItemId) parentKey = "virtual:unmapped-functions";

    nodes.push({
      key: functionKey(detail.id),
      sourceId: detail.id,
      sourceType: "function",
      parentKey,
      code: detail.code,
      name: detail.content,
      kind: "function",
      sortOrder: detail.sortOrder,
      ownerDepartmentId: null,
      ownerDepartmentName: null,
      moduleStatusCode: null,
      moduleStatusLabel: null,
      issueTotal: 0,
      handedOver: 0,
      remaining: 0,
      progress: 0,
      detailCount: 0,
      note: detail.note,
      classification: detail.nodeType || "function",
      hasChildren: false,
    });
  }

  const children = buildChildren(nodes);
  return nodes.map((item) => ({ ...item, hasChildren: Boolean(children.get(item.key)?.length) }));
}

function buildVisibleRows(
  nodes: PlhdNode[],
  expanded: Set<string>,
  search: string,
  filters: { itemType: string; departmentId: string; moduleStatus: string; pendingOnly: boolean },
) {
  const byKey = new Map(nodes.map((item) => [item.key, item]));
  const children = buildChildren(nodes);
  let allowed: Set<string> | null = null;

  const filterActive = filters.itemType !== "all" || filters.departmentId !== "all" || filters.moduleStatus !== "all" || filters.pendingOnly;
  if (filterActive) {
    allowed = new Set<string>();
    const addAncestors = (item: PlhdNode) => {
      let current: PlhdNode | undefined = item;
      while (current) {
        allowed?.add(current.key);
        current = current.parentKey ? byKey.get(current.parentKey) : undefined;
      }
    };
    const addDescendants = (item: PlhdNode) => {
      allowed?.add(item.key);
      for (const child of children.get(item.key) ?? []) addDescendants(child);
    };
    for (const item of nodes) {
      if (filters.itemType === "function") {
        if (item.kind !== "function") continue;
      } else {
        if (item.sourceType !== "item") continue;
        if (filters.itemType !== "all" && item.kind !== filters.itemType) continue;
        if (filters.departmentId !== "all" && item.ownerDepartmentId !== filters.departmentId) continue;
        if (filters.moduleStatus !== "all" && item.moduleStatusCode !== filters.moduleStatus) continue;
        if (filters.pendingOnly && item.remaining <= 0) continue;
      }
      addAncestors(item);
      addDescendants(item);
    }
  }

  const searchTerm = normalize(search);
  if (searchTerm) {
    const searchAllowed = new Set<string>();
    const addAncestors = (item: PlhdNode) => {
      let current: PlhdNode | undefined = item;
      while (current) {
        searchAllowed.add(current.key);
        current = current.parentKey ? byKey.get(current.parentKey) : undefined;
      }
    };
    const addDescendants = (item: PlhdNode) => {
      searchAllowed.add(item.key);
      for (const child of children.get(item.key) ?? []) addDescendants(child);
    };
    for (const item of nodes) {
      const haystack = normalize(`${item.code} ${item.name} ${kindLabel(item.kind)} ${item.ownerDepartmentName ?? ""} ${item.moduleStatusLabel ?? ""} ${item.note ?? ""}`);
      if (!haystack.includes(searchTerm)) continue;
      addAncestors(item);
      addDescendants(item);
    }
    allowed = allowed ? new Set([...allowed].filter((key) => searchAllowed.has(key))) : searchAllowed;
  }

  const result: FlatPlhdRow[] = [];
  const walk = (item: PlhdNode, depth: number) => {
    if (allowed && !allowed.has(item.key)) return;
    result.push({ item, depth });
    if (!searchTerm && !expanded.has(item.key)) return;
    for (const child of children.get(item.key) ?? []) walk(child, depth + 1);
  };
  for (const root of children.get(null) ?? []) walk(root, 0);
  return result;
}

function expandableKeys(data: ContractData) {
  return buildPlhdNodes(data.overview, data.details).filter((item) => item.hasChildren).map((item) => item.key);
}

function defaultExpandedKeys(data: ContractData) {
  return buildPlhdNodes(data.overview, data.details)
    .filter((item) => item.hasChildren && (item.kind === "root" || item.kind === "subsystem"))
    .map((item) => item.key);
}

function ContractLoading() {
  return (
    <div className="tech-panel grid min-h-[420px] place-items-center rounded-2xl">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300/70" />
        <div className="mt-4 text-xs font-medium text-slate-300">Đang tải cây PLHĐ...</div>
        <div className="mt-1 text-[10px] text-slate-600">Nhóm / Phân hệ / Module / Chức năng</div>
      </div>
    </div>
  );
}

function ContractError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="tech-panel rounded-2xl border-rose-300/10 p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300/15 bg-rose-300/[0.06]">
          <AlertTriangle className="size-4 text-rose-200" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-rose-100">Không tải được PLHĐ</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{message}</div>
          <button type="button" onClick={retry} className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/20 hover:text-white">
            Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStrip({ data }: { data: ContractData }) {
  const metrics = [
    ["Phân hệ", data.summary.subsystems, "text-violet-200"],
    ["Module", data.summary.modules, "text-cyan-200"],
    ["Chức năng", data.summary.details, "text-slate-200"],
    ["ISSUE", data.summary.issues, "text-amber-200"],
    ["Đã bàn giao", data.summary.handedOver, "text-emerald-200"],
    ["Còn lại", data.summary.remaining, "text-rose-200"],
  ] as const;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {metrics.map(([label, value, tone]) => (
        <div key={label} className="tech-panel rounded-xl px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</div>
          <div className={cn("mt-1.5 text-xl font-semibold tracking-[-0.04em]", tone)}>{formatNumber(value)}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyContract({ source }: { source: ContractData["source"] }) {
  return (
    <div className="grid min-h-[360px] place-items-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <FileSearch className="size-5 text-cyan-300/55" />
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-300">Project chưa có dữ liệu PLHĐ</div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {source === "database"
            ? "Danh mục PLHĐ là nguồn chuẩn. Hãy import hoặc khai báo Nhóm / Phân hệ / Module / Chức năng cho project đang chọn."
            : "Demo contract chưa có dữ liệu."}
        </p>
      </div>
    </div>
  );
}

export function ContractView() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [itemType, setItemType] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [moduleStatus, setModuleStatus] = useState("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<PlhdNode | null>(null);
  const [statusSavingKey, setStatusSavingKey] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    setSearch("");
    setSelectedNode(null);
    setScrollTop(0);

    fetch(`/api/contract?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ContractApiResponse;
        if (!response.ok || !body.ok) throw new Error(body.ok ? "Không tải được PLHĐ." : body.message);
        return body.data;
      })
      .then((contractData) => {
        setData(contractData);
        setExpanded(new Set(defaultExpandedKeys(contractData)));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Không tải được PLHĐ.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedProject.id, reloadKey]);

  useEffect(() => {
    const handleCatalogChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (!detail?.projectId || detail.projectId === selectedProject.id) setReloadKey((key) => key + 1);
    };
    window.addEventListener("asc-working:catalog-changed", handleCatalogChanged);
    return () => window.removeEventListener("asc-working:catalog-changed", handleCatalogChanged);
  }, [selectedProject.id]);

  const nodes = useMemo(() => data ? buildPlhdNodes(data.overview, data.details) : [], [data]);
  const flatRows = useMemo(
    () => buildVisibleRows(nodes, expanded, deferredSearch, { itemType, departmentId, moduleStatus, pendingOnly }),
    [nodes, expanded, deferredSearch, itemType, departmentId, moduleStatus, pendingOnly],
  );
  const virtualWindow = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(flatRows.length, start + visibleCount);
    return { start, end, rows: flatRows.slice(start, end) };
  }, [flatRows, scrollTop]);

  function resetFilters() {
    setSearch("");
    setItemType("all");
    setDepartmentId("all");
    setModuleStatus("all");
    setPendingOnly(false);
  }

  function toggleNode(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    if (!data) return;
    setExpanded(new Set(expandableKeys(data)));
    viewportRef.current?.scrollTo({ top: 0 });
  }

  function collapseAll() {
    setExpanded(new Set());
    viewportRef.current?.scrollTo({ top: 0 });
  }

  async function updateModuleStatus(item: PlhdNode, moduleStatusCode: string) {
    if (!data?.canManage || item.sourceType !== "item" || (item.kind !== "subsystem" && item.kind !== "module")) return;
    setStatusSavingKey(item.key);
    try {
      const response = await fetch("/api/project-catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, entity: "moduleStatus", id: item.sourceId, moduleStatusCode }),
      });
      const body = (await response.json()) as ProjectCatalogMutationResponse;
      if (!response.ok || !body.ok) throw new Error(body.ok ? "Không cập nhật được trạng thái." : body.message);
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: "moduleStatus" } }));
      setReloadKey((key) => key + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được trạng thái PLHĐ.");
    } finally {
      setStatusSavingKey("");
    }
  }

  if (loading) return <ContractLoading />;
  if (error) return <ContractError message={error} retry={() => setReloadKey((key) => key + 1)} />;
  if (!data) return null;

  return (
    <>
      <SummaryStrip data={data} />

      {data.summary.unmappedDetails > 0 ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/12 bg-amber-300/[0.045] px-4 py-3">
          <Unlink2 className="mt-0.5 size-4 shrink-0 text-amber-200/70" />
          <div>
            <div className="text-xs font-medium text-amber-100/80">Có {formatNumber(data.summary.unmappedDetails)} chức năng chưa gán Module</div>
            <div className="mt-0.5 text-[10px] text-amber-100/40">Mở Danh mục PLHĐ để gán lại Chức năng vào đúng Module trước khi nghiệm thu dữ liệu.</div>
          </div>
        </div>
      ) : null}

      <div className="tech-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100"><Network className="size-4 text-cyan-300/70" /> Cây PLHĐ duy nhất</div>
            <div className="mt-1 text-[10px] text-slate-600">Nhóm / Phân hệ / Module / Chức năng, lấy dữ liệu trực tiếp từ danh mục project.</div>
          </div>
          <div className="flex flex-1 flex-col gap-2 lg:flex-row xl:max-w-[1020px]">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nhóm, phân hệ, module, chức năng..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#091625]/80 pl-9 pr-9 text-xs text-slate-300 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/20 focus:ring-2 focus:ring-cyan-300/[0.04]" />
              {search ? <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-600 hover:bg-white/[0.04] hover:text-slate-300"><X className="size-3.5" /></button> : null}
            </div>
            <ThemedSelect ariaLabel="Lọc loại PLHĐ" value={itemType} onChange={setItemType} className="min-w-[150px]" options={[{ value: "all", label: "Tất cả loại" }, { value: "root", label: "Nhóm" }, { value: "subsystem", label: "Phân hệ" }, { value: "module", label: "Module" }, { value: "function", label: "Chức năng" }]} />
            <ThemedSelect ariaLabel="Lọc phòng ban" value={departmentId} onChange={setDepartmentId} className="min-w-[175px]" options={[{ value: "all", label: "Tất cả phòng ban" }, ...data.filters.departments]} />
            <ThemedSelect ariaLabel="Lọc trạng thái Module" value={moduleStatus} onChange={setModuleStatus} className="min-w-[185px]" options={[{ value: "all", label: "Tất cả trạng thái" }, ...data.filters.moduleStatuses]} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-4 py-3">
          <button type="button" onClick={() => setPendingOnly((value) => !value)} className={cn("rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition", pendingOnly ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-200" : "border-white/[0.06] bg-white/[0.02] text-slate-600 hover:text-slate-300")}>Chỉ còn ISSUE chưa bàn giao</button>
          <button type="button" onClick={expandAll} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300"><ChevronsUpDown className="size-3.5" /> Mở rộng</button>
          <button type="button" onClick={collapseAll} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300"><ChevronsDownUp className="size-3.5" /> Thu gọn</button>
          <button type="button" onClick={resetFilters} className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600 transition hover:bg-white/[0.03] hover:text-slate-300"><FilterX className="size-3.5" /> Xóa bộ lọc</button>
          <span className="text-[10px] text-slate-700">{formatNumber(flatRows.length)} dòng</span>
        </div>

        {nodes.length === 0 ? <EmptyContract source={data.source} /> : (
          <div className="overflow-hidden">
            <div className="grid h-10 grid-cols-[92px_1fr_120px_150px_78px_94px_94px_140px_180px_90px] items-center border-b border-white/[0.06] bg-[#0b192a]/90 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {["Mã", "Cấu trúc PLHĐ", "Loại", "Phòng ban", "ISSUE", "Đã bàn giao", "Còn lại", "Tiến độ", "Trạng thái", "Chi tiết"].map((head) => <span key={head}>{head}</span>)}
            </div>
            <div ref={viewportRef} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)} className="scrollbar-thin relative overflow-auto" style={{ height: VIEWPORT_HEIGHT }}>
              <div className="relative min-w-[1230px]" style={{ height: flatRows.length * ROW_HEIGHT }}>
                {virtualWindow.rows.map(({ item, depth }, localIndex) => {
                  const absoluteIndex = virtualWindow.start + localIndex;
                  const editableStatus = data.canManage && item.sourceType === "item" && (item.kind === "subsystem" || item.kind === "module");
                  return (
                    <div key={item.key} role="button" tabIndex={0} onClick={() => setSelectedNode(item)} onKeyDown={(event) => { if (event.key === "Enter") setSelectedNode(item); }} className={cn("absolute left-0 grid w-full grid-cols-[92px_1fr_120px_150px_78px_94px_94px_140px_180px_90px] items-center border-b border-white/[0.035] px-3 text-left text-xs transition hover:bg-white/[0.025]", item.kind === "root" && "bg-cyan-300/[0.025]", item.kind === "subsystem" && "bg-violet-300/[0.018]")} style={{ top: absoluteIndex * ROW_HEIGHT, height: ROW_HEIGHT }}>
                      <span className="truncate font-mono text-[10px] text-cyan-300/60" title={item.code}>{item.code || "-"}</span>
                      <span className="flex min-w-0 items-center pr-4" style={{ paddingLeft: Math.min(depth, 7) * 18 }}>
                        <button type="button" onClick={(event) => { event.stopPropagation(); if (item.hasChildren) toggleNode(item.key); }} className={cn("mr-2 grid size-6 shrink-0 place-items-center rounded-md text-slate-600", item.hasChildren && "hover:bg-white/[0.04] hover:text-cyan-200")}>
                          {item.hasChildren ? (expanded.has(item.key) || deferredSearch ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />) : <span className="size-1 rounded-full bg-slate-700" />}
                        </button>
                        <span className={cn("truncate", item.kind === "root" ? "font-semibold text-cyan-100" : item.kind === "subsystem" ? "font-semibold text-violet-100" : item.kind === "module" ? "font-medium text-slate-200" : "text-slate-400")} title={item.name}>{item.name}</span>
                        {item.note ? <span className="ml-2 size-1.5 shrink-0 rounded-full bg-amber-300/70" title={item.note} /> : null}
                      </span>
                      <span><span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-500">{kindLabel(item.kind)}</span></span>
                      <span className="truncate text-slate-500" title={item.ownerDepartmentName ?? ""}>{item.ownerDepartmentName || "-"}</span>
                      <span className="font-semibold text-cyan-200/75">{item.issueTotal > 0 && item.sourceType === "item" ? <Link href={`/issues?moduleId=${encodeURIComponent(item.sourceId)}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1">{item.issueTotal}<ArrowUpRight className="size-3" /></Link> : "0"}</span>
                      <span className="font-medium text-emerald-300/70">{item.handedOver || 0}</span>
                      <span className={cn("font-medium", item.remaining > 0 ? "text-amber-200/80" : "text-slate-600")}>{item.remaining || 0}</span>
                      <span className="flex min-w-[120px] items-center gap-2.5"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><span className={cn("block h-full rounded-full", progressTone(item.progress))} style={{ width: `${Math.min(100, item.progress)}%` }} /></span><span className="w-8 text-right text-[10px] text-slate-500">{item.progress}%</span></span>
                      <span onClick={(event) => event.stopPropagation()}>
                        {editableStatus ? (
                          <ThemedSelect ariaLabel={`Trạng thái ${item.name}`} value={item.moduleStatusCode ?? ""} onChange={(value) => void updateModuleStatus(item, value)} disabled={statusSavingKey === item.key} buttonClassName="h-8" options={[{ value: "", label: "Chưa cập nhật" }, ...data.filters.moduleStatuses]} />
                        ) : (
                          <span className={cn("rounded-lg border px-2 py-1 text-[9px]", item.moduleStatusLabel ? "border-cyan-300/10 bg-cyan-300/[0.045] text-cyan-100/65" : "border-white/[0.05] bg-white/[0.02] text-slate-700")}>{item.moduleStatusLabel || "-"}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px]">{item.kind === "function" ? <><CheckCircle2 className="size-3.5 text-emerald-300/60" /><span className="text-emerald-200/55">Function</span></> : <><Network className="size-3.5 text-cyan-300/55" /><span className="text-slate-500">{formatNumber(item.detailCount)}</span></>}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {flatRows.length === 0 ? <div className="grid min-h-[240px] place-items-center text-xs text-slate-600">Không có dòng PLHĐ phù hợp bộ lọc.</div> : null}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-white/[0.05] px-4 py-3 text-[9px] text-slate-700 md:flex-row md:items-center md:justify-between">
          <span>{data.source === "database" ? "Supabase • project_id scoped" : "Demo Mode"} • Generated {new Date(data.generatedAt).toLocaleTimeString("vi-VN")}</span>
          <span>V2.2.0 • Single PLHĐ Function Tree</span>
        </div>
      </div>

      {selectedNode ? (
        <div className="fixed inset-0 z-[100]">
          <button type="button" aria-label="Đóng chi tiết" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setSelectedNode(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-cyan-300/10 bg-[#081523]/[0.99] shadow-[-30px_0_80px_rgba(0,0,0,.45)]">
            <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.06] px-5">
              <div className="grid size-9 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05]"><Network className="size-4 text-cyan-200/70" /></div>
              <div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300/55">{kindLabel(selectedNode.kind)}</div><div className="mt-1 truncate text-sm font-semibold text-slate-200">{selectedNode.code || "Không có mã"}</div></div>
              <button type="button" onClick={() => setSelectedNode(null)} className="ml-auto grid size-9 place-items-center rounded-xl border border-white/[0.06] text-slate-600 hover:text-white"><PanelRightClose className="size-4" /></button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Nội dung</div>
              <div className="mt-2 text-sm leading-6 text-slate-200">{selectedNode.name}</div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[["Loại", kindLabel(selectedNode.kind)], ["Phòng ban", selectedNode.ownerDepartmentName || "-"], ["Trạng thái", selectedNode.moduleStatusLabel || "Chưa cập nhật"], ["Có cấp con", selectedNode.hasChildren ? "Có" : "Không"], ["ISSUE", String(selectedNode.issueTotal)], ["Còn lại", String(selectedNode.remaining)]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[9px] uppercase tracking-[0.12em] text-slate-700">{label}</div><div className="mt-1.5 text-xs font-medium text-slate-400">{value}</div></div>
                ))}
              </div>
              <div className="mt-6"><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Ghi chú / phân loại</div><div className="mt-2 rounded-xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-5 text-slate-500">{selectedNode.note || selectedNode.classification || "Chưa có ghi chú cho dòng này."}</div></div>
              {selectedNode.sourceType === "item" && selectedNode.issueTotal > 0 ? <Link href={`/issues?moduleId=${encodeURIComponent(selectedNode.sourceId)}`} className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.1]">Xem ISSUE liên quan <ArrowUpRight className="size-3.5" /></Link> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
