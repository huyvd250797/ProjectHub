"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleGauge,
  Clock3,
  FileStack,
  Layers3,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { PageHeader } from "@/components/page-header";
import type { DashboardApiResponse, DashboardData } from "@/lib/dashboard/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value) + " ₫";
}

const projectStatusLabel = {
  active: "Đang triển khai",
  paused: "Tạm dừng",
  completed: "Hoàn tất",
  archived: "Lưu trữ",
} as const;

const healthMeta = {
  on_track: { label: "ON TRACK", className: "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200" },
  near_deadline: { label: "NEAR DEADLINE", className: "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" },
  overdue: { label: "OVERDUE", className: "border-rose-300/15 bg-rose-300/[0.06] text-rose-200" },
  not_scheduled: { label: "NO SCHEDULE", className: "border-white/[0.08] bg-white/[0.03] text-slate-500" },
} as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="tech-panel h-[132px] animate-pulse rounded-2xl bg-white/[0.02]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="tech-panel h-[330px] animate-pulse rounded-2xl bg-white/[0.02]" />
        <div className="tech-panel h-[330px] animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  href,
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: number;
  note: string;
  href?: string;
  icon: typeof ListTodo;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "rose";
}) {
  const classes = {
    cyan: "text-cyan-200 border-cyan-300/15 bg-cyan-300/[0.055]",
    violet: "text-violet-200 border-violet-300/15 bg-violet-300/[0.055]",
    emerald: "text-emerald-200 border-emerald-300/15 bg-emerald-300/[0.055]",
    amber: "text-amber-200 border-amber-300/15 bg-amber-300/[0.055]",
    rose: "text-rose-200 border-rose-300/15 bg-rose-300/[0.055]",
  }[accent];

  const content = (
    <div className="tech-panel tech-panel-hover h-full rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{value.toLocaleString("vi-VN")}</div>
          <div className="mt-2 text-[10px] text-slate-600">{note}</div>
        </div>
        <div className={`grid size-9 place-items-center rounded-xl border ${classes}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function EmptyDatabaseNotice({ projectCode }: { projectCode: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-4">
      <div className="flex items-start gap-3">
        <DatabaseIcon />
        <div>
          <div className="text-xs font-semibold text-amber-100">Database của {projectCode} chưa có dữ liệu nghiệp vụ</div>
          <p className="mt-1 text-xs leading-5 text-amber-100/50">
            Dashboard đang đọc Supabase thật và trả về 0, không dùng số mock. Hãy nạp PLHĐ/ISSUE/Phòng ban vào database để KPI tự cập nhật.
          </p>
        </div>
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06]">
      <Layers3 className="size-4 text-amber-200" />
    </div>
  );
}

export function ProjectDashboard() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard?projectId=${encodeURIComponent(selectedProject.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as DashboardApiResponse;
        if (cancelled) return;
        if (!payload.ok) {
          setData(null);
          setError({ code: payload.code, message: payload.message });
          return;
        }
        setData(payload.data);
      } catch (caught) {
        if (cancelled || controller.signal.aborted) return;
        setData(null);
        setError({
          code: "NETWORK_ERROR",
          message: caught instanceof Error ? caught.message : "Không kết nối được Dashboard API.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedProject.id, reloadKey]);

  const status = data ? projectStatusLabel[data.project.status] : "Đang tải";
  const health = data ? healthMeta[data.schedule.health] : healthMeta.not_scheduled;
  const databaseEmpty = Boolean(data?.source === "database" && data.summary.totalIssues === 0 && data.summary.modules === 0);

  const issueCards = useMemo(() => {
    if (!data) return [];
    return [
      ["Chờ khách hàng", data.issueKpis.waitingCustomer, "Cần phản hồi từ khách hàng", "/issues?status=waiting_customer", Clock3, "amber"],
      ["Chờ xử lý", data.issueKpis.waiting, "Chưa bắt đầu xử lý", "/issues?status=waiting", ListTodo, "violet"],
      ["Đang xử lý", data.issueKpis.processing, "ISSUE đang active", "/issues?status=processing", CircleGauge, "cyan"],
      ["Đã xử lý", data.issueKpis.resolved, "Đã hoàn tất nghiệp vụ", "/issues?status=resolved", CheckCircle2, "emerald"],
      ["Đã Release", data.issueKpis.released, "Đã đưa vào bản release", "/issues?status=released", Rocket, "emerald"],
      ["Đã bàn giao", data.issueKpis.handedOver, "Khách hàng đã nhận", "/issues?customerStatus=handed_over", ShieldCheck, "cyan"],
      ["Chưa bàn giao", data.issueKpis.notHandedOver, "Cần theo dõi bàn giao", "/issues?customerStatus=not_handed_over", FileStack, "amber"],
      ["Quá hạn", data.issueKpis.overdue, "Due date đã qua", "/issues?overdue=1", AlertTriangle, "rose"],
    ] as const;
  }, [data]);

  return (
    <>
      <PageHeader
        eyebrow="Project Intelligence"
        title={`Dashboard dự án ${selectedProject.code}`}
        description={
          <>
            Dữ liệu điều hành theo project đang chọn. <span className="font-medium text-slate-300">ASC WORKING</span> là Project Workspace chung; EPU chỉ là một project trong hệ thống.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {data?.source === "demo" ? (
              <span className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200">Demo data</span>
            ) : (
              <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Live Supabase</span>
            )}
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="grid size-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:text-cyan-200"
              aria-label="Tải lại Dashboard"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {loading ? <DashboardSkeleton /> : null}

      {!loading && error ? (
        <div className="tech-panel rounded-2xl border-rose-300/15 p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300/15 bg-rose-300/[0.06]">
              <AlertTriangle className="size-4 text-rose-200" />
            </div>
            <div>
              <div className="text-sm font-semibold text-rose-100">Không tải được Dashboard</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{error.message}</div>
              {error.code === "V030_MIGRATION_REQUIRED" ? (
                <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2 font-mono text-[10px] text-slate-500">
                  supabase/migrations/202608220002_v030_dashboard_rpc.sql
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && data ? (
        <div className="space-y-4">
          {databaseEmpty ? <EmptyDatabaseNotice projectCode={data.project.code} /> : null}

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard label="Tổng ISSUE" value={data.summary.totalIssues} note="Theo project hiện tại" href="/issues" icon={ListTodo} accent="cyan" />
            <KpiCard label="Module" value={data.summary.modules} note={`${data.summary.subsystems} phân hệ`} href="/contract" icon={Layers3} accent="violet" />
            <KpiCard label="Phòng ban" value={data.summary.departments} note="Đơn vị tham gia dự án" href="/departments" icon={Building2} accent="emerald" />
            <KpiCard label="PLHĐ chi tiết" value={data.summary.contractDetails} note="Node phạm vi hợp đồng" href="/contract" icon={FileStack} accent="amber" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr_.92fr]">
            <div className="tech-panel rounded-2xl p-5 md:p-6">
              <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">Project Overview</div>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">{data.project.organizationName || data.project.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{data.project.name}</p>
                </div>
                <span className="w-fit rounded-xl border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200">{status}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
                {[
                  ["Mã dự án", data.project.code],
                  ["Số hợp đồng", data.project.contractNo || "—"],
                  ["Ngày ký", formatDate(data.project.contractDate)],
                  ["Ngày bắt đầu", formatDate(data.project.startDate)],
                  ["Ngày kết thúc", formatDate(data.project.dueDate)],
                  ["Giá trị HĐ", formatMoney(data.project.contractValue)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-slate-700">{label}</div>
                    <div className="mt-1.5 truncate text-xs font-medium text-slate-300">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tech-panel rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">Master Plan</div>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-white">Tiến độ thời gian</h2>
                </div>
                <span className={`rounded-xl border px-3 py-2 text-[9px] font-semibold tracking-[0.12em] ${health.className}`}>{health.label}</span>
              </div>

              <div className="mt-7">
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-semibold tracking-[-0.05em] text-white">{data.schedule.timeProgress ?? 0}%</span>
                    <span className="ml-2 text-[10px] text-slate-600">thời gian đã sử dụng</span>
                  </div>
                  <CalendarClock className="size-5 text-cyan-300/50" />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300/75 to-violet-400/70" style={{ width: `${Math.min(100, data.schedule.timeProgress ?? 0)}%` }} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] pt-4 text-center">
                <div><div className="text-lg font-semibold text-white">{data.schedule.durationDays ?? "—"}</div><div className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-700">Tổng ngày</div></div>
                <div><div className="text-lg font-semibold text-cyan-100">{data.schedule.elapsedDays ?? "—"}</div><div className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-700">Đã chạy</div></div>
                <div><div className="text-lg font-semibold text-amber-100">{data.schedule.remainingDays ?? "—"}</div><div className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-700">Còn lại</div></div>
              </div>
            </div>
          </section>

          <section className="tech-panel rounded-2xl p-5 md:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">Project Stages</div>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-white">Tiến độ theo Stage</h2>
              </div>
              <span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-[9px] text-slate-600">{data.stages.length} stages</span>
            </div>
            {data.stages.length ? (
              <div className="space-y-5">
                {data.stages.map((stage, index) => (
                  <div key={stage.id || stage.code} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
                    <div className="grid size-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-[10px] font-semibold text-slate-500">{String(index + 1).padStart(2, "0")}</div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-slate-300">{stage.name}</span>
                        <span className="text-[10px] text-slate-600">{stage.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-violet-400/70" style={{ width: `${Math.min(100, stage.progress)}%` }} /></div>
                    </div>
                    <div className="hidden min-w-[110px] text-right sm:block">
                      <div className="text-[9px] text-slate-500">{stage.status || "—"}</div>
                      <div className="mt-0.5 text-[8px] text-slate-700">{formatDate(stage.startDate)} → {formatDate(stage.endDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-xs text-slate-600">Chưa cấu hình Stage cho project này.</div>}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">ISSUE Control</div><h2 className="mt-1 text-base font-semibold text-white">Trạng thái xử lý & bàn giao</h2></div>
              <Link href="/issues" className="flex items-center gap-1 text-[10px] font-medium text-cyan-200/70 hover:text-cyan-100">Mở ISSUE <ArrowRight className="size-3" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {issueCards.map(([label, value, note, href, icon, accent]) => (
                <KpiCard key={label} label={label} value={value} note={note} href={href} icon={icon} accent={accent} />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[.82fr_1.18fr]">
            <div className="tech-panel rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between">
                <div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-rose-300/60">Needs Attention</div><h2 className="mt-2 text-lg font-semibold text-white">Cần xử lý ngay</h2></div>
                <AlertTriangle className="size-5 text-rose-300/55" />
              </div>
              <div className="mt-5 space-y-2">
                {[
                  ["ISSUE quá hạn", data.attention.overdue, "/issues?overdue=1", "rose"],
                  ["Chưa có phụ trách", data.attention.missingAssignee, "/issues?missingAssignee=1", "amber"],
                  ["Chưa xác định Module", data.attention.missingModule, "/issues?missingModule=1", "amber"],
                  ["Chưa xác định Phòng ban", data.attention.missingDepartment, "/issues?missingDepartment=1", "amber"],
                  ["Gần Due Date (7 ngày)", data.attention.nearDue, "/issues?nearDue=7", "cyan"],
                ].map(([label, value, href, tone]) => (
                  <Link key={String(label)} href={String(href)} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-3 transition hover:border-white/[0.09] hover:bg-white/[0.03]">
                    <span className={`size-2 rounded-full ${tone === "rose" ? "bg-rose-400" : tone === "amber" ? "bg-amber-300" : "bg-cyan-300"}`} />
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="ml-auto text-sm font-semibold text-white">{Number(value).toLocaleString("vi-VN")}</span>
                    <ArrowRight className="size-3 text-slate-700" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="tech-panel rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between">
                <div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-300/60">Contract Pulse</div><h2 className="mt-2 text-lg font-semibold text-white">Tình trạng bàn giao PLHĐ</h2></div>
                <FileStack className="size-5 text-violet-300/55" />
              </div>
              <div className="mt-6 grid grid-cols-[150px_1fr] items-center gap-6">
                <div className="relative grid size-[150px] place-items-center rounded-full border border-white/[0.06] bg-black/10">
                  <div className="absolute inset-3 rounded-full border-[10px] border-white/[0.04]" />
                  <div className="absolute inset-3 rounded-full" style={{ background: `conic-gradient(rgba(46,211,255,.82) 0 ${Math.min(100, data.contract.handoverProgress)}%, rgba(255,255,255,.035) ${Math.min(100, data.contract.handoverProgress)}% 100%)`, mask: "radial-gradient(circle, transparent 56%, black 57%)" }} />
                  <div className="text-center"><div className="text-3xl font-semibold tracking-[-0.05em] text-white">{data.contract.handoverProgress}%</div><div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-slate-700">Handover</div></div>
                </div>
                <div className="space-y-4">
                  <div><div className="text-[9px] uppercase tracking-[0.13em] text-slate-700">Đã bàn giao</div><div className="mt-1 text-2xl font-semibold text-emerald-100">{data.contract.handedOver.toLocaleString("vi-VN")}</div></div>
                  <div><div className="text-[9px] uppercase tracking-[0.13em] text-slate-700">Còn lại</div><div className="mt-1 text-2xl font-semibold text-amber-100">{data.contract.remaining.toLocaleString("vi-VN")}</div></div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="tech-panel rounded-2xl p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">Department Matrix</div><h2 className="mt-2 text-lg font-semibold text-white">Top phòng ban theo ISSUE</h2></div><Building2 className="size-5 text-emerald-300/50" /></div>
              <div className="space-y-3">
                {data.departments.length ? data.departments.map((item) => (
                  <Link key={item.id} href={`/departments?departmentId=${encodeURIComponent(item.id)}`} className="block rounded-xl border border-white/[0.05] bg-white/[0.018] p-3 hover:bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-medium text-slate-300">{item.name}</span><span className="text-[10px] text-slate-500">{item.total} ISSUE</span></div>
                    <div className="mt-2 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-emerald-300/60" style={{ width: `${Math.min(100, item.progress)}%` }} /></div><span className="w-9 text-right text-[9px] text-slate-600">{item.progress}%</span></div>
                  </Link>
                )) : <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-xs text-slate-600">Chưa có dữ liệu phòng ban.</div>}
              </div>
            </div>

            <div className="tech-panel rounded-2xl p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">ASC Workload</div><h2 className="mt-2 text-lg font-semibold text-white">Tải công việc thành viên</h2></div><UsersRound className="size-5 text-cyan-300/50" /></div>
              <div className="space-y-3">
                {data.members.length ? data.members.map((member) => (
                  <Link key={member.id} href={`/issues?assigneeId=${encodeURIComponent(member.id)}`} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3 hover:bg-white/[0.03]">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.045]"><UserRoundCheck className="size-4 text-cyan-300/60" /></div>
                    <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><span className="truncate text-xs font-medium text-slate-300">{member.name}</span><span className="text-[10px] text-slate-600">{member.completed}/{member.assigned}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-cyan-300/60" style={{ width: `${Math.min(100, member.progress)}%` }} /></div></div>
                    <span className="text-[9px] font-semibold text-slate-600">{member.progress}%</span>
                  </Link>
                )) : <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-xs text-slate-600">Chưa có ISSUE gán cho thành viên ASC.</div>}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link href="/issues" className="tech-panel tech-panel-hover flex items-center gap-3 rounded-2xl p-4"><ListTodo className="size-4 text-cyan-300/60" /><div><div className="text-xs font-medium text-slate-300">ISSUE Control</div><div className="mt-1 text-[10px] text-slate-700">Đi tới danh sách ISSUE</div></div><ArrowRight className="ml-auto size-3.5 text-slate-700" /></Link>
            <Link href="/contract" className="tech-panel tech-panel-hover flex items-center gap-3 rounded-2xl p-4"><FileStack className="size-4 text-violet-300/60" /><div><div className="text-xs font-medium text-slate-300">PLHĐ</div><div className="mt-1 text-[10px] text-slate-700">Mở phạm vi hợp đồng</div></div><ArrowRight className="ml-auto size-3.5 text-slate-700" /></Link>
            <Link href="/departments" className="tech-panel tech-panel-hover flex items-center gap-3 rounded-2xl p-4"><Building2 className="size-4 text-emerald-300/60" /><div><div className="text-xs font-medium text-slate-300">Phòng ban</div><div className="mt-1 text-[10px] text-slate-700">Theo dõi stakeholder</div></div><ArrowRight className="ml-auto size-3.5 text-slate-700" /></Link>
          </section>

          <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-slate-700">
            <span>Source: {data.source === "database" ? "Supabase" : "Demo Mode"}</span><span>•</span><span>Project: {data.project.code}</span><span>•</span><span>Updated: {new Date(data.generatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
