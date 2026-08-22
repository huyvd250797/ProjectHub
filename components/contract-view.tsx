"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Network, Rows3, Search } from "lucide-react";
import { contractRows } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tree = [
  {
    code: "I",
    label: "Phân hệ mẫu",
    children: [
      {
        code: "1.1",
        label: "Module mẫu 01",
        children: [
          { code: "1.1.1", label: "Nhóm chức năng / yêu cầu chi tiết" },
          { code: "1.1.2", label: "Nội dung chi tiết được import ở V0.2.0" },
        ],
      },
      {
        code: "1.2",
        label: "Module mẫu 02",
        children: [{ code: "1.2.1", label: "Tree-grid sẽ hỗ trợ 5.000+ dòng" }],
      },
    ],
  },
];

function TreeNode({
  node,
  level = 0,
}: {
  node: { code: string; label: string; children?: Array<any> };
  level?: number;
}) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = Boolean(node.children?.length);

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((value) => !value)}
        className="flex w-full items-center gap-2 border-b border-white/[0.045] px-4 py-3 text-left text-xs hover:bg-white/[0.025]"
        style={{ paddingLeft: 16 + level * 24 }}
      >
        <span className="grid size-5 place-items-center text-slate-600">
          {hasChildren ? (
            open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
          ) : (
            <span className="size-1 rounded-full bg-slate-700" />
          )}
        </span>
        <span className="w-16 shrink-0 font-mono text-[10px] text-cyan-300/60">{node.code}</span>
        <span className={cn("text-slate-400", level < 2 && "font-medium text-slate-300")}>{node.label}</span>
      </button>
      {open &&
        node.children?.map((child: any) => (
          <TreeNode key={child.code} node={child} level={level + 1} />
        ))}
    </div>
  );
}

export function ContractView() {
  const [view, setView] = useState<"overview" | "detail">("overview");

  return (
    <div className="tech-panel overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-white/[0.07] bg-black/10 p-1">
          <button
            type="button"
            onClick={() => setView("overview")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
              view === "overview" ? "bg-cyan-300/[0.1] text-cyan-100" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <Rows3 className="size-3.5" /> Tổng quan PLHĐ
          </button>
          <button
            type="button"
            onClick={() => setView("detail")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
              view === "detail" ? "bg-cyan-300/[0.1] text-cyan-100" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <Network className="size-3.5" /> Chi tiết PLHĐ
          </button>
        </div>

        <div className="relative w-full md:w-[280px]">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
          <input
            placeholder={view === "overview" ? "Tìm phân hệ, module..." : "Tìm mã hoặc nội dung chi tiết..."}
            className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] pl-8 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20"
          />
        </div>
      </div>

      {view === "overview" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead className="bg-white/[0.025] text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <tr>
                {["Mã", "Phân hệ / Module", "Loại", "ISSUE", "Đã bàn giao", "Còn lại", "Trạng thái"].map((head) => (
                  <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractRows.map((row) => (
                <tr key={row.code} className="border-b border-white/[0.04] text-xs text-slate-400 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-[10px] text-cyan-300/60">{row.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-300">{row.name}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.issues}</td>
                  <td className="px-4 py-3 text-emerald-300/80">{row.handed}</td>
                  <td className="px-4 py-3 text-amber-200/80">{row.issues - row.handed}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10px] text-slate-400">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-[10px] text-slate-700">
            Skeleton preview • dữ liệu PLHĐ thật sẽ được import và mapping ở V0.2.0.
          </div>
        </div>
      ) : (
        <div>
          {tree.map((node) => (
            <TreeNode key={node.code} node={node} />
          ))}
          <div className="p-4 text-[10px] text-slate-700">
            V0.4.0 sẽ hoàn thiện virtualization, lazy expand và mapping 5.000+ dòng.
          </div>
        </div>
      )}
    </div>
  );
}
