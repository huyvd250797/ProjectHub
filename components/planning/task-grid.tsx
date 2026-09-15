"use client";

import {
  CheckCircle2,
  Edit3,
  FilterX,
  GripVertical,
  LoaderCircle,
  Search,
  Trash2,
} from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  PlanPerson,
  ProjectPlanStage,
  ProjectPlanTask,
} from "@/lib/planning/types";
import { cn } from "@/lib/utils";

type TaskColumnId =
  | "code"
  | "title"
  | "description"
  | "stage"
  | "deadline"
  | "estimate"
  | "status"
  | "priority"
  | "owner"
  | "actions";

type TaskFilters = {
  code: string;
  title: string;
  description: string;
  stage: string;
  deadline: string;
  estimate: string;
  status: string;
  priority: string;
  owner: string;
};

const TASK_COLUMNS: Array<{ id: TaskColumnId; label: string; width: number; min: number; max: number }> = [
  { id: "code", label: "Mã task", width: 122, min: 96, max: 200 },
  { id: "title", label: "Tên task", width: 260, min: 180, max: 520 },
  { id: "description", label: "Mô tả", width: 320, min: 200, max: 720 },
  { id: "stage", label: "Thuộc stage", width: 220, min: 150, max: 420 },
  { id: "deadline", label: "Deadline", width: 142, min: 120, max: 220 },
  { id: "estimate", label: "Estimate", width: 112, min: 96, max: 180 },
  { id: "status", label: "Trạng thái task", width: 156, min: 130, max: 240 },
  { id: "priority", label: "Ưu tiên", width: 124, min: 105, max: 200 },
  { id: "owner", label: "Người phụ trách", width: 196, min: 150, max: 360 },
  { id: "actions", label: "Thao tác", width: 132, min: 112, max: 180 },
];

const EMPTY_FILTERS: TaskFilters = {
  code: "",
  title: "",
  description: "",
  stage: "",
  deadline: "",
  estimate: "",
  status: "",
  priority: "",
  owner: "",
};

const statusMeta = {
  todo: { label: "Chưa làm", tone: "border-white/[0.08] bg-white/[0.025] text-slate-400" },
  doing: { label: "Đang làm", tone: "border-cyan-300/16 bg-cyan-300/[0.06] text-cyan-200" },
  blocked: { label: "Bị chặn", tone: "border-rose-300/16 bg-rose-300/[0.06] text-rose-200" },
  done: { label: "Hoàn tất", tone: "border-emerald-300/16 bg-emerald-300/[0.06] text-emerald-200" },
} as const;

const priorityMeta = {
  low: { label: "Thấp", tone: "border-slate-300/12 bg-slate-300/[0.04] text-slate-400" },
  medium: { label: "Trung bình", tone: "border-cyan-300/12 bg-cyan-300/[0.04] text-cyan-200" },
  high: { label: "Cao", tone: "border-amber-300/14 bg-amber-300/[0.05] text-amber-200" },
  critical: { label: "Khẩn cấp", tone: "border-rose-300/16 bg-rose-300/[0.06] text-rose-200" },
} as const;

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

function taskCode(task: ProjectPlanTask) {
  return `TASK-${String(task.taskNo).padStart(4, "0")}`;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(parsed);
}

function displayHours(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} giờ`;
}

function textInput(value: string, onChange: (value: string) => void, placeholder: string, ariaLabel: string) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={ariaLabel} className="h-8 w-full rounded-lg border border-white/[0.065] bg-black/15 px-2 text-[9px] font-normal normal-case tracking-normal text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/25" />;
}

function selectInput(value: string, onChange: (value: string) => void, ariaLabel: string, options: Array<{ value: string; label: string }>) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} className="h-8 w-full rounded-lg border border-white/[0.065] bg-[#0b1727] px-2 text-[9px] font-normal normal-case tracking-normal text-slate-400 outline-none focus:border-cyan-300/25">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

export function TaskGrid({
  projectId,
  tasks,
  stages,
  people,
  canEdit,
  action,
  onEdit,
  onDelete,
  onDone,
}: {
  projectId: string;
  tasks: ProjectPlanTask[];
  stages: ProjectPlanStage[];
  people: PlanPerson[];
  canEdit: boolean;
  action: string;
  onEdit: (task: ProjectPlanTask) => void;
  onDelete: (task: ProjectPlanTask) => void;
  onDone: (task: ProjectPlanTask) => void;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [columnOrder, setColumnOrder] = useState<TaskColumnId[]>(TASK_COLUMNS.map((column) => column.id));
  const [columnWidths, setColumnWidths] = useState<Record<TaskColumnId, number>>(() => Object.fromEntries(TASK_COLUMNS.map((column) => [column.id, column.width])) as Record<TaskColumnId, number>);
  const [layoutReady, setLayoutReady] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<TaskColumnId | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskColumnId | null>(null);
  const storageKey = `asc-working-task-grid-v380:${projectId}`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as { order?: TaskColumnId[]; widths?: Partial<Record<TaskColumnId, number>> };
        const known = new Set(TASK_COLUMNS.map((column) => column.id));
        const savedOrder = Array.isArray(saved.order) ? saved.order.filter((id) => known.has(id)) : [];
        setColumnOrder([...savedOrder, ...TASK_COLUMNS.map((column) => column.id).filter((id) => !savedOrder.includes(id))]);
        setColumnWidths(Object.fromEntries(TASK_COLUMNS.map((column) => {
          const savedWidth = Number(saved.widths?.[column.id]);
          return [column.id, Number.isFinite(savedWidth) ? Math.min(column.max, Math.max(column.min, savedWidth)) : column.width];
        })) as Record<TaskColumnId, number>);
      } catch {
        setColumnOrder(TASK_COLUMNS.map((column) => column.id));
        setColumnWidths(Object.fromEntries(TASK_COLUMNS.map((column) => [column.id, column.width])) as Record<TaskColumnId, number>);
      }
      setLayoutReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!layoutReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ order: columnOrder, widths: columnWidths }));
  }, [columnOrder, columnWidths, layoutReady, storageKey]);

  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDays = new Date(`${today}T00:00:00.000Z`);
    sevenDays.setUTCDate(sevenDays.getUTCDate() + 7);
    const dueSoon = sevenDays.toISOString().slice(0, 10);
    const needle = normalize(search);
    return tasks.filter((task) => {
      const code = taskCode(task);
      const status = statusMeta[task.status].label;
      const priority = priorityMeta[task.priority].label;
      const allText = normalize([code, task.title, task.description, task.stageName, task.dueDate, displayDate(task.dueDate), task.estimatedHours, status, priority, task.ownerName].join(" "));
      if (needle && !allText.includes(needle)) return false;
      if (normalize(filters.code) && !normalize(code).includes(normalize(filters.code))) return false;
      if (normalize(filters.title) && !normalize(task.title).includes(normalize(filters.title))) return false;
      if (normalize(filters.description) && !normalize(task.description).includes(normalize(filters.description))) return false;
      if (filters.stage && (filters.stage === "__none__" ? Boolean(task.stageId) : task.stageId !== filters.stage)) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.owner && (filters.owner === "__none__" ? Boolean(task.ownerId) : task.ownerId !== filters.owner)) return false;
      if (filters.deadline === "none" && task.dueDate) return false;
      if (filters.deadline === "overdue" && (!task.dueDate || task.dueDate >= today || task.status === "done")) return false;
      if (filters.deadline === "today" && task.dueDate !== today) return false;
      if (filters.deadline === "soon" && (!task.dueDate || task.dueDate < today || task.dueDate > dueSoon)) return false;
      if (filters.estimate === "none" && task.estimatedHours !== null) return false;
      if (filters.estimate === "0-4" && (task.estimatedHours === null || task.estimatedHours > 4)) return false;
      if (filters.estimate === "4-8" && (task.estimatedHours === null || task.estimatedHours <= 4 || task.estimatedHours > 8)) return false;
      if (filters.estimate === "8-16" && (task.estimatedHours === null || task.estimatedHours <= 8 || task.estimatedHours > 16)) return false;
      if (filters.estimate === "16+" && (task.estimatedHours === null || task.estimatedHours <= 16)) return false;
      return true;
    });
  }, [filters, search, tasks]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalWidth = columnOrder.reduce((sum, id) => sum + columnWidths[id], 0);

  function setFilter<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
  }

  function resetLayout() {
    setColumnOrder(TASK_COLUMNS.map((column) => column.id));
    setColumnWidths(Object.fromEntries(TASK_COLUMNS.map((column) => [column.id, column.width])) as Record<TaskColumnId, number>);
  }

  function resizeColumn(id: TaskColumnId, event: ReactMouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const spec = TASK_COLUMNS.find((column) => column.id === id)!;
    const startX = event.clientX;
    const startWidth = columnWidths[id];
    const onMove = (moveEvent: MouseEvent) => {
      setColumnWidths((current) => ({ ...current, [id]: Math.min(spec.max, Math.max(spec.min, startWidth + moveEvent.clientX - startX)) }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function dropColumn(target: TaskColumnId) {
    if (!draggedColumn || draggedColumn === target) return;
    setColumnOrder((current) => {
      const next = current.filter((id) => id !== draggedColumn);
      next.splice(next.indexOf(target), 0, draggedColumn);
      return next;
    });
    setDraggedColumn(null);
    setDragOverColumn(null);
  }

  function renderFilter(id: TaskColumnId) {
    if (id === "code") return textInput(filters.code, (value) => setFilter("code", value), "Mã...", "Lọc mã task");
    if (id === "title") return textInput(filters.title, (value) => setFilter("title", value), "Tên task...", "Lọc tên task");
    if (id === "description") return textInput(filters.description, (value) => setFilter("description", value), "Mô tả...", "Lọc mô tả task");
    if (id === "stage") return selectInput(filters.stage, (value) => setFilter("stage", value), "Lọc stage", [{ value: "", label: "Tất cả stage" }, { value: "__none__", label: "Task độc lập" }, ...stages.map((stage) => ({ value: stage.id, label: stage.name }))]);
    if (id === "deadline") return selectInput(filters.deadline, (value) => setFilter("deadline", value), "Lọc deadline", [{ value: "", label: "Tất cả hạn" }, { value: "overdue", label: "Quá hạn" }, { value: "today", label: "Hôm nay" }, { value: "soon", label: "7 ngày tới" }, { value: "none", label: "Chưa có hạn" }]);
    if (id === "estimate") return selectInput(filters.estimate, (value) => setFilter("estimate", value), "Lọc estimate", [{ value: "", label: "Tất cả" }, { value: "none", label: "Chưa estimate" }, { value: "0-4", label: "0–4 giờ" }, { value: "4-8", label: ">4–8 giờ" }, { value: "8-16", label: ">8–16 giờ" }, { value: "16+", label: ">16 giờ" }]);
    if (id === "status") return selectInput(filters.status, (value) => setFilter("status", value), "Lọc trạng thái task", [{ value: "", label: "Tất cả trạng thái" }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))]);
    if (id === "priority") return selectInput(filters.priority, (value) => setFilter("priority", value), "Lọc ưu tiên", [{ value: "", label: "Tất cả ưu tiên" }, ...Object.entries(priorityMeta).map(([value, meta]) => ({ value, label: meta.label }))]);
    if (id === "owner") return selectInput(filters.owner, (value) => setFilter("owner", value), "Lọc người phụ trách", [{ value: "", label: "Tất cả phụ trách" }, { value: "__none__", label: "Chưa phân công" }, ...people.map((person) => ({ value: person.value, label: person.label }))]);
    return <button type="button" onClick={resetFilters} disabled={!activeFilterCount && !search} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.065] text-[9px] font-normal normal-case tracking-normal text-slate-500 hover:text-cyan-200 disabled:opacity-30"><FilterX className="size-3" /> Xóa lọc</button>;
  }

  function renderCell(task: ProjectPlanTask, id: TaskColumnId) {
    if (id === "code") return <span className="font-mono text-[10px] font-semibold text-cyan-200/80">{taskCode(task)}</span>;
    if (id === "title") return <span className="text-[11px] font-medium leading-5 text-slate-300">{task.title}</span>;
    if (id === "description") return task.description ? <span className="text-[10px] leading-5 text-slate-500">{task.description}</span> : <span className="text-slate-800">—</span>;
    if (id === "stage") return <span className="text-[10px] leading-5 text-slate-400">{task.stageName || "Task độc lập"}</span>;
    if (id === "deadline") {
      const overdue = task.status !== "done" && Boolean(task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10));
      return <span className={cn("text-[10px]", overdue ? "font-semibold text-rose-300" : "text-slate-400")}>{displayDate(task.dueDate)}</span>;
    }
    if (id === "estimate") return <span className={cn("font-mono text-[10px]", task.estimatedHours === null ? "text-slate-700" : "font-semibold text-amber-200/80")}>{displayHours(task.estimatedHours)}</span>;
    if (id === "status") { const meta = statusMeta[task.status]; return <span className={cn("inline-flex rounded-md border px-2 py-1 text-[8px]", meta.tone)}>{meta.label}</span>; }
    if (id === "priority") { const meta = priorityMeta[task.priority]; return <span className={cn("inline-flex rounded-md border px-2 py-1 text-[8px]", meta.tone)}>{meta.label}</span>; }
    if (id === "owner") return <span className="text-[10px] leading-5 text-slate-400">{task.ownerName || "Chưa phân công"}</span>;
    return canEdit ? <div className="flex items-center justify-end gap-1.5">{task.status !== "done" ? <button type="button" disabled={action === `done-task-${task.id}`} onClick={() => onDone(task)} className="grid size-8 place-items-center rounded-lg border border-emerald-300/12 bg-emerald-300/[0.04] text-emerald-200 hover:bg-emerald-300/[0.08]" title="Đánh dấu hoàn tất">{action === `done-task-${task.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}</button> : null}<button type="button" onClick={() => onEdit(task)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 hover:text-cyan-200" title="Sửa task"><Edit3 className="size-3.5" /></button><button type="button" disabled={action === `delete-task-${task.id}`} onClick={() => onDelete(task)} className="grid size-8 place-items-center rounded-lg border border-rose-300/10 text-slate-600 hover:text-rose-200" title="Xóa task">{action === `delete-task-${task.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></div> : <span className="text-[9px] text-slate-700">Read only</span>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-white/[0.055] px-4 py-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã task, tên, mô tả, stage, deadline, estimate, trạng thái, ưu tiên, người phụ trách..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" />
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-[9px] text-slate-600">{filteredTasks.length}/{tasks.length} task</span>
          <button type="button" onClick={resetLayout} className="h-10 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[9px] text-slate-500 hover:text-cyan-200">Reset layout cột</button>
          {(activeFilterCount || search) ? <button type="button" onClick={resetFilters} className="flex h-10 items-center gap-2 rounded-xl border border-cyan-300/12 bg-cyan-300/[0.04] px-3 text-[9px] text-cyan-100/75"><FilterX className="size-3.5" /> Xóa lọc ({activeFilterCount + (search ? 1 : 0)})</button> : null}
        </div>
      </div>

      <div className="scrollbar-thin min-h-[360px] max-h-[calc(100vh-190px)] overflow-auto overscroll-contain">
        <table data-managed-grid="true" className="border-collapse text-left" style={{ width: totalWidth, minWidth: "100%" }}>
          <thead className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
            <tr>
              {columnOrder.map((id) => {
                const spec = TASK_COLUMNS.find((column) => column.id === id)!;
                const width = columnWidths[id];
                return <th key={id} draggable onDragStart={(event) => { setDraggedColumn(id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDraggedColumn(null); setDragOverColumn(null); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverColumn(id); }} onDrop={(event) => { event.preventDefault(); dropColumn(id); }} className={cn("sticky top-0 z-30 cursor-grab border-b border-white/[0.06] bg-[#0b1727]/[0.99] px-3 py-3 pr-5 font-semibold backdrop-blur-xl active:cursor-grabbing", dragOverColumn === id && draggedColumn !== id && "bg-cyan-300/[0.09] text-cyan-100")} style={{ width, minWidth: width, maxWidth: width }} title="Kéo để đổi vị trí cột. Kéo mép phải để resize."><span className="flex items-center gap-1.5"><GripVertical className="size-3 shrink-0 text-slate-700" />{spec.label}</span><span onMouseDown={(event) => resizeColumn(id, event)} className="absolute right-0 top-1/2 h-7 w-2 -translate-y-1/2 cursor-col-resize rounded-full border-r border-cyan-300/0 transition hover:border-cyan-300/45" /></th>;
              })}
            </tr>
            <tr>
              {columnOrder.map((id) => <th key={id} className="sticky top-[39px] z-20 border-b border-white/[0.055] bg-[#0b1727]/[0.99] px-2 py-2 backdrop-blur-xl" style={{ width: columnWidths[id], minWidth: columnWidths[id], maxWidth: columnWidths[id] }}>{renderFilter(id)}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length ? filteredTasks.map((task) => <tr key={task.id} className="asc-large-data-row border-b border-white/[0.04] align-top text-xs text-slate-400 transition hover:bg-white/[0.022]">{columnOrder.map((id) => <td key={id} className="px-3 py-3.5 align-top" style={{ width: columnWidths[id], minWidth: columnWidths[id], maxWidth: columnWidths[id] }}><div className="max-w-full whitespace-normal break-words">{renderCell(task, id)}</div></td>)}</tr>) : <tr><td colSpan={columnOrder.length} className="px-4 py-16 text-center"><Search className="mx-auto size-6 text-slate-800" /><div className="mt-3 text-xs text-slate-500">Không có task phù hợp bộ lọc.</div><button type="button" onClick={resetFilters} className="mt-3 text-[10px] text-cyan-300/60 hover:text-cyan-200">Xóa bộ lọc</button></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/[0.05] px-4 py-3 text-[9px] text-slate-600">Kéo tiêu đề để đổi vị trí cột • Kéo mép phải tiêu đề để resize • Layout được lưu theo từng Project.</div>
    </>
  );
}
