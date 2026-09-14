"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Command, Crown, LoaderCircle, LogOut, Menu, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MobileProjectChip, ProjectSwitcher } from "@/components/project-switcher";
import { useProject } from "@/components/project-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Advanced Analytics",
  "/reports": "Executive Report",
  "/contract": "PLHĐ",
  "/departments": "Phòng ban",
  "/issues": "ISSUE",
  "/activity": "Notifications & Activity",
  "/resources": "Remote Server",
  "/settings/projects": "Master Project Console",
  "/settings/uat": "Hardening & UAT",
  "/settings/system": "System Information",
  "/settings/import": "Excel Import",
  "/settings": "Thiết lập",
};

export function Topbar({
  onOpenMobile,
  demoMode,
  userEmail,
  isMaster = false,
}: {
  onOpenMobile: () => void;
  demoMode: boolean;
  userEmail?: string | null;
  isMaster?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedProject } = useProject();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; module: string; title: string; subtitle: string; href: string; badge?: string }>>([]);
  const searchTimer = useRef<number | null>(null);
  const pageName =
    Object.entries(pageNames).find(([key]) => pathname.startsWith(key))?.[1] ??
    "Workspace";

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const controller = new AbortController();
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }

    searchTimer.current = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?projectId=${encodeURIComponent(selectedProject.id)}&q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((body) => {
          if (body?.ok) {
            setResults(body.items ?? []);
            setSearchOpen(true);
          } else {
            setResults([]);
            setSearchOpen(false);
          }
        })
        .catch(() => {
          setResults([]);
          setSearchOpen(false);
        })
        .finally(() => setSearching(false));
    }, 1000);

    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
      controller.abort();
    };
  }, [search, selectedProject.id]);

  async function handleLogout() {
    const supabase = createClient();
    if (!supabase) {
      router.push("/login");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-white/[0.06] bg-[#07111f]/80 px-4 backdrop-blur-xl md:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 lg:hidden"
        aria-label="Mở menu"
      >
        <Menu className="size-4" />
      </button>

      <div className="min-w-0">
        <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-slate-600">
          Project Workspace
        </div>
        <div className="mt-1 truncate text-sm font-medium text-slate-200">{pageName}</div>
      </div>

      <div className="ml-2 hidden h-7 w-px bg-white/[0.06] lg:block" />
      <ProjectSwitcher />
      <MobileProjectChip />

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => results.length && setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && search.trim()) {
                event.preventDefault();
                router.push(`/issues?search=${encodeURIComponent(search.trim())}`);
                setSearchOpen(false);
              }
              if (event.key === "Escape") setSearchOpen(false);
            }}
            placeholder="Tìm ISSUE, Module, Jira..."
            className="h-10 w-[260px] rounded-xl border border-white/[0.07] bg-white/[0.025] pl-9 pr-12 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/25 focus:bg-white/[0.035]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => { setSearch(""); setResults([]); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md border border-white/[0.07] bg-black/10 text-slate-600 hover:text-slate-300"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-3" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.07] bg-black/10 px-1.5 py-1 text-[9px] text-slate-600">
              <Command className="size-2.5" /> K
            </span>
          )}
          {searchOpen ? (
            <div className="absolute right-0 top-full z-[80] mt-2 w-[430px] overflow-hidden rounded-2xl border border-cyan-300/12 bg-[#081421]/95 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300/65">Search Suggestions</span>
                {searching ? <LoaderCircle className="size-3.5 animate-spin text-cyan-300/60" /> : <span className="text-[9px] text-slate-700">{results.length} kết quả</span>}
              </div>
              {results.length ? (
                <div className="max-h-[360px] overflow-y-auto p-1.5">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        router.push(result.href);
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.045]"
                    >
                      <span className="mt-0.5 rounded-lg border border-cyan-300/12 bg-cyan-300/[0.055] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-200">{result.module}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-200">{result.title}</span>
                        <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-slate-600">{result.subtitle}</span>
                      </span>
                      {result.badge ? <span className="max-w-[110px] truncate rounded-lg border border-white/[0.07] px-2 py-1 text-[9px] text-slate-500">{result.badge}</span> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-slate-600">{searching ? "Đang tìm dữ liệu gần đúng..." : "Không tìm thấy dữ liệu phù hợp."}</div>
              )}
            </div>
          ) : null}
        </div>

        {demoMode ? (
          <span className="hidden rounded-lg border border-amber-300/15 bg-amber-300/[0.07] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200 md:inline-flex">
            Demo Mode
          </span>
        ) : null}

        {isMaster && !demoMode ? (
          <span className="hidden items-center gap-1.5 rounded-lg border border-amber-300/15 bg-amber-300/[0.07] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200 md:inline-flex">
            <Crown className="size-3" /> MASTER
          </span>
        ) : null}

        <ThemeToggle />

        <NotificationCenter />

        <div className="group relative">
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 text-left"
          >
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-amber-300/25 to-cyan-300/15 text-[9px] font-bold text-amber-100">
              HV
            </span>
            <span className="hidden max-w-[130px] truncate text-xs text-slate-300 md:block">
              {userEmail || "HuyVo"}
            </span>
            <ChevronDown className="size-3 text-slate-600" />
          </button>
          <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 translate-y-1 rounded-xl border border-white/[0.08] bg-[#0b1727] p-1 opacity-0 shadow-2xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white"
            >
              <LogOut className="size-3.5" />
              {demoMode ? "Về màn hình đăng nhập" : "Đăng xuất"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
