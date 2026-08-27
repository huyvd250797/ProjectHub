"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { SelectOption } from "@/lib/issues/types";
import { cn } from "@/lib/utils";

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

export function FloatingSelect({
  value,
  options,
  onChange,
  disabled,
  placeholder = "—",
  ariaLabel,
  compact = false,
  tone,
  tagStyle,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  compact?: boolean;
  tone?: string;
  tagStyle?: CSSProperties;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearchText(query);
    if (!needle) return options;
    return options.filter((option) =>
      normalizeSearchText(`${option.label} ${option.description ?? ""} ${option.value}`).includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const update = () => setRect(buttonRef.current?.getBoundingClientRect() ?? null);
    update();
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !(target as HTMLElement)?.closest?.("[data-floating-select-menu]")) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function closeMenu() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        style={tagStyle}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) {
            setOpen((current) => {
              if (current) setQuery("");
              return !current;
            });
          }
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
              role="listbox"
              className="fixed z-[180] overflow-hidden rounded-xl border border-cyan-300/15 bg-[#0a1626]/[0.99] p-1.5 shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
              style={{
                left: Math.max(12, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 250) - 12)),
                top: Math.max(12, Math.min(rect.bottom + 7, window.innerHeight - 390)),
                width: Math.max(rect.width, 250),
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative mb-1.5 border-b border-white/[0.055] pb-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-[calc(50%+3px)] text-cyan-300/45" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeMenu();
                    } else if (event.key === "Enter" && filteredOptions.length === 1) {
                      event.preventDefault();
                      onChange(filteredOptions[0]?.value ?? null);
                      closeMenu();
                    }
                  }}
                  placeholder="Nhập để tìm kiếm..."
                  aria-label={`Tìm trong ${ariaLabel}`}
                  className="h-9 w-full rounded-lg border border-white/[0.07] bg-black/15 pl-9 pr-9 text-[11px] text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25 focus:bg-cyan-300/[0.025]"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Xóa nội dung tìm kiếm"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 grid size-6 -translate-y-[calc(50%+3px)] place-items-center rounded-md text-slate-600 hover:bg-white/[0.04] hover:text-slate-300"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>

              <div className="scrollbar-thin max-h-[300px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { onChange(null); closeMenu(); }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[11px] text-slate-600 hover:bg-white/[0.04] hover:text-slate-300"
                >
                  {placeholder}
                </button>

                {filteredOptions.length ? filteredOptions.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return;
                        onChange(option.value);
                        closeMenu();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition",
                        active
                          ? "border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-100"
                          : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                        option.disabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-slate-400",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium">{option.label}</span>
                        {option.description ? <span className="mt-0.5 block truncate text-[9px] text-slate-600">{option.description}</span> : null}
                      </span>
                      {active ? <Check className="size-3.5 shrink-0 text-cyan-300" /> : null}
                    </button>
                  );
                }) : (
                  <div className="px-3 py-5 text-center">
                    <Search className="mx-auto size-4 text-slate-800" />
                    <div className="mt-2 text-[11px] text-slate-600">Không tìm thấy dữ liệu phù hợp</div>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
