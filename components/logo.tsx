import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_30px_rgba(46,211,255,0.08)]">
        <div className="absolute inset-[6px] rotate-45 rounded-[6px] border border-cyan-300/30" />
        <span className="relative text-[11px] font-black tracking-[-0.04em] text-cyan-200">
          ASC
        </span>
      </div>
      <div className={cn("min-w-0", compact && "hidden")}>
        <div className="truncate text-sm font-semibold tracking-[0.12em] text-white">
          ASC-WORKING
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
          Project Workspace
        </div>
      </div>
    </div>
  );
}
