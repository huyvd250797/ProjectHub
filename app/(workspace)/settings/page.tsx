import { CheckCircle2, CircleDashed, Code2, Database, GitBranch, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Thiết lập" };

export default function SettingsPage() {
  const supabaseReady = isSupabaseConfigured();

  const checks = [
    { label: "Next.js App Router", text: "Framework nền tảng", ok: true, icon: Code2 },
    { label: "Vercel deployment", text: "Không cấu hình output directory", ok: true, icon: GitBranch },
    { label: "Supabase connection", text: supabaseReady ? "Environment đã nhận" : "Đang chạy Demo Mode", ok: supabaseReady, icon: Database },
    { label: "Auth / RLS", text: "Foundation có sẵn, hoàn thiện ở V0.2.0+", ok: false, icon: ShieldCheck },
  ];

  return (
    <>
      <PageHeader
        eyebrow="System Foundation"
        title="Thiết lập"
        description="Kiểm tra trạng thái skeleton và môi trường. V0.1.0 chưa có màn hình quản trị danh mục/database."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {checks.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="tech-panel rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                  <Icon className="size-4 text-cyan-300/65" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{item.text}</div>
                </div>
                {item.ok ? (
                  <CheckCircle2 className="ml-auto size-4 text-emerald-300/65" />
                ) : (
                  <CircleDashed className="ml-auto size-4 text-amber-300/50" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="tech-panel mt-4 rounded-2xl p-5 md:p-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Release</div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-white">ASC-Working V0.1.0</div>
            <div className="mt-1 text-xs text-slate-500">Foundation / Deployable Skeleton</div>
          </div>
          <span className="w-fit rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
            Ready for Vercel
          </span>
        </div>
      </div>
    </>
  );
}
