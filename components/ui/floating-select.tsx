"use client";

import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SelectOption } from "@/lib/issues/types";
import { cn } from "@/lib/utils";

export function FloatingSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = "—",
  ariaLabel,
  compact = false,
  tone,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  compact?: boolean;
  tone?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);

  useEffect(() => {
    if (!open) return;
    const update = () => setRect(buttonRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !(target as HTMLElement)?.closest?.("[data-floating-select-menu]")) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) setOpen((current) => !current);
        }}
        className={cn(
          "flex max-w-full items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] text-left text-slate-400 transition hover:border-cyan-300/18 hover:text-slate-200",
          compact ? "h-7 px-2 text-[10px]" : "h-9 px-2.5 text-xs",
          disabled && "cursor-default opacity-60 hover:border-white/[0.07]",
          tone,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        {!disabled ? <ChevronDown className={cn("size-3 shrink-0 text-slate-600 transition", open && "rotate-180 text-cyan-300/70")} /> : null}
      </button>

      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              data-floating-select-menu
              className="fixed z-[180] overflow-hidden rounded-xl border border-cyan-300/15 bg-[#0a1626]/[0.99] p-1.5 shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
              style={{
                left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 12),
                top: Math.min(rect.bottom + 7, window.innerHeight - 330),
                width: Math.max(rect.width, 220),
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="scrollbar-thin max-h-[300px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[11px] text-slate-600 hover:bg-white/[0.04] hover:text-slate-300"
                >
                  {placeholder}
                </button>
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { onChange(option.value); setOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition",
                        active
                          ? "border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-100"
                          : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium">{option.label}</span>
                        {option.description ? <span className="mt-0.5 block truncate text-[9px] text-slate-600">{option.description}</span> : null}
                      </span>
                      {active ? <Check className="size-3.5 shrink-0 text-cyan-300" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
