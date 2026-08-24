"use client";

import { BriefcaseBusiness } from "lucide-react";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";

export function ProjectSwitcher() {
  const { projects, selectedProject, selectProject, isMaster } = useProject();

  return (
    <ThemedSelect
      ariaLabel="Chọn dự án"
      value={selectedProject.id}
      onChange={selectProject}
      options={projects.map((project) => ({
        value: project.id,
        label: `${project.code} • ${project.organizationName || project.name}`,
        description: `${project.name}${isMaster ? " • MASTER access" : ""}`,
      }))}
      leading={<BriefcaseBusiness className="size-3.5" />}
      className="hidden min-w-[295px] lg:block"
      buttonClassName="border-cyan-300/15 bg-[#091625]/95"
      menuClassName="min-w-[330px]"
    />
  );
}

export function MobileProjectChip() {
  const { selectedProject, isMaster } = useProject();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 lg:hidden">
      <BriefcaseBusiness className="size-3.5 text-amber-300/75" />
      <span className="text-[10px] font-semibold text-slate-300">{selectedProject.code}{isMaster ? " • MASTER" : ""}</span>
    </div>
  );
}
