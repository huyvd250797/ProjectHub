import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

const toneMap = {
  cyan: "from-cyan-300/20 to-cyan-300/0 text-cyan-200 border-cyan-300/15",
  violet: "from-violet-400/20 to-violet-400/0 text-violet-200 border-violet-400/15",
  emerald: "from-emerald-400/20 to-emerald-400/0 text-emerald-200 border-emerald-400/15",
  amber: "from-amber-300/20 to-amber-300/0 text-amber-200 border-amber-300/15",
};

export function StatCard({
  label,
  value,
  note,
  tone = "cyan",
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  tone?: keyof typeof toneMap;
  icon: LucideIcon;
}) {
  return (
    <div className="tech-panel tech-panel-hover relative overflow-hidden rounded-2xl p-5">
      <div
        className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${toneMap[tone].split(" ").slice(0, 2).join(" ")} opacity-50`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {value}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpRight className="size-3.5 text-cyan-300/70" />
            {note}
          </div>
        </div>
        <div className={`rounded-xl border bg-white/[0.025] p-2.5 ${toneMap[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
