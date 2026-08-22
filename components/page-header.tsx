import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
          <span className="h-px w-6 bg-cyan-300/50" />
          {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white md:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
