"use client";

import { useProject } from "@/components/project-context";

export function CurrentProjectTitle({ prefix }: { prefix: string }) {
  const { selectedProject } = useProject();
  return <>{prefix} {selectedProject.code}</>;
}

export function CurrentProjectDashboardDescription() {
  const { selectedProject } = useProject();
  return (
    <>
      Project context hiện tại: <span className="font-medium text-slate-300">{selectedProject.code}</span>
      {selectedProject.organizationName ? <> — {selectedProject.organizationName}</> : null}. V0.2.0 vẫn dùng KPI seed/mock để duyệt UX; V0.3.0 sẽ query dữ liệu thật theo selected project_id.
    </>
  );
}

export function CurrentProjectContractDescription() {
  const { selectedProject } = useProject();
  return (
    <>
      Project context: <span className="font-medium text-slate-300">{selectedProject.code}</span>. V0.2.0 đã có schema multi-project và Import POC; grid PLHĐ hiện vẫn là UX seed cho đến khi dữ liệu được Apply Import ở version tiếp theo.
    </>
  );
}
