"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "asc-working-theme";

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = resolveInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    function followSystem(event: MediaQueryListEvent) {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
      const next: ThemeMode = event.matches ? "light" : "dark";
      setTheme(next);
      applyTheme(next);
    }
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  function toggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const nextLabel = theme === "dark" ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn(
        "theme-toggle relative grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:border-cyan-300/20 hover:text-slate-200",
        className,
      )}
    >
      <span className="sr-only">{nextLabel}</span>
      {mounted && theme === "light" ? (
        <Moon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
