"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Crown, X } from "lucide-react";
import { navigation, secondaryNavigation } from "@/lib/navigation";
import { Logo } from "@/components/logo";
import { useProject } from "@/components/project-context";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { selectedProject, isMaster } = useProject();

  const navContent = (
    <>
      <div className="flex h-[76px] items-center justify-between border-b border-white/[0.06] px-4">
        <Logo compact={collapsed} />
        <button
          type="button"
          onClick={onCloseMobile}
          className="grid size-9 place-items-center rounded-lg border border-white/[0.06] text-slate-400 hover:text-white lg:hidden"
          aria-label="Đóng menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5">
        <p
          className={cn(
            "mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-600",
            collapsed && "text-center text-[0px]",
          )}
        >
          Project Workspace
        </p>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition",
                  active
                    ? "border border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-100"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.035] hover:text-slate-100",
                  collapsed && "justify-center px-0",
                )}
                title={collapsed ? item.label : undefined}
              >
                {active ? (
                  <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-cyan-300 shadow-[0_0_12px_rgba(46,211,255,0.8)]" />
                ) : null}
                <Icon className={cn("size-[18px] shrink-0", active && "text-cyan-300")} />
                <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="my-5 border-t border-white/[0.06]" />
        <nav className="space-y-1">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition",
                  active ? "bg-white/[0.05] text-white" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300",
                  collapsed && "justify-center px-0",
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-[18px]" />
                <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {isMaster ? (
          <Link
            href="/settings/projects"
            onClick={onCloseMobile}
            className={cn(
              "mt-1 flex h-11 items-center gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] px-3 text-sm text-amber-200/75 transition hover:bg-amber-300/[0.06] hover:text-amber-100",
              pathname.startsWith("/settings/projects") && "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
              collapsed && "justify-center px-0",
            )}
            title={collapsed ? "Master Console" : undefined}
          >
            <Crown className="size-[18px]" />
            <span className={cn("truncate", collapsed && "hidden")}>Master Console</span>
          </Link>
        ) : null}
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className={cn("rounded-xl border border-white/[0.06] bg-white/[0.025] p-3", collapsed && "p-2")}>
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
            </span>
            <div className={cn("min-w-0", collapsed && "hidden")}>
              <div className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">Project hiện tại</div>
              <div className="mt-1 truncate text-[11px] font-semibold text-slate-300">{selectedProject.code} • {selectedProject.organizationName || selectedProject.name}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.15em] text-slate-700">V1.3.1 • {isMaster ? "MASTER • ALL PROJECTS" : "PROJECT ACCESS"}</div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="absolute -right-3 top-[90px] hidden size-7 place-items-center rounded-full border border-white/10 bg-[#0d1b2d] text-slate-500 shadow-xl transition hover:border-cyan-300/20 hover:text-cyan-200 lg:grid"
        aria-label={collapsed ? "Mở sidebar" : "Thu sidebar"}
      >
        <ChevronLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.06] bg-[#07111f]/95 backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-white/[0.08] bg-[#07111f] shadow-2xl">
            {navContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
