import {
  Activity,
  Building2,
  CheckCircle2,
  CircleGauge,
  Clock3,
  FileStack,
  Layers3,
  ListTodo,
  Radar,
  ServerCog,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CurrentProjectDashboardDescription, CurrentProjectTitle } from "@/components/current-project";
import { StatCard } from "@/components/stat-card";
import { dashboardStats, stages } from "@/lib/mock-data";

export const metadata = { title: "Dashboard" };

const icons = [ListTodo, Layers3, Building2, Radar] as const;
const tones = ["cyan", "violet", "emerald", "amber"] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Project Intelligence"
        title={<CurrentProjectTitle prefix="Dashboard dự án" />}
        description={<CurrentProjectDashboardDescription />}
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
              System Online
            </span>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((item, index) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            note={item.delta}
            tone={tones[index]}
            icon={icons[index]}
          />
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="tech-panel rounded-2xl p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Master Plan
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-white">
                Tiến độ theo Stage
              </h2>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-slate-500">
              5 stages
            </div>
          </div>

          <div className="space-y-5">
            {stages.map((stage, index) => (
              <div key={stage.name} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
                <div className="grid size-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-[10px] font-semibold text-slate-500">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300">{stage.name}</span>
                    <span className="text-[10px] text-slate-600">{stage.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-violet-400/70"
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                </div>
                <span className="hidden rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-500 sm:block">
                  {stage.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="tech-panel rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Contract Pulse
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-white">
                Phạm vi PLHĐ
              </h2>
            </div>
            <FileStack className="size-5 text-violet-300/60" />
          </div>

          <div className="mt-8 grid place-items-center">
            <div className="relative grid size-44 place-items-center rounded-full border border-white/[0.06] bg-black/10">
              <div className="absolute inset-3 rounded-full border-[10px] border-white/[0.04]" />
              <div
                className="absolute inset-3 rounded-full"
                style={{
                  background:
                    "conic-gradient(rgba(46,211,255,.82) 0 68%, rgba(255,255,255,.035) 68% 100%)",
                  mask: "radial-gradient(circle, transparent 56%, black 57%)",
                }}
              />
              <div className="text-center">
                <div className="text-3xl font-semibold tracking-[-0.05em] text-white">68%</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-600">
                  Demo progress
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] pt-4 text-center">
            <div>
              <div className="text-lg font-semibold text-white">12</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-600">Phân hệ</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">90</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-600">Module</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">5K+</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-600">Chi tiết</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          {
            icon: CircleGauge,
            title: "ISSUE Control",
            text: "Grid nghiệp vụ, trạng thái, ưu tiên, assignee và due date.",
            href: "/issues",
            meta: "313 records",
          },
          {
            icon: UsersRound,
            title: "Department Matrix",
            text: "Theo dõi yêu cầu và mức bàn giao theo phòng ban.",
            href: "/departments",
            meta: "09 units",
          },
          {
            icon: ServerCog,
            title: "Remote Vault",
            text: "Kho tài nguyên dự án; secret sẽ được mã hóa ở V0.8.0.",
            href: "/resources",
            meta: "Protected",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="tech-panel tech-panel-hover group rounded-2xl p-5"
            >
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05]">
                  <Icon className="size-4.5 text-cyan-300/70" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.14em] text-slate-700">{item.meta}</span>
              </div>
              <h3 className="mt-5 text-sm font-semibold text-slate-200 transition group-hover:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="tech-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <Activity className="size-4 text-emerald-300/70" />
            <div>
              <div className="text-xs font-medium text-slate-300">Foundation health</div>
              <div className="mt-0.5 text-[10px] text-slate-600">Next.js • Supabase-ready • Vercel-ready</div>
            </div>
            <CheckCircle2 className="ml-auto size-4 text-emerald-300/60" />
          </div>
        </div>
        <div className="tech-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <Clock3 className="size-4 text-amber-300/70" />
            <div>
              <div className="text-xs font-medium text-slate-300">Next milestone</div>
              <div className="mt-0.5 text-[10px] text-slate-600">V0.3.0 • Dashboard connected to database</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
