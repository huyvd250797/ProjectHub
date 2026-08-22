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
      {selectedProject.organizationName ? <> — {selectedProject.organizationName}</> : null}. Ở V0.2.0 các KPI trên Dashboard vẫn là seed UX từ EPU; V0.3.0 sẽ query dữ liệu thật theo selected project_id, nên cùng thiết kế này sẽ dùng được cho mọi dự án.
    </>
  );
}

export function CurrentProjectContractDescription() {
  const { selectedProject } = useProject();
  return (
    <>
      Phạm vi PLHĐ của dự án <span className="font-medium text-slate-300">{selectedProject.code}</span>. V0.2.0 đã chuẩn bị schema multi-project và Import POC; dữ liệu grid hiện vẫn là seed UX cho tới bước Apply Import ở phiên bản sau.
    </>
  );
}
