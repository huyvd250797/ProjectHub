import { Filter, ListFilter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { issueSamples } from "@/lib/mock-data";

export const metadata = { title: "ISSUE" };

const statusClass: Record<string, string> = {
  "Đang xử lý": "border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200",
  "Chờ xử lý": "border-amber-300/15 bg-amber-300/[0.07] text-amber-200",
  "Đã xử lý": "border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200",
};

export default function IssuesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Execution Control"
        title="ISSUE"
        description="Grid nghiệp vụ trung tâm theo project context. V0.5.0 đã hoàn thiện Department Intelligence theo project; ISSUE Core sẽ được hoàn thiện ở V0.6.0."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] transition hover:bg-cyan-200">
            <Plus className="size-4" /> Thêm ISSUE
          </button>
        }
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {["Tất cả 313", "Chưa bàn giao", "Tôi phụ trách", "Quá hạn", "Chờ xử lý", "Giai đoạn 2"].map((item, index) => (
          <button
            key={item}
            className={`shrink-0 rounded-xl border px-3 py-2 text-[10px] transition ${
              index === 0
                ? "border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-200"
                : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="tech-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
            <input
              placeholder="Tìm nội dung, Jira, Module, người phụ trách..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-500">
              <Filter className="size-3.5" /> Trạng thái
            </button>
            <button className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-500">
              <ListFilter className="size-3.5" /> Phòng ban
            </button>
            <button className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-500">
              <SlidersHorizontal className="size-3.5" /> Cột
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="bg-white/[0.025] text-left text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <tr>
                {["Mã", "Nội dung yêu cầu", "Trạng thái", "Ưu tiên", "Phòng ban", "Phụ trách", "Due Date"].map((head) => (
                  <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issueSamples.map((issue) => (
                <tr key={issue.code} className="border-b border-white/[0.04] text-xs text-slate-400 hover:bg-white/[0.02]">
                  <td className="px-4 py-4 font-mono text-[10px] text-cyan-300/65">{issue.code}</td>
                  <td className="max-w-[520px] px-4 py-4 font-medium leading-5 text-slate-300">{issue.content}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-lg border px-2 py-1 text-[10px] ${statusClass[issue.status] ?? "border-white/[0.06] text-slate-500"}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="grid size-6 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.025] font-semibold text-amber-200/80">
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{issue.department}</td>
                  <td className="px-4 py-4 text-slate-500">{issue.assignee}</td>
                  <td className="px-4 py-4 text-slate-600">{issue.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.04] px-4 py-3 text-[10px] text-slate-700">
          <span>Preview 3 / 313 ISSUE</span>
          <span>V0.6.0 → CRUD + inline edit + filter thật</span>
        </div>
      </div>
    </>
  );
}
