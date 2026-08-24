"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ASC WORKING workspace error", error);
  }, [error]);

  return (
    <div className="tech-panel mx-auto max-w-2xl rounded-2xl p-6 md:p-8">
      <div className="grid size-11 place-items-center rounded-2xl border border-rose-300/15 bg-rose-300/[0.06]">
        <AlertTriangle className="size-5 text-rose-200" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-white">Có lỗi khi tải màn hình</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Dữ liệu chưa bị thay đổi. Bạn có thể thử tải lại khu vực này; nếu lỗi lặp lại hãy mở System Readiness/UAT để kiểm tra kết nối và migration.
      </p>
      {error.digest ? <div className="mt-3 font-mono text-[10px] text-slate-700">Error ID: {error.digest}</div> : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] hover:bg-cyan-200"
      >
        <RefreshCw className="size-4" /> Thử lại
      </button>
    </div>
  );
}
