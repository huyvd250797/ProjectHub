"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  FileWarning,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import type {
  DataIntegrityApiResponse,
  DataIntegrityDomain,
  DataIntegrityFinding,
  DataIntegrityReport,
  DataIntegritySeverity,
  DataIntegrityStatus,
} from "@/lib/data-integrity/types";

const DOMAIN_OPTIONS: Array<{ value: "all" | DataIntegrityDomain; label: string }> = [
  { value: "all", label: "Tất cả dữ liệu" },
  { value: "catalog", label: "Catalog / PLHĐ" },
  { value: "issue", label: "ISSUE" },
  { value: "plan", label: "Plan" },
  { value: "finance", label: "Finance" },
  { value: "workload", label: "Workload" },
];

const SEVERITY_LABELS: Record<DataIntegritySeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const DOMAIN_LABELS: Record<DataIntegrityDomain, string> = {
  catalog: "Catalog / PLHĐ",
  issue: "ISSUE",
  plan: "Plan",
  finance: "Finance",
  workload: "Workload",
};

function statusClass(status: DataIntegrityStatus) {
  if (status === "clean") return "border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-100";
  if (status === "blocked") return "border-rose-300/15 bg-rose-300/[0.045] text-rose-100";
  return "border-amber-300/15 bg-amber-300/[0.045] text-amber-100";
}

function severityClass(severity: DataIntegritySeverity) {
  if (severity === "critical") return "border-rose-300/20 bg-rose-300/[0.07] text-rose-100";
  if (severity === "high") return "border-amber-300/20 bg-amber-300/[0.07] text-amber-100";
  if (severity === "medium") return "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-100";
  return "border-white/[0.08] bg-white/[0.025] text-slate-300";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesQuery(finding: DataIntegrityFinding, query: string) {
  if (!query) return true;
  const haystack = normalizeText([
    finding.title,
    finding.detail,
    finding.entityLabel,
    finding.expectedSource,
    finding.fixHint,
  ].filter(Boolean).join(" "));
  return haystack.includes(normalizeText(query));
}

export function DataIntegrityDashboard() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<DataIntegrityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [domain, setDomain] = useState<"all" | DataIntegrityDomain>("all");
  const [query, setQuery] = useState("");

  async function loadDataIntegrity() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/data-integrity?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body = (await response.json()) as DataIntegrityApiResponse;
      if (!response.ok || !body.ok) throw new Error(body.ok ? "Không chạy được Data Integrity." : body.message);
      setData(body.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không chạy được Data Integrity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDataIntegrity();
  }, [selectedProject.id]);

  const filteredFindings = useMemo(() => {
    return (data?.findings ?? []).filter((finding) => {
      if (domain !== "all" && finding.domain !== domain) return false;
      return includesQuery(finding, query);
    });
  }, [data?.findings, domain, query]);

  const scoreClass = data?.status === "clean"
    ? "from-emerald-300/80 to-cyan-300/80"
    : data?.status === "blocked"
      ? "from-rose-300/80 to-amber-300/80"
      : "from-amber-300/80 to-cyan-300/80";

  return (
    <div className="space-y-4">
      <section className="tech-panel rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65">
              <DatabaseZap className="size-4" />
              Data Integrity Audit
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">{selectedProject.code} • Source-of-truth health</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
              Kiểm tra dữ liệu danh mục và màn nghiệp vụ có cùng tham chiếu không: Module/Phòng ban/Người phụ trách/Stage/Finance/Workload.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data ? (
              <span className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${statusClass(data.status)}`}>
                {data.status === "clean" ? "Clean" : data.status === "blocked" ? "Blocked" : "Attention"}
              </span>
            ) : null}
            <button type="button" onClick={() => void loadDataIntegrity()} disabled={loading} className="secure-btn">
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Chạy lại
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.055] p-4 text-xs text-rose-100">{error}</div>
      ) : null}

      {loading && !data ? (
        <div className="tech-panel grid min-h-64 place-items-center rounded-2xl">
          <div className="text-center">
            <LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300" />
            <div className="mt-3 text-xs text-slate-500">Đang rà luồng dữ liệu...</div>
          </div>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_2fr]">
            <section className="tech-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Integrity Score</div>
                  <div className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-white">{data.score}</div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{data.summary}</p>
                </div>
                {data.status === "clean" ? <CheckCircle2 className="size-6 text-emerald-300/75" /> : <AlertTriangle className="size-6 text-amber-300/75" />}
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className={`h-full rounded-full bg-gradient-to-r ${scoreClass}`} style={{ width: `${data.score}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-lg font-semibold text-white">{data.metrics.findings}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">Findings</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-lg font-semibold text-rose-100">{data.metrics.critical}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">Critical</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-lg font-semibold text-amber-100">{data.metrics.high}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">High</div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {[
                ["ISSUE", data.metrics.issues],
                ["Module", data.metrics.modules],
                ["Phòng ban", data.metrics.departments],
                ["Nhân sự", data.metrics.people],
                ["Stage", data.metrics.stages],
                ["Milestone", data.metrics.milestones],
                ["Task", data.metrics.tasks],
                ["Finance", data.metrics.financialMonths],
              ].map(([label, value]) => (
                <div key={String(label)} className="tech-panel rounded-2xl p-4">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">{label}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{String(value)}</div>
                </div>
              ))}
            </section>
          </div>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.domains.map((item) => (
              <button
                type="button"
                key={item.domain}
                onClick={() => setDomain(item.domain)}
                className={`rounded-2xl border p-4 text-left transition hover:border-cyan-300/20 ${domain === item.domain ? "border-cyan-300/25 bg-cyan-300/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-200">{item.label}</div>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase ${statusClass(item.status)}`}>{item.status}</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {item.findingCount} finding • {item.criticalCount} critical • {item.highCount} high
                </div>
              </button>
            ))}
          </section>

          <section className="tech-panel rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/65">
                  <ShieldCheck className="size-4" />
                  Findings
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{filteredFindings.length} dòng cần rà</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm lỗi dữ liệu..."
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/10 pl-10 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/25 sm:w-72"
                  />
                </div>
                <select
                  value={domain}
                  onChange={(event) => setDomain(event.target.value as "all" | DataIntegrityDomain)}
                  className="h-11 rounded-xl border border-white/[0.08] bg-[#102037] px-3 text-sm font-medium text-slate-200 outline-none focus:border-cyan-300/25"
                >
                  {DOMAIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="grid min-h-52 place-items-center p-6 text-center">
                <div>
                  <CheckCircle2 className="mx-auto size-8 text-emerald-300/70" />
                  <div className="mt-3 text-sm font-semibold text-slate-200">Không có lỗi trong phạm vi lọc</div>
                  <div className="mt-1 text-xs text-slate-600">Dữ liệu nhóm này đang khớp với source-of-truth hiện tại.</div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.055]">
                {filteredFindings.map((item) => (
                  <div key={item.id} className="grid gap-4 p-4 lg:grid-cols-[140px_1fr_220px_110px] lg:items-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${severityClass(item.severity)}`}>
                        {SEVERITY_LABELS[item.severity]}
                      </span>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-400">
                        {DOMAIN_LABELS[item.domain]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-start gap-2">
                        <FileWarning className="mt-0.5 size-4 shrink-0 text-amber-200/70" />
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</div>
                          <div className="mt-2 text-[11px] text-slate-600">
                            Entity: <span className="text-slate-400">{item.entityLabel ?? item.entityType}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Cần khớp với</div>
                      <div className="mt-1 text-xs font-medium text-slate-300">{item.expectedSource}</div>
                      <div className="mt-2 text-[11px] leading-5 text-slate-500">{item.fixHint}</div>
                    </div>
                    <Link href={item.href} className="secure-btn justify-center">
                      Mở màn sửa
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
