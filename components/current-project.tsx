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
      Project đang chọn: <span className="font-medium text-slate-300">{selectedProject.code}</span>
      {selectedProject.organizationName ? <> — {selectedProject.organizationName}</> : null}. Dashboard V0.3.0 đọc dữ liệu Supabase thật theo selected project_id.
    </>
  );
}

export function CurrentProjectContractDescription() {
  const { selectedProject } = useProject();
  return (
    <>
      Phạm vi PLHĐ của dự án <span className="font-medium text-slate-300">{selectedProject.code}</span>. Cùng một màn hình sẽ dùng cho mọi project trong ASC WORKING.
    </>
  );
}
