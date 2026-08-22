import { Copy, Eye, ExternalLink, LockKeyhole, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { resourceGroups } from "@/lib/mock-data";

export const metadata = { title: "Remote Server" };

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Secure Infrastructure"
        title="Link Remote Server"
        description="Kho tài nguyên dự án theo hướng secure-by-default. V0.1.0 không mang credential thật từ workbook vào source code."
      />

      <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06]">
            <ShieldAlert className="size-4 text-amber-200" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-100">Security boundary</div>
            <p className="mt-1 text-xs leading-5 text-amber-100/50">
              Username/password trong workbook không được hard-code vào V0.1.0. V0.8.0 sẽ bổ sung encryption server-only, quyền Reveal/Copy và audit log.
            </p>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {resourceGroups.map((group) => (
          <div key={group.label} className="tech-panel tech-panel-hover rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05] font-mono text-[9px] font-bold text-cyan-200">
                {group.icon}
              </div>
              <span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-600">
                {group.count} items
              </span>
            </div>
            <h2 className="mt-5 text-sm font-semibold text-slate-200">{group.label}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">{group.description}</p>
          </div>
        ))}
      </section>

      <div className="tech-panel mt-4 overflow-hidden rounded-2xl">
        <div className="border-b border-white/[0.06] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Resource preview
        </div>
        {[
          ["Portal Production", "https://••••••••", "viewer-user", "Production"],
          ["SQL / Database", "•••.•••.•••.•••", "db-user", "Production"],
          ["Portal Test", "https://test.••••••", "tester", "Test"],
        ].map((row) => (
          <div key={row[0]} className="grid grid-cols-1 gap-3 border-b border-white/[0.04] px-4 py-4 text-xs md:grid-cols-[1.3fr_1.5fr_1fr_.8fr_auto] md:items-center">
            <div className="font-medium text-slate-300">{row[0]}</div>
            <div className="font-mono text-[10px] text-slate-600">{row[1]}</div>
            <div className="text-slate-600">{row[2]}</div>
            <span className="w-fit rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-500">{row[3]}</span>
            <div className="flex gap-1.5">
              {[Eye, Copy, ExternalLink].map((Icon, index) => (
                <button
                  key={index}
                  disabled={index < 2}
                  className="grid size-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-600 disabled:opacity-30"
                  title={index < 2 ? "Sẽ kích hoạt theo quyền ở V0.8.0" : "Mở liên kết"}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-3 text-[10px] text-slate-700">
          <LockKeyhole className="size-3.5" />
          Secret values are intentionally excluded from this source package.
        </div>
      </div>
    </>
  );
}
