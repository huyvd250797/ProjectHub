"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Command, LogOut, Menu, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contract": "PLHĐ",
  "/departments": "Phòng ban",
  "/issues": "ISSUE",
  "/resources": "Remote Server",
  "/settings": "Thiết lập",
};

export function Topbar({
  onOpenMobile,
  demoMode,
  userEmail,
}: {
  onOpenMobile: () => void;
  demoMode: boolean;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pageName =
    Object.entries(pageNames).find(([key]) => pathname.startsWith(key))?.[1] ??
    "Workspace";

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
    <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-white/[0.06] bg-[#07111f]/75 px-4 backdrop-blur-xl md:px-6">
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
          EPU / Project Workspace
        </div>
        <div className="mt-1 truncate text-sm font-medium text-slate-200">{pageName}</div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" />
          <input
            placeholder="Tìm ISSUE, Module, Jira..."
            className="h-10 w-[280px] rounded-xl border border-white/[0.07] bg-white/[0.025] pl-9 pr-12 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/25 focus:bg-white/[0.035]"
          />
          <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.07] bg-black/10 px-1.5 py-1 text-[9px] text-slate-600">
            <Command className="size-2.5" /> K
          </span>
        </div>

        {demoMode ? (
          <span className="hidden rounded-lg border border-amber-300/15 bg-amber-300/[0.07] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200 md:inline-flex">
            Demo Mode
          </span>
        ) : null}

        <button
          type="button"
          className="relative grid size-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:text-slate-200"
          aria-label="Thông báo"
        >
          <Bell className="size-4" />
          <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-cyan-300" />
        </button>

        <div className="group relative">
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 text-left"
          >
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-cyan-300/25 to-violet-400/20 text-[9px] font-bold text-cyan-100">
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
