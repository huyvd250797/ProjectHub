export default function WorkspaceLoading() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="size-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(57,216,255,0.65)]" />
        Đang chuẩn bị Project Workspace...
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="tech-panel asc-skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="tech-panel asc-skeleton h-[360px] rounded-2xl" />
    </div>
  );
}
