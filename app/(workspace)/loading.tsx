import { LoaderCircle } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <LoaderCircle className="size-4 animate-spin text-cyan-300" />
        Đang chuẩn bị Project Workspace...
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="tech-panel h-32 animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="tech-panel h-[360px] animate-pulse rounded-2xl" />
    </div>
  );
}
