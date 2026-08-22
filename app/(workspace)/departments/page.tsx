import { Building2, ChevronRight, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Phòng ban" };

const rows = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  name: `Phòng/đơn vị ${String(index + 1).padStart(2, "0")}`,
  total: [54, 47, 39, 36, 31, 29, 28, 26, 23][index],
  done: [35, 29, 28, 18, 21, 19, 17, 16, 14][index],
}));

export default function DepartmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stakeholder Matrix"
        title="Phòng ban"
        description="Theo dõi tổng yêu cầu, mức xử lý và mức bàn giao theo đơn vị. Dữ liệu phòng ban trên Dashboard đã sẵn sàng đọc theo project; màn hình này sẽ hoàn thiện ở V0.5.0."
      />

      <div className="tech-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
            <input
              placeholder="Tìm phòng ban..."
              className="h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.02] pl-8 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700"
            />
          </div>
          <button className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-500">
            <Filter className="size-3.5" /> Bộ lọc
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-white/[0.025] text-left text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <tr>
                {["Phòng ban", "Tổng yêu cầu", "Đã xử lý", "Còn lại", "% xử lý", ""].map((head) => (
                  <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const remaining = row.total - row.done;
                const pct = Math.round((row.done / row.total) * 100);
                return (
                  <tr key={row.id} className="border-b border-white/[0.04] text-xs hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
                          <Building2 className="size-3.5 text-cyan-300/60" />
                        </div>
                        <span className="font-medium text-slate-300">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{row.total}</td>
                    <td className="px-4 py-3 text-emerald-300/70">{row.done}</td>
                    <td className="px-4 py-3 text-amber-200/70">{remaining}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="h-full rounded-full bg-cyan-300/60" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-white/[0.04] hover:text-cyan-200">
                        <ChevronRight className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
