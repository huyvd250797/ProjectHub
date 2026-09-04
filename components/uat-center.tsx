"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, Copy, LoaderCircle, RefreshCw, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { useProject } from "@/components/project-context";
import type { ReadinessApiResponse, ReadinessData, ReadinessStatus } from "@/lib/readiness/types";

const manualItems = [
  ["login", "Đăng nhập/đăng xuất và redirect hoạt động ổn định"],
  ["switch", "Đổi Project và dữ liệu tất cả màn hình đổi theo project"],
  ["master", "MASTER nhìn thấy mọi Project; user thường chỉ thấy Project được cấp qua project_members"],
  ["dashboard", "Dashboard KPI, drill-down và Needs Attention đúng dữ liệu"],
  ["contract", "PLHĐ tổng quan/chi tiết, search, expand và virtualized tree hoạt động"],
  ["department", "Phòng ban KPI, drawer và drill-down ISSUE hoạt động"],
  ["issue", "ISSUE create/edit/inline edit/history hoạt động"],
  ["productivity", "Bulk update, Saved Views, Columns và Export hoạt động"],
  ["resource", "Resource CRUD, Reveal/Copy, auto-hide và audit đúng quyền"],
  ["roles", "Admin/PM/Member/Viewer đúng quyền theo UAT"],
  ["responsive", "Desktop/laptop/tablet/mobile không vỡ layout hoặc mất thao tác chính"],
] as const;

type ManualId = (typeof manualItems)[number][0];

function statusMeta(status: ReadinessStatus) {
  if (status === "pass") return { Icon: CheckCircle2, cls: "text-emerald-200", box: "border-emerald-300/12 bg-emerald-300/[0.04]" };
  if (status === "warn") return { Icon: TriangleAlert, cls: "text-amber-200", box: "border-amber-300/12 bg-amber-300/[0.04]" };
  return { Icon: XCircle, cls: "text-rose-200", box: "border-rose-300/12 bg-rose-300/[0.04]" };
}

export function UatCenter() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const storageKey = `asc-working:uat:v091:${selectedProject.id}`;

  useEffect(() => {
    try { setManual(JSON.parse(localStorage.getItem(storageKey) ?? "{}")); } catch { setManual({}); }
  }, [storageKey]);

  async function runChecks() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/readiness?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body = (await response.json()) as ReadinessApiResponse;
      if (!response.ok || !body.ok) throw new Error(body.ok ? "Không chạy được readiness check." : body.message);
      setData(body.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không chạy được readiness check.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void runChecks(); }, [selectedProject.id]);

  function toggleManual(id: ManualId) {
    setManual((current) => {
      const next = { ...current, [id]: !current[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  const manualDone = useMemo(() => manualItems.filter(([id]) => manual[id]).length, [manual]);
  const manualPct = Math.round((manualDone / manualItems.length) * 100);

  async function copyReport() {
    const lines = [
      `ASC WORKING V1.9.2 - UAT Report`,
      `Project: ${selectedProject.code} - ${selectedProject.name}`,
      `Generated: ${new Date().toLocaleString("vi-VN")}`,
      `Automated readiness: ${data?.overall ?? "unknown"}`,
      ...(data?.checks ?? []).map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.message}`),
      `Manual UAT: ${manualDone}/${manualItems.length}`,
      ...manualItems.map(([id, label]) => `- [${manual[id] ? "x" : " "}] ${label}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  const overallLabel = data?.overall === "ready" ? "READY" : data?.overall === "attention" ? "ATTENTION" : data?.overall === "blocked" ? "BLOCKED" : "CHECKING";
  const overallClass = data?.overall === "ready" ? "text-emerald-200 border-emerald-300/15 bg-emerald-300/[0.05]" : data?.overall === "attention" ? "text-amber-200 border-amber-300/15 bg-amber-300/[0.05]" : "text-rose-200 border-rose-300/15 bg-rose-300/[0.05]";

  return (
    <div className="space-y-4">
      <section className="tech-panel rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65"><ShieldCheck className="size-4" /> Production Readiness</div>
            <h2 className="mt-2 text-lg font-semibold text-white">{selectedProject.code} • Automated checks</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Kiểm tra session, RLS, schema, RPC, Remote Security environment và chất lượng dữ liệu nhanh.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-xl border px-3 py-2 text-[10px] font-bold tracking-[0.16em] ${overallClass}`}>{overallLabel}</span>
            <button onClick={() => void runChecks()} disabled={loading} className="secure-btn"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Chạy lại</button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-4 text-xs text-rose-100">{error}</div> : null}
      {loading && !data ? <div className="tech-panel grid min-h-56 place-items-center rounded-2xl"><div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300" /><div className="mt-3 text-xs text-slate-500">Đang chạy readiness checks...</div></div></div> : null}

      {data ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {data.checks.map((item) => {
            const meta = statusMeta(item.status); const Icon = meta.Icon;
            return <div key={item.id} className={`rounded-2xl border p-4 ${meta.box}`}><div className="flex items-start gap-3"><Icon className={`mt-0.5 size-4 shrink-0 ${meta.cls}`} /><div><div className="text-xs font-semibold text-slate-200">{item.label}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">{item.message}</div>{typeof item.durationMs === "number" ? <div className="mt-1 font-mono text-[9px] text-slate-700">{item.durationMs} ms</div> : null}</div></div></div>;
          })}
        </div>
      ) : null}

      <section className="tech-panel rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/65"><ClipboardCheck className="size-4" /> Manual UAT</div><div className="mt-2 text-sm font-semibold text-slate-200">{manualDone}/{manualItems.length} testcase đã xác nhận</div></div>
          <button onClick={() => void copyReport()} className="secure-btn"><Copy className="size-3.5" /> {copied ? "Đã copy report" : "Copy UAT report"}</button>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-violet-400/70 transition-[width]" style={{ width: `${manualPct}%` }} /></div>
        <div className="mt-4 space-y-2">
          {manualItems.map(([id, label]) => {
            const done = Boolean(manual[id]);
            return <button type="button" key={id} onClick={() => toggleManual(id)} className="flex w-full items-start gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3 text-left transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025]">{done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /> : <Circle className="mt-0.5 size-4 shrink-0 text-slate-700" />}<span className={done ? "text-xs leading-5 text-slate-300" : "text-xs leading-5 text-slate-500"}>{label}</span></button>;
          })}
        </div>
      </section>
    </div>
  );
}
