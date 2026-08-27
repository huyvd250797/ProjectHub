"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, GripVertical, Pin, PinOff, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { IssueColumnId, IssueColumnPreferences, IssueSavedView } from "@/lib/issues/types";
import { cn } from "@/lib/utils";

export const ISSUE_COLUMNS: Array<{ id: IssueColumnId; label: string; min: number; max: number }> = [
  { id: "issueNo", label: "Mã", min: 72, max: 130 },
  { id: "content", label: "Nội dung yêu cầu", min: 260, max: 720 },
  { id: "status", label: "Trạng thái", min: 120, max: 240 },
  { id: "customerStatus", label: "Trạng thái KH", min: 110, max: 220 },
  { id: "priority", label: "Ưu tiên", min: 80, max: 140 },
  { id: "module", label: "Module", min: 130, max: 360 },
  { id: "department", label: "Phòng ban", min: 130, max: 320 },
  { id: "assignee", label: "Phụ trách", min: 120, max: 280 },
  { id: "dueDate", label: "Due Date", min: 105, max: 170 },
  { id: "jira", label: "Jira", min: 76, max: 130 },
];

export const DEFAULT_ISSUE_PREFERENCES: IssueColumnPreferences = {
  visibleColumns: ISSUE_COLUMNS.map((item) => item.id),
  columnOrder: ISSUE_COLUMNS.map((item) => item.id),
  columnWidths: Object.fromEntries(ISSUE_COLUMNS.map((item) => [item.id, item.id === "content" ? 420 : item.id === "issueNo" ? 82 : item.id === "jira" ? 84 : 160])),
  pinnedColumns: ["issueNo", "content"],
  pageSize: 50,
  filtersVisible: true,
  tagStyles: {},
};

export function ColumnManager({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: IssueColumnPreferences;
  onChange: (value: IssueColumnPreferences) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;

  const ordered = value.columnOrder.map((id) => ISSUE_COLUMNS.find((item) => item.id === id)).filter(Boolean) as typeof ISSUE_COLUMNS;
  function update(next: Partial<IssueColumnPreferences>) { onChange({ ...value, ...next }); }
  function move(id: IssueColumnId, direction: -1 | 1) {
    const order = [...value.columnOrder];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    update({ columnOrder: order });
  }
  function width(id: IssueColumnId, delta: number) {
    const spec = ISSUE_COLUMNS.find((item) => item.id === id)!;
    const current = value.columnWidths[id] ?? 160;
    update({ columnWidths: { ...value.columnWidths, [id]: Math.min(spec.max, Math.max(spec.min, current + delta)) } });
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <div className="tech-panel w-full max-w-[720px] overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div><div className="text-sm font-semibold text-white">Cấu hình cột ISSUE</div><div className="mt-1 text-[10px] text-slate-600">Ẩn/hiện • thứ tự • độ rộng • ghim cột • 50/100/500/1000/ALL</div></div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="scrollbar-thin max-h-[65vh] overflow-y-auto p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] text-slate-500">Số ISSUE mỗi trang</div>
            <div className="flex flex-wrap gap-1.5">{[50,100,500,1000,0].map((size) => <button key={size} onClick={() => update({ pageSize: size })} className={cn("h-8 rounded-lg border px-3 text-[10px]", value.pageSize === size ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100" : "border-white/[0.06] text-slate-500")}>{size === 0 ? "ALL" : size}</button>)}</div>
          </div>
          <div className="space-y-2">
            {ordered.map((column, index) => {
              const visible = value.visibleColumns.includes(column.id);
              const pinned = value.pinnedColumns.includes(column.id);
              const currentWidth = value.columnWidths[column.id] ?? 160;
              return (
                <div key={column.id} className="grid grid-cols-[28px_1fr_auto_auto_auto] items-center gap-2 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-2.5">
                  <GripVertical className="size-3.5 text-slate-700" />
                  <div><div className="text-xs font-medium text-slate-300">{column.label}</div><div className="mt-0.5 text-[9px] text-slate-700">{currentWidth}px</div></div>
                  <div className="flex items-center gap-1">
                    <button disabled={index === 0} onClick={() => move(column.id, -1)} className="grid size-7 place-items-center rounded-lg border border-white/[0.06] text-slate-600 disabled:opacity-20"><ChevronLeft className="size-3" /></button>
                    <button disabled={index === ordered.length - 1} onClick={() => move(column.id, 1)} className="grid size-7 place-items-center rounded-lg border border-white/[0.06] text-slate-600 disabled:opacity-20"><ChevronRight className="size-3" /></button>
                    <button onClick={() => width(column.id, -20)} className="h-7 rounded-lg border border-white/[0.06] px-2 text-[10px] text-slate-600">−</button>
                    <button onClick={() => width(column.id, 20)} className="h-7 rounded-lg border border-white/[0.06] px-2 text-[10px] text-slate-600">+</button>
                  </div>
                  <button onClick={() => update({ pinnedColumns: pinned ? value.pinnedColumns.filter((id) => id !== column.id) : [...value.pinnedColumns, column.id] })} className={cn("grid size-8 place-items-center rounded-lg border", pinned ? "border-violet-300/18 bg-violet-300/[0.07] text-violet-200" : "border-white/[0.06] text-slate-600")} title={pinned ? "Bỏ ghim" : "Ghim cột"}>{pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}</button>
                  <button onClick={() => update({ visibleColumns: visible ? value.visibleColumns.filter((id) => id !== column.id) : [...value.visibleColumns, column.id] })} className={cn("grid size-8 place-items-center rounded-lg border", visible ? "border-cyan-300/18 bg-cyan-300/[0.06] text-cyan-200" : "border-white/[0.06] text-slate-700")} title={visible ? "Ẩn cột" : "Hiện cột"}>{visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/[0.06] px-5 py-4">
          <button onClick={() => onChange(DEFAULT_ISSUE_PREFERENCES)} className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-500"><RotateCcw className="size-3.5" /> Mặc định</button>
          <button onClick={onClose} className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-[10px] font-semibold text-[#07111f]"><Save className="size-3.5" /> Xong</button>
        </div>
      </div>
    </div>
  );
}

export function SaveViewModal({ open, onClose, onSave, saving }: { open: boolean; onClose: () => void; onSave: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(""); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[215] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <div className="tech-panel w-full max-w-[420px] rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start justify-between"><div><div className="text-sm font-semibold text-white">Lưu bộ lọc hiện tại</div><div className="mt-1 text-[10px] text-slate-600">Saved View chỉ hiển thị cho tài khoản của bạn trong project này.</div></div><button onClick={onClose} className="grid size-8 place-items-center text-slate-600"><X className="size-4" /></button></div>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())} placeholder="Ví dụ: ISSUE tôi cần xử lý hôm nay" className="mt-5 h-11 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3.5 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25" />
        <div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className="h-9 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-500">Hủy</button><button disabled={!name.trim() || saving} onClick={() => onSave(name.trim())} className="h-9 rounded-xl bg-cyan-300 px-4 text-[10px] font-semibold text-[#07111f] disabled:opacity-45">{saving ? "Đang lưu..." : "Lưu View"}</button></div>
      </div>
    </div>
  );
}

export function SavedViewsMenu({ views, onApply, onDelete, disabled }: { views: IssueSavedView[]; onApply: (view: IssueSavedView) => void; onDelete: (view: IssueSavedView) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)} className="flex h-10 min-w-[130px] items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-400 disabled:opacity-40">Saved Views <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} /></button>
      {open ? <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[300px] rounded-xl border border-cyan-300/15 bg-[#0a1626]/[0.99] p-1.5 shadow-2xl backdrop-blur-xl">
        <div className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-700">View của tôi</div>
        <div className="scrollbar-thin max-h-72 overflow-y-auto">{views.length ? views.map((view) => <div key={view.id} className="group flex items-center rounded-lg hover:bg-white/[0.035]"><button onClick={() => { onApply(view); setOpen(false); }} className="min-w-0 flex-1 px-3 py-2.5 text-left"><div className="truncate text-[11px] font-medium text-slate-300">{view.name}</div><div className="mt-0.5 text-[9px] text-slate-700">{Object.keys(view.queryParams).length} điều kiện</div></button><button onClick={() => onDelete(view)} className="mr-2 grid size-7 place-items-center rounded-lg text-slate-700 opacity-0 hover:bg-rose-300/[0.06] hover:text-rose-300 group-hover:opacity-100"><Trash2 className="size-3.5" /></button></div>) : <div className="px-3 py-5 text-center text-[10px] text-slate-700">Chưa có Saved View.</div>}</div>
      </div> : null}
    </div>
  );
}
