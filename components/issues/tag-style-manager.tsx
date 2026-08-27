"use client";

import { Paintbrush, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { IssueLookups, IssueTagGroup, IssueTagStyle, IssueTagStyles, SelectOption } from "@/lib/issues/types";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ id: IssueTagGroup; label: string }> = [
  { id: "status", label: "Trạng thái" },
  { id: "customerStatus", label: "Trạng thái KH" },
  { id: "priority", label: "Ưu tiên" },
  { id: "assignee", label: "Phụ trách" },
];

const DEFAULT_COLORS: Record<IssueTagGroup, IssueTagStyle> = {
  status: { border: "#22d3ee", background: "#12344a", text: "#a5f3fc" },
  customerStatus: { border: "#f59e0b", background: "#3b2b12", text: "#fde68a" },
  priority: { border: "#fb7185", background: "#3b1620", text: "#fecdd3" },
  assignee: { border: "#a78bfa", background: "#2b2050", text: "#ddd6fe" },
};

function optionsFor(group: IssueTagGroup, lookups: IssueLookups): SelectOption[] {
  if (group === "status") return lookups.statuses;
  if (group === "customerStatus") return [{ value: "__empty__", label: "Chưa có trạng thái KH" }, ...lookups.customerStatuses];
  if (group === "priority") return lookups.priorities;
  return [{ value: "__empty__", label: "Chưa phụ trách" }, ...lookups.assignees];
}

export function TagStyleManager({
  open,
  value,
  lookups,
  onChange,
  onClose,
}: {
  open: boolean;
  value: IssueTagStyles;
  lookups: IssueLookups;
  onChange: (value: IssueTagStyles) => void;
  onClose: () => void;
}) {
  const [group, setGroup] = useState<IssueTagGroup>("status");
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  const options = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi-VN");
    return optionsFor(group, lookups).filter((option) => !needle || `${option.label} ${option.value}`.toLocaleLowerCase("vi-VN").includes(needle));
  }, [group, lookups, query]);
  if (!open) return null;

  function updateStyle(optionValue: string, field: keyof IssueTagStyle, color: string) {
    const current = value[group]?.[optionValue] ?? DEFAULT_COLORS[group];
    onChange({
      ...value,
      [group]: {
        ...(value[group] ?? {}),
        [optionValue]: { ...current, [field]: color },
      },
    });
  }

  function resetItem(optionValue: string) {
    const nextGroup = { ...(value[group] ?? {}) };
    delete nextGroup[optionValue];
    onChange({ ...value, [group]: nextGroup });
  }

  function resetGroup() {
    const next = { ...value };
    delete next[group];
    onChange(next);
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="tech-panel flex max-h-[88vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <div className="grid size-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[0.06] text-violet-200"><Paintbrush className="size-4" /></div>
          <div><div className="text-sm font-semibold text-white">Màu tag ISSUE</div><div className="mt-1 text-[10px] text-slate-600">Điều chỉnh riêng màu viền, background và chữ cho từng giá trị.</div></div>
          <button type="button" onClick={onClose} className="ml-auto grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-5 py-3">
          {GROUPS.map((item) => <button key={item.id} type="button" onClick={() => { setGroup(item.id); setQuery(""); }} className={cn("h-9 rounded-xl border px-3 text-[10px]", group === item.id ? "border-violet-300/20 bg-violet-300/[0.08] text-violet-100" : "border-white/[0.06] text-slate-500")}>{item.label}</button>)}
          <button type="button" onClick={resetGroup} className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-500 hover:text-slate-200"><RotateCcw className="size-3.5" /> Mặc định nhóm</button>
        </div>
        <div className="border-b border-white/[0.05] px-5 py-3"><input value={query} onChange={(event) => setQuery(event.target.value)} className="field max-w-md" placeholder={`Tìm trong ${GROUPS.find((item) => item.id === group)?.label ?? "tag"}...`} /></div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-5">
          <div className="space-y-2">
            {options.map((option) => {
              const customized = value[group]?.[option.value];
              const style = customized ?? DEFAULT_COLORS[group];
              return (
                <div key={option.value} className="grid gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 lg:grid-cols-[minmax(180px,1fr)_180px_repeat(3,150px)_40px] lg:items-center">
                  <div className="min-w-0"><div className="truncate text-xs font-medium text-slate-300">{option.label}</div><div className="mt-1 truncate font-mono text-[9px] text-slate-700">{option.value}</div></div>
                  <div><span className="inline-flex max-w-full truncate rounded-lg border px-2.5 py-1.5 text-[10px]" style={{ borderColor: style.border, backgroundColor: style.background, color: style.text }}>{option.label}</span>{!customized ? <div className="mt-1 text-[8px] text-slate-700">Màu mặc định</div> : null}</div>
                  {(["border", "background", "text"] as const).map((field) => <label key={field} className="flex items-center gap-2 rounded-lg border border-white/[0.055] px-2 py-1.5"><input type="color" value={style[field]} onChange={(event) => updateStyle(option.value, field, event.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent" /><span className="text-[9px] text-slate-600">{field === "border" ? "Viền" : field === "background" ? "Nền" : "Chữ"}</span></label>)}
                  <button type="button" disabled={!customized} onClick={() => resetItem(option.value)} className="grid size-9 place-items-center rounded-lg border border-white/[0.06] text-slate-600 disabled:opacity-20" title="Khôi phục màu mặc định"><RotateCcw className="size-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4"><div className="text-[9px] text-slate-700">Màu được lưu theo tài khoản và Project.</div><button type="button" onClick={onClose} className="h-9 rounded-xl bg-violet-300 px-4 text-[10px] font-semibold text-[#111026]">Xong</button></div>
      </div>
    </div>
  );
}
