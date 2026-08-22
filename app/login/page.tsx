import Image from "next/image";
import { Cpu, Database, LockKeyhole, Radar } from "lucide-react";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-300/[0.035] blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-[1380px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden flex-col justify-between p-12 lg:flex xl:p-16">
          <Logo />
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/65">
              <span className="h-px w-8 bg-amber-200/50" />
              ASC Project Operations
            </div>
            <div className="mb-7 relative size-24 overflow-hidden rounded-[24px] border border-amber-200/15 bg-black shadow-[0_0_55px_rgba(220,180,50,0.08)]">
              <Image src="/branding/hv-logo.jpg" alt="ASC-Working" fill sizes="96px" className="object-cover" priority />
            </div>
            <h2 className="text-[46px] font-semibold leading-[1.04] tracking-[-0.055em] text-white xl:text-[58px]">
              One workspace,
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-cyan-200 bg-clip-text text-transparent">
                many projects.
              </span>
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-500">
              ASC-Working là Project Workspace dùng chung cho nhiều dự án. EPU là dự án đầu tiên; các dự án tiếp theo dùng cùng thiết kế nhưng dữ liệu được tách biệt theo Project.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              {[
                [Radar, "Project Intelligence", "Dashboard riêng theo từng dự án"],
                [Database, "Multi-project Data", "Mọi bảng nghiệp vụ có project_id"],
                [LockKeyhole, "Secure Access", "Auth + RLS theo membership"],
                [Cpu, "Deploy Ready", "Next.js + Supabase + Vercel"],
              ].map(([Icon, title, text]) => {
                const C = Icon as typeof Radar;
                return (
                  <div key={String(title)} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <C className="mb-3 size-4 text-amber-200/70" />
                    <div className="text-xs font-medium text-slate-300">{String(title)}</div>
                    <div className="mt-1 text-[11px] text-slate-600">{String(text)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-700">
            © 2026 HuyVo • ASC-Working V0.2.0
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-4 md:p-8">
          <LoginForm configured={configured} />
        </section>
      </div>
    </main>
  );
}
