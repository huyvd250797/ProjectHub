"use client";

import { ChevronDown, ChevronUp, GripVertical, RotateCcw, Save, X } from "lucide-react";
import { useState } from "react";
import type { NavigationDisplayLabels, NavigationHref } from "@/lib/workspace-preferences";
import { DEFAULT_NAV_ORDER } from "@/lib/workspace-preferences";
import { cn } from "@/lib/utils";

export function NavigationOrderManager({
  open,
  value,
  labels,
  displayLabels,
  saving,
  onChange,
  onDisplayLabelsChange,
  onSave,
  onClose,
}: {
  open: boolean;
  value: NavigationHref[];
  labels: Record<string, string>;
  displayLabels: NavigationDisplayLabels;
  saving: boolean;
  onChange: (value: NavigationHref[]) => void;
  onDisplayLabelsChange: (value: NavigationDisplayLabels) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [dragged, setDragged] = useState<NavigationHref | null>(null);
  const [over, setOver] = useState<NavigationHref | null>(null);
  if (!open) return null;

  function move(href: NavigationHref, direction: -1 | 1) {
    const next = [...value];
    const index = next.indexOf(href);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function drop(target: NavigationHref) {
    if (!dragged || dragged === target) return;
    const next = [...value];
    const from = next.indexOf(dragged);
    const to = next.indexOf(target);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, dragged);
    onChange(next);
    setDragged(null);
    setOver(null);
  }

  function rename(href: NavigationHref, label: string) {
    const next = { ...displayLabels };
    const clean = label.trim();
    if (!clean || clean === labels[href]) delete next[href];
    else next[href] = clean.slice(0, 40);
    onDisplayLabelsChange(next);
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="tech-panel w-full max-w-[760px] overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><div className="text-sm font-semibold text-white">Project Command Center • Navbar Modules</div><div className="mt-1 text-[10px] text-slate-600">Kéo thả để đổi vị trí. Tên gốc do hệ thống quản lý, tên hiển thị có thể đổi theo cách làm việc của bạn.</div></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500"><X className="size-4" /></button></div>
        <div className="scrollbar-thin max-h-[65vh] space-y-2 overflow-y-auto p-4">
          <div className="grid grid-cols-[58px_1fr_1fr_74px] gap-2 px-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-700">
            <span>Thứ tự</span><span>Tên gốc</span><span>Tên hiển thị</span><span className="text-right">Di chuyển</span>
          </div>
          {value.map((href, index) => <div key={href} draggable onDragStart={() => setDragged(href)} onDragEnd={() => { setDragged(null); setOver(null); }} onDragOver={(event) => { event.preventDefault(); setOver(href); }} onDrop={(event) => { event.preventDefault(); drop(href); }} className={cn("grid grid-cols-[28px_30px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2.5 transition", over === href && dragged !== href ? "border-cyan-300/30 bg-cyan-300/[0.06]" : "border-white/[0.06] bg-white/[0.018]")}><GripVertical className="size-4 cursor-grab text-slate-600 active:cursor-grabbing" /><span className="grid size-6 place-items-center rounded-lg bg-white/[0.035] text-[9px] text-slate-600">{index + 1}</span><div className="min-w-0"><div className="truncate text-xs font-medium text-slate-300">{labels[href] ?? href}</div><div className="mt-0.5 truncate font-mono text-[8px] text-slate-700">{href}</div></div><input value={displayLabels[href] ?? ""} onChange={(event) => rename(href, event.target.value)} placeholder={labels[href] ?? href} className="h-9 min-w-0 rounded-xl border border-white/[0.07] bg-[#081525] px-3 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/30" maxLength={40} /><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => move(href, -1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.06] text-slate-600 disabled:opacity-20"><ChevronUp className="size-3.5" /></button><button type="button" disabled={index === value.length - 1} onClick={() => move(href, 1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.06] text-slate-600 disabled:opacity-20"><ChevronDown className="size-3.5" /></button></div></div>)}
        </div>
        <div className="flex items-center border-t border-white/[0.06] px-5 py-4"><button type="button" onClick={() => { onChange([...DEFAULT_NAV_ORDER]); onDisplayLabelsChange({}); }} className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-500"><RotateCcw className="size-3.5" /> Mặc định</button><button type="button" disabled={saving} onClick={onSave} className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-[10px] font-semibold text-[#07111f] disabled:opacity-50"><Save className="size-3.5" /> {saving ? "Đang lưu..." : "Lưu navbar"}</button></div>
      </div>
    </div>
  );
}
