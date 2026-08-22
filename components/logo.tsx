"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  function reloadPage() {
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={reloadPage}
      title="Reload trang hiện tại"
      aria-label="ASC WORKING - reload trang hiện tại"
      className="group flex items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/20"
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-amber-300/20 bg-black/30 shadow-[0_0_30px_rgba(250,204,21,0.08)] transition group-hover:border-amber-200/35 group-hover:shadow-[0_0_34px_rgba(250,204,21,0.13)]">
        <Image
          src="/branding/hv-logo.jpg"
          alt="ASC WORKING"
          fill
          priority
          sizes="40px"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.035]"
        />
      </div>
      <div className={cn("min-w-0", compact && "hidden")}>
        <div className="truncate text-sm font-semibold tracking-[0.12em] text-white">
          ASC WORKING
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
          Project Workspace
        </div>
      </div>
    </button>
  );
}
