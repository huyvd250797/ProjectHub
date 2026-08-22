import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-amber-300/20 bg-black/30 shadow-[0_0_30px_rgba(250,204,21,0.08)]">
        <Image
          src="/branding/hv-logo.jpg"
          alt="Project Hub"
          fill
          priority
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className={cn("min-w-0", compact && "hidden")}>
        <div className="truncate text-sm font-semibold tracking-[0.12em] text-white">
          PROJECT HUB
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
          Project Workspace
        </div>
      </div>
    </div>
  );
}
