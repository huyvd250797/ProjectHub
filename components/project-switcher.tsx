"use client";

import { Building2, ChevronDown, Layers3 } from "lucide-react";
import { useProject } from "@/components/project-context";

export function ProjectSwitcher() {
  const { projects, selectedProject, selectProject } = useProject();

  return (
    <div className="relative hidden min-w-[220px] lg:block">
      <Building2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-amber-300/70" />
      <select
        aria-label="Chọn dự án"
        value={selectedProject.id}
        onChange={(event) => selectProject(event.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.025] pl-9 pr-9 text-xs font-medium text-slate-200 outline-none transition hover:border-amber-200/15 focus:border-cyan-300/20"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id} className="bg-[#0b1727] text-slate-100">
            {project.code} • {project.organizationName || project.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
      {projects.length > 1 ? (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-cyan-200/20 bg-[#0b1727] text-[8px] text-cyan-200">
          {projects.length}
        </span>
      ) : null}
    </div>
  );
}

export function MobileProjectChip() {
  const { selectedProject } = useProject();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 lg:hidden">
      <Layers3 className="size-3.5 text-amber-300/70" />
      <span className="text-[10px] font-semibold text-slate-300">{selectedProject.code}</span>
    </div>
  );
}
