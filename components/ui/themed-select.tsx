"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemedSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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
    const index = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(index >= 0 ? index : options.findIndex((option) => !option.disabled));
  }, [open, options, value]);

  function moveActive(direction: 1 | -1) {
    if (!options.length) return;
    let index = activeIndex;
    for (let count = 0; count < options.length; count += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index]?.disabled) {
        setActiveIndex(index);
        return;
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveActive(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const option = options[activeIndex];
      if (option && !option.disabled) {
        onChange(option.value);
        setOpen(false);
      }
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
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
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
          <div className="scrollbar-thin max-h-[320px] overflow-y-auto py-0.5">
            {options.length ? (
              options.map((option, index) => {
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
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                    }}
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
              <div className="px-3 py-4 text-center text-xs text-slate-600">Không có dữ liệu</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
