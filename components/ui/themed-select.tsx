"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/lib/issues/types";

// Keep the shared ISSUE option contract as the base type.
// ISSUE lookup descriptions may legitimately be null when the database has no secondary label.
export type ThemedSelectOption = SelectOption & {
  disabled?: boolean;
};

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

export function ThemedSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Chọn giá trị",
  className,
  buttonClassName,
  menuClassName,
  disabled = false,
  leading,
}: {
  value: string;
  options: ThemedSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  leading?: React.ReactNode;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearchText(query);
    if (!needle) return options;
    return options.filter((option) => {
      const haystack = normalizeSearchText(
        `${option.label} ${option.description ?? ""} ${option.value}`,
      );
      return haystack.includes(needle);
    });
  }, [options, query]);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === value && !option.disabled,
    );
    const firstEnabled = filteredOptions.findIndex((option) => !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled);
  }, [open, filteredOptions, value]);

  function closeMenu() {
    setOpen(false);
    setQuery("");
  }

  function chooseOption(option: ThemedSelectOption | undefined) {
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu();
  }

  function moveActive(direction: 1 | -1) {
    if (!filteredOptions.length) return;
    let index = activeIndex;
    for (let count = 0; count < filteredOptions.length; count += 1) {
      index = (index + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[index]?.disabled) {
        setActiveIndex(index);
        return;
      }
    }
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) setOpen(true);
      else chooseOption(filteredOptions[activeIndex]);
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      chooseOption(filteredOptions[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => {
            if (current) setQuery("");
            return !current;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "group flex h-10 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b1727]/95 px-3 text-left text-xs font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none transition",
          "hover:border-cyan-300/20 hover:bg-[#0e1c2e] focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/[0.06]",
          open && "border-cyan-300/25 bg-[#0e1c2e] ring-2 ring-cyan-300/[0.05]",
          disabled && "cursor-not-allowed opacity-45",
          buttonClassName,
        )}
      >
        {leading ? <span className="shrink-0 text-amber-300/80">{leading}</span> : null}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-slate-600")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-slate-600 transition-transform duration-200 group-hover:text-slate-400",
            open && "rotate-180 text-cyan-200/70",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby={id}
          className={cn(
            "absolute left-0 top-[calc(100%+8px)] z-[90] w-full min-w-[220px] overflow-hidden rounded-xl border border-cyan-300/15 bg-[#0a1626]/[0.99] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl",
            "before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300/40 before:to-transparent",
            menuClassName,
          )}
        >
          <div className="relative mb-1.5 border-b border-white/[0.055] pb-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-[calc(50%+3px)] text-cyan-300/45" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
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

          <div className="scrollbar-thin max-h-[320px] overflow-y-auto py-0.5">
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => chooseOption(option)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      isSelected
                        ? "border border-cyan-300/15 bg-cyan-300/[0.09] text-cyan-100"
                        : "border border-transparent text-slate-400 hover:bg-white/[0.045] hover:text-slate-100",
                      isActive && !isSelected && "bg-white/[0.04] text-slate-200",
                      option.disabled && "cursor-not-allowed opacity-35",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-[9px] font-normal text-slate-600">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="grid size-5 shrink-0 place-items-center">
                      {isSelected ? <Check className="size-3.5 text-cyan-300" /> : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-5 text-center">
                <Search className="mx-auto size-4 text-slate-800" />
                <div className="mt-2 text-xs text-slate-600">Không tìm thấy dữ liệu phù hợp</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
