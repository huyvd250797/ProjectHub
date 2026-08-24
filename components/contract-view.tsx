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
  CircleDot,
  FileSearch,
  FilterX,
  Layers3,
  LoaderCircle,
  Network,
  PanelRightClose,
  Rows3,
  Search,
  Unlink2,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  ContractApiResponse,
  ContractData,
  ContractDetailItem,
  ContractOverviewItem,
} from "@/lib/contract/types";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 48;
const VIEWPORT_HEIGHT = 560;
const OVERSCAN = 8;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function itemTypeLabel(itemType: ContractOverviewItem["itemType"]) {
  if (itemType === "subsystem") return "Phân hệ";
  if (itemType === "module") return "Module";
  if (itemType === "root") return "Nhóm";
  return "Khác";
}

function progressTone(progress: number) {
  if (progress >= 85) return "bg-emerald-300/75";
  if (progress >= 60) return "bg-cyan-300/70";
  if (progress >= 35) return "bg-amber-300/75";
  return "bg-rose-300/70";
}

function ContractLoading() {
  return (
    <div className="tech-panel grid min-h-[420px] place-items-center rounded-2xl">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300/70" />
        <div className="mt-4 text-xs font-medium text-slate-300">Đang tải PLHĐ theo project...</div>
        <div className="mt-1 text-[10px] text-slate-600">Contract overview + detail tree</div>
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
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/20 hover:text-white"
          >
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
    ["Chi tiết PLHĐ", data.summary.details, "text-slate-200"],
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

type FlatDetailRow = { item: ContractDetailItem; depth: number };

function buildDetailRows(
  details: ContractDetailItem[],
  expanded: Set<string>,
  search: string,
  focusContractItemId: string,
) {
  const byId = new Map(details.map((item) => [item.id, item]));
  const children = new Map<string | null, ContractDetailItem[]>();
  for (const item of details) {
    const parentKey = item.parentId && byId.has(item.parentId) ? item.parentId : null;
    const bucket = children.get(parentKey) ?? [];
    bucket.push(item);
    children.set(parentKey, bucket);
  }
  for (const bucket of children.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  }

  let allowed: Set<string> | null = null;
  const searchTerm = normalize(search);

  if (focusContractItemId) {
    const focused = new Set<string>();
    const seeds = details.filter((item) => item.contractItemId === focusContractItemId);
    const addDescendants = (id: string) => {
      if (focused.has(id)) return;
      focused.add(id);
      for (const child of children.get(id) ?? []) addDescendants(child.id);
    };
    for (const seed of seeds) {
      addDescendants(seed.id);
      let current = seed.parentId ? byId.get(seed.parentId) : undefined;
      while (current) {
        focused.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
    allowed = focused;
  }

  const searchAllowed = new Set<string>();
  if (searchTerm) {
    for (const item of details) {
      const haystack = normalize(`${item.code} ${item.content} ${item.note ?? ""}`);
      if (!haystack.includes(searchTerm)) continue;
      searchAllowed.add(item.id);
      let current = item.parentId ? byId.get(item.parentId) : undefined;
      while (current) {
        searchAllowed.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
    allowed = allowed
      ? new Set([...allowed].filter((id) => searchAllowed.has(id)))
      : searchAllowed;
  }

  const roots = details
    .filter((item) => !item.parentId || !byId.has(item.parentId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  const result: FlatDetailRow[] = [];
  const walk = (item: ContractDetailItem, depth: number) => {
    if (allowed && !allowed.has(item.id)) return;
    result.push({ item, depth });
    const shouldOpen = searchTerm ? true : expanded.has(item.id);
    if (!shouldOpen) return;
    for (const child of children.get(item.id) ?? []) walk(child, depth + 1);
  };

  for (const root of roots) walk(root, 0);
  return result;
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
            ? "ASC WORKING không dùng số mock để thay thế dữ liệu thật. Hãy import/apply contract_items và contract_detail_items cho project đang chọn."
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
  const [view, setView] = useState<"overview" | "detail">("overview");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [itemType, setItemType] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [moduleStatus, setModuleStatus] = useState("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusContractItemId, setFocusContractItemId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<ContractDetailItem | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const detailViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    setSearch("");
    setFocusContractItemId("");
    setSelectedDetail(null);
    setScrollTop(0);

    fetch(`/api/contract?projectId=${encodeURIComponent(selectedProject.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as ContractApiResponse;
        if (!response.ok || !body.ok) {
          throw new Error(body.ok ? "Không tải được PLHĐ." : body.message);
        }
        return body.data;
      })
      .then((contractData) => {
        setData(contractData);
        setExpanded(
          new Set(
            contractData.details
              .filter((item) => !item.parentId && item.hasChildren)
              .map((item) => item.id),
          ),
        );
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

  const filteredOverview = useMemo(() => {
    if (!data) return [];
    const term = normalize(deferredSearch);
    return data.overview.filter((item) => {
      if (itemType !== "all" && item.itemType !== itemType) return false;
      if (departmentId !== "all" && item.ownerDepartmentId !== departmentId) return false;
      if (moduleStatus !== "all" && item.moduleStatusCode !== moduleStatus) return false;
      if (pendingOnly && item.remaining <= 0) return false;
      if (!term) return true;
      return normalize(
        `${item.code} ${item.name} ${item.ownerDepartmentName ?? ""} ${item.moduleStatusLabel ?? ""}`,
      ).includes(term);
    });
  }, [data, deferredSearch, itemType, departmentId, moduleStatus, pendingOnly]);

  const flatDetailRows = useMemo(
    () => data ? buildDetailRows(data.details, expanded, deferredSearch, focusContractItemId) : [],
    [data, expanded, deferredSearch, focusContractItemId],
  );

  const virtualWindow = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(flatDetailRows.length, start + visibleCount);
    return { start, end, rows: flatDetailRows.slice(start, end) };
  }, [flatDetailRows, scrollTop]);

  const focusedModule = useMemo(
    () => data?.overview.find((item) => item.id === focusContractItemId) ?? null,
    [data, focusContractItemId],
  );

  function resetFilters() {
    setSearch("");
    setItemType("all");
    setDepartmentId("all");
    setModuleStatus("all");
    setPendingOnly(false);
    setFocusContractItemId("");
  }

  function toggleNode(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandToLevel(level: number) {
    if (!data) return;
    setExpanded(
      new Set(
        data.details
          .filter((item) => item.hasChildren && item.level < level)
          .map((item) => item.id),
      ),
    );
    detailViewportRef.current?.scrollTo({ top: 0 });
  }

  function collapseAll() {
    setExpanded(new Set());
    detailViewportRef.current?.scrollTo({ top: 0 });
  }

  function openModuleDetail(item: ContractOverviewItem) {
    setView("detail");
    setSearch("");
    setFocusContractItemId(item.id);
    if (data) {
      setExpanded(
        new Set(
          data.details
            .filter((detail) => detail.contractItemId === item.id && detail.hasChildren)
            .map((detail) => detail.id),
        ),
      );
    }
    requestAnimationFrame(() => detailViewportRef.current?.scrollTo({ top: 0 }));
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
            <div className="text-xs font-medium text-amber-100/80">Có {formatNumber(data.summary.unmappedDetails)} node PLHĐ chi tiết chưa mapping Module</div>
            <div className="mt-0.5 text-[10px] text-amber-100/40">PLHĐ Unified View hiển thị trạng thái mapping để PM rà soát; chỉnh mapping trực tiếp sẽ được đưa vào phiên bản nghiệp vụ sau.</div>
          </div>
        </div>
      ) : null}

      <div className="tech-panel overflow-visible rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-fit rounded-xl border border-white/[0.07] bg-black/10 p-1">
            <button
              type="button"
              onClick={() => {
                setView("overview");
                setSearch("");
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                view === "overview"
                  ? "bg-cyan-300/[0.1] text-cyan-100 shadow-[inset_0_0_0_1px_rgba(46,211,255,.08)]"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              <Rows3 className="size-3.5" /> Tổng quan PLHĐ
            </button>
            <button
              type="button"
              onClick={() => {
                setView("detail");
                setSearch("");
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                view === "detail"
                  ? "bg-cyan-300/[0.1] text-cyan-100 shadow-[inset_0_0_0_1px_rgba(46,211,255,.08)]"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              <Network className="size-3.5" /> Chi tiết PLHĐ
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-2 lg:flex-row xl:max-w-[920px]">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={view === "overview" ? "Tìm phân hệ, module..." : "Tìm mã, nội dung, ghi chú..."}
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#091625]/80 pl-9 pr-9 text-xs text-slate-300 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/20 focus:ring-2 focus:ring-cyan-300/[0.04]"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-600 hover:bg-white/[0.04] hover:text-slate-300"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {view === "overview" ? (
              <>
                <ThemedSelect
                  ariaLabel="Lọc loại PLHĐ"
                  value={itemType}
                  onChange={setItemType}
                  className="min-w-[145px]"
                  options={[
                    { value: "all", label: "Tất cả loại" },
                    { value: "subsystem", label: "Phân hệ" },
                    { value: "module", label: "Module" },
                  ]}
                />
                <ThemedSelect
                  ariaLabel="Lọc phòng ban"
                  value={departmentId}
                  onChange={setDepartmentId}
                  className="min-w-[175px]"
                  options={[
                    { value: "all", label: "Tất cả phòng ban" },
                    ...data.filters.departments,
                  ]}
                />
                <ThemedSelect
                  ariaLabel="Lọc trạng thái Module"
                  value={moduleStatus}
                  onChange={setModuleStatus}
                  className="min-w-[185px]"
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    ...data.filters.moduleStatuses,
                  ]}
                />
              </>
            ) : (
              <ThemedSelect
                ariaLabel="Lọc Module chi tiết"
                value={focusContractItemId || "all"}
                onChange={(value) => setFocusContractItemId(value === "all" ? "" : value)}
                className="min-w-[230px]"
                options={[
                  { value: "all", label: "Tất cả Module" },
                  ...data.overview
                    .filter((item) => item.itemType === "module")
                    .map((item) => ({ value: item.id, label: `${item.code ? `${item.code} • ` : ""}${item.name}` })),
                ]}
              />
            )}
          </div>
        </div>

        {view === "overview" ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-4 py-3">
              <button
                type="button"
                onClick={() => setPendingOnly((value) => !value)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition",
                  pendingOnly
                    ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-200"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-600 hover:text-slate-300",
                )}
              >
                Chỉ còn ISSUE chưa bàn giao
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600 transition hover:bg-white/[0.03] hover:text-slate-300"
              >
                <FilterX className="size-3.5" /> Xóa bộ lọc
              </button>
              <span className="text-[10px] text-slate-700">{formatNumber(filteredOverview.length)} dòng</span>
            </div>

            {data.overview.length === 0 ? (
              <EmptyContract source={data.source} />
            ) : (
              <div className="max-h-[650px] overflow-auto scrollbar-thin">
                <table className="w-full min-w-[1180px] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-[#0b192a]/[0.98] text-[9px] uppercase tracking-[0.14em] text-slate-600 backdrop-blur-xl">
                    <tr>
                      {[
                        "Mã",
                        "Phân hệ / Module",
                        "Loại",
                        "Phòng ban",
                        "ISSUE",
                        "Đã bàn giao",
                        "Còn lại",
                        "Tiến độ",
                        "Trạng thái",
                        "Chi tiết",
                      ].map((head) => (
                        <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOverview.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-white/[0.04] text-xs text-slate-400 transition hover:bg-white/[0.025]",
                          item.itemType === "subsystem" && "bg-violet-300/[0.02]",
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-[10px] text-cyan-300/65">{item.code || "—"}</td>
                        <td className="max-w-[330px] px-4 py-3">
                          <div className={cn("truncate font-medium", item.itemType === "subsystem" ? "text-violet-100" : "text-slate-300")} title={item.name}>
                            {item.name}
                          </div>
                          {item.classification ? <div className="mt-1 text-[9px] text-slate-700">{item.classification}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-500">
                            {itemTypeLabel(item.itemType)}
                          </span>
                        </td>
                        <td className="max-w-[180px] px-4 py-3 text-slate-500">
                          <span className="block truncate" title={item.ownerDepartmentName ?? ""}>{item.ownerDepartmentName || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {item.issueTotal > 0 ? (
                            <Link
                              href={`/issues?moduleId=${encodeURIComponent(item.id)}`}
                              className="inline-flex items-center gap-1.5 font-semibold text-cyan-200/80 hover:text-cyan-100"
                            >
                              {item.issueTotal}<ArrowUpRight className="size-3" />
                            </Link>
                          ) : "0"}
                        </td>
                        <td className="px-4 py-3 font-medium text-emerald-300/75">{item.handedOver}</td>
                        <td className={cn("px-4 py-3 font-medium", item.remaining > 0 ? "text-amber-200/80" : "text-slate-600")}>{item.remaining}</td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-[120px] items-center gap-2.5">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                              <div className={cn("h-full rounded-full", progressTone(item.progress))} style={{ width: `${Math.min(100, item.progress)}%` }} />
                            </div>
                            <span className="w-8 text-right text-[10px] text-slate-500">{item.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "rounded-lg border px-2 py-1 text-[9px]",
                            item.moduleStatusLabel
                              ? "border-cyan-300/10 bg-cyan-300/[0.045] text-cyan-100/65"
                              : "border-white/[0.05] bg-white/[0.02] text-slate-700",
                          )}>
                            {item.moduleStatusLabel || "Chưa cập nhật"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openModuleDetail(item)}
                            disabled={item.detailCount === 0}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1.5 text-[9px] text-slate-500 transition hover:border-cyan-300/15 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Network className="size-3" /> {formatNumber(item.detailCount)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOverview.length === 0 ? (
                  <div className="grid min-h-[240px] place-items-center text-xs text-slate-600">Không có PLHĐ phù hợp bộ lọc.</div>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-4 py-3">
              <button
                type="button"
                onClick={() => expandToLevel(2)}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300"
              >
                <ChevronsUpDown className="size-3.5" /> Mở đến cấp 2
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300"
              >
                <ChevronsDownUp className="size-3.5" /> Thu gọn
              </button>
              {focusedModule ? (
                <div className="flex items-center gap-2 rounded-lg border border-cyan-300/12 bg-cyan-300/[0.05] px-2.5 py-1.5 text-[10px] text-cyan-100/75">
                  <CircleDot className="size-3 text-cyan-300" />
                  {focusedModule.code ? `${focusedModule.code} • ` : ""}{focusedModule.name}
                  <button type="button" onClick={() => setFocusContractItemId("")} className="text-slate-600 hover:text-white"><X className="size-3" /></button>
                </div>
              ) : null}
              <span className="ml-auto text-[10px] text-slate-700">
                Render {formatNumber(virtualWindow.rows.length)} / {formatNumber(flatDetailRows.length)} dòng hiển thị • Tổng DB {formatNumber(data.summary.details)}
              </span>
            </div>

            {data.details.length === 0 ? (
              <EmptyContract source={data.source} />
            ) : (
              <div className="overflow-hidden">
                <div className="grid h-10 grid-cols-[100px_1fr_130px_110px] items-center border-b border-white/[0.06] bg-[#0b192a]/90 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600 md:grid-cols-[100px_1fr_160px_130px]">
                  <span>Mã</span>
                  <span>Nội dung PLHĐ</span>
                  <span>Loại node</span>
                  <span>Mapping</span>
                </div>
                <div
                  ref={detailViewportRef}
                  onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                  className="scrollbar-thin relative overflow-auto"
                  style={{ height: VIEWPORT_HEIGHT }}
                >
                  <div className="relative min-w-[760px]" style={{ height: flatDetailRows.length * ROW_HEIGHT }}>
                    {virtualWindow.rows.map(({ item, depth }, localIndex) => {
                      const absoluteIndex = virtualWindow.start + localIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedDetail(item)}
                          className="absolute left-0 grid w-full grid-cols-[100px_1fr_160px_130px] items-center border-b border-white/[0.035] px-3 text-left text-xs transition hover:bg-white/[0.025]"
                          style={{ top: absoluteIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                        >
                          <span className="truncate font-mono text-[10px] text-cyan-300/55" title={item.code}>{item.code || "—"}</span>
                          <span className="flex min-w-0 items-center pr-4" style={{ paddingLeft: Math.min(depth, 8) * 18 }}>
                            <span
                              role="button"
                              tabIndex={-1}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (item.hasChildren) toggleNode(item.id);
                              }}
                              className={cn(
                                "mr-2 grid size-6 shrink-0 place-items-center rounded-md text-slate-600",
                                item.hasChildren && "hover:bg-white/[0.04] hover:text-cyan-200",
                              )}
                            >
                              {item.hasChildren ? (
                                expanded.has(item.id) || deferredSearch ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
                              ) : (
                                <span className="size-1 rounded-full bg-slate-700" />
                              )}
                            </span>
                            <span className={cn("truncate", depth <= 1 ? "font-medium text-slate-300" : "text-slate-400")} title={item.content}>
                              {item.content}
                            </span>
                            {item.note ? <span className="ml-2 size-1.5 shrink-0 rounded-full bg-amber-300/70" title="Có ghi chú" /> : null}
                          </span>
                          <span className="truncate text-[10px] text-slate-600">{item.nodeType || `Cấp ${item.level}`}</span>
                          <span className="flex items-center gap-1.5 text-[10px]">
                            {item.contractItemId ? (
                              <><CheckCircle2 className="size-3.5 text-emerald-300/60" /><span className="text-emerald-200/55">Đã map</span></>
                            ) : (
                              <><Unlink2 className="size-3.5 text-amber-300/55" /><span className="text-amber-200/45">Chưa map</span></>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-white/[0.05] px-4 py-3 text-[9px] text-slate-700 md:flex-row md:items-center md:justify-between">
          <span>{data.source === "database" ? "Supabase • project_id scoped" : "Demo Mode"} • Generated {new Date(data.generatedAt).toLocaleTimeString("vi-VN")}</span>
          <span>V0.8.0 • PLHĐ Unified View • Virtualized Detail Tree</span>
        </div>
      </div>

      {selectedDetail ? (
        <div className="fixed inset-0 z-[100]">
          <button type="button" aria-label="Đóng chi tiết" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setSelectedDetail(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-cyan-300/10 bg-[#081523]/[0.99] shadow-[-30px_0_80px_rgba(0,0,0,.45)]">
            <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.06] px-5">
              <div className="grid size-9 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05]">
                <Network className="size-4 text-cyan-200/70" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300/55">PLHĐ Detail Node</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-200">{selectedDetail.code || "Không có mã"}</div>
              </div>
              <button type="button" onClick={() => setSelectedDetail(null)} className="ml-auto grid size-9 place-items-center rounded-xl border border-white/[0.06] text-slate-600 hover:text-white">
                <PanelRightClose className="size-4" />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Nội dung</div>
              <div className="mt-2 text-sm leading-6 text-slate-200">{selectedDetail.content}</div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Cấp", String(selectedDetail.level)],
                  ["Loại node", selectedDetail.nodeType || "—"],
                  ["Mapping Module", selectedDetail.contractItemId ? "Đã mapping" : "Chưa mapping"],
                  ["Có node con", selectedDetail.hasChildren ? "Có" : "Không"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-700">{label}</div>
                    <div className="mt-1.5 text-xs font-medium text-slate-400">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Ghi chú</div>
                <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-5 text-slate-500">
                  {selectedDetail.note || "Chưa có ghi chú cho node này."}
                </div>
              </div>
              {selectedDetail.contractItemId ? (
                <Link
                  href={`/issues?moduleId=${encodeURIComponent(selectedDetail.contractItemId)}`}
                  className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.1]"
                >
                  Xem ISSUE của Module <ArrowUpRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
