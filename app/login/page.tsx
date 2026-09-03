import { Cpu, Database, LockKeyhole, Radar } from "lucide-react";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-30 md:right-8 md:top-8">
        <ThemeToggle />
      </div>
      <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-300/[0.035] blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-[1380px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden flex-col justify-between p-12 lg:flex xl:p-16">
          <Logo />
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/65">
              <span className="h-px w-8 bg-amber-300/50" />
              Multi-project Operations
            </div>
            <h2 className="text-[46px] font-semibold leading-[1.04] tracking-[-0.055em] text-white xl:text-[58px]">
              One workspace,
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                every project in control.
              </span>
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-500">
              ASC WORKING là workspace dùng chung để quản lý nhiều dự án. EPU là dự án đầu tiên hiện tại; các dự án sau sẽ dùng cùng cấu trúc Dashboard, PLHĐ, Phòng ban, ISSUE và Remote Server với dữ liệu được tách theo project_id.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              {[
                [Radar, "Project Context", "Chuyển dự án trong cùng workspace"],
                [Database, "Structured Data", "PostgreSQL multi-project"],
                [LockKeyhole, "Secure Access", "Supabase Auth + RLS"],
                [Cpu, "Deploy Ready", "Next.js + Vercel"],
              ].map(([Icon, title, text]) => {
                const C = Icon as typeof Radar;
                return (
                  <div key={String(title)} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <C className="mb-3 size-4 text-amber-300/70" />
                    <div className="text-xs font-medium text-slate-300">{String(title)}</div>
                    <div className="mt-1 text-[11px] text-slate-600">{String(text)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-700">
            © 2026 HuyVo • ASC WORKING V1.7.0
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-4 md:p-8">
          <LoginForm configured={configured} />
        </section>
      </div>
    </main>
  );
}
