"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleGauge,
  Clock3,
  FilterX,
  Layers3,
  LoaderCircle,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  DepartmentRow,
  DepartmentsApiResponse,
  DepartmentsData,
} from "@/lib/departments/types";
import { cn } from "@/lib/utils";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

function issueHref(
  department: DepartmentRow,
  extra: Record<string, string | number | boolean | null | undefined> = {},
) {
  const params = new URLSearchParams();
  if (department.isUnassigned) params.set("missingDepartment", "1");
  else params.set("departmentId", department.id);

  Object.entries(extra).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false || value === "") return;
    params.set(key, value === true ? "1" : String(value));
  });
  return `/issues?${params.toString()}`;
}

function moduleStatusLabel(code: string | null) {
  const labels: Record<string, string> = {
    surveyed: "Đã khảo sát",
    ready_training: "Sẵn sàng tập huấn",
    trained: "Đã tập huấn",
    ready_acceptance: "Sẵn sàng nghiệm thu",
    accepted: "Đã nghiệm thu",
  };
  return code ? labels[code] ?? code : "Chưa cập nhật";
}

function statusLabel(code: string | null) {
  const labels: Record<string, string> = {
    waiting_customer: "Chờ khách hàng",
    no_action: "Không xử lý",
    waiting: "Chờ xử lý",
    processing: "Đang xử lý",
    resolved: "Đã xử lý",
    released: "Đã Release",
    not_feasible: "Không khả thi",
  };
  return code ? labels[code] ?? code : "Chưa trạng thái";
}

function progressTone(progress: number) {
  if (progress >= 85) return "bg-emerald-300/75";
  if (progress >= 60) return "bg-cyan-300/70";
  if (progress >= 35) return "bg-amber-300/75";
  return "bg-rose-300/70";
}

function DepartmentsLoading() {
  return (
    <div className="tech-panel grid min-h-[420px] place-items-center rounded-2xl">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300/70" />
        <div className="mt-4 text-xs font-medium text-slate-300">Đang tải Department Intelligence...</div>
        <div className="mt-1 text-[10px] text-slate-600">KPI • Stakeholder • Module • ISSUE attention</div>
      </div>
    </div>
  );
}

function DepartmentsError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="tech-panel rounded-2xl border-rose-300/10 p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300/15 bg-rose-300/[0.06]">
          <AlertTriangle className="size-4 text-rose-200" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-rose-100">Không tải được dữ liệu phòng ban</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{message}</div>
          <button
            type="button"
            onClick={retry}
            className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-300/20 hover:text-white"
          >
            <RefreshCw className="size-3.5" /> Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ data }: { data: DepartmentsData }) {
  const items = [
    ["Phòng ban", data.summary.departments, "Đơn vị đang hoạt động", Building2, "text-cyan-200"],
    ["Tổng ISSUE", data.summary.totalIssues, "Theo project hiện tại", CircleGauge, "text-violet-200"],
    ["Chưa xác định", data.summary.unassignedIssues, "Cần mapping phòng ban", CircleAlert, "text-amber-200"],
    ["Đã bàn giao", data.summary.handedOver, "ISSUE phía khách hàng", CheckCircle2, "text-emerald-200"],
    ["Quá hạn", data.summary.overdue, "Cần ưu tiên xử lý", Clock3, "text-rose-200"],
    ["Đầu mối", data.summary.contacts, "Nhân sự phía đơn vị", UsersRound, "text-slate-200"],
  ] as const;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value, note, Icon, tone]) => (
        <div key={label} className="tech-panel tech-panel-hover rounded-xl px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</div>
              <div className={cn("mt-2 text-2xl font-semibold tracking-[-0.04em]", tone)}>{formatNumber(value)}</div>
            </div>
            <Icon className="size-4 text-slate-700" />
          </div>
          <div className="mt-2 truncate text-[9px] text-slate-700">{note}</div>
        </div>
      ))}
    </div>
  );
}

function MetricLink({
  value,
  label,
  href,
  tone = "text-slate-400",
}: {
  value: number;
  label: string;
  href: string;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex min-w-[64px] flex-col rounded-lg px-2 py-1.5 transition hover:bg-white/[0.035]"
      onClick={(event) => event.stopPropagation()}
    >
      <span className={cn("text-xs font-semibold", tone)}>{formatNumber(value)}</span>
      <span className="mt-0.5 text-[8px] uppercase tracking-[0.1em] text-slate-700 group-hover:text-slate-500">{label}</span>
    </Link>
  );
}

function DepartmentDrawer({
  department,
  onClose,
}: {
  department: DepartmentRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Đóng chi tiết phòng ban"
        onClick={onClose}
        className="absolute inset-0 bg-[#020711]/70 backdrop-blur-sm"
      />
      <aside className="scrollbar-thin absolute inset-y-0 right-0 w-full max-w-[620px] overflow-y-auto border-l border-cyan-300/10 bg-[#07111f]/[0.99] shadow-[-24px_0_80px_rgba(0,0,0,0.42)]">
        <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07111f]/95 px-5 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-start gap-3">
            <div className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl border",
              department.isUnassigned
                ? "border-amber-300/15 bg-amber-300/[0.06]"
                : "border-cyan-300/12 bg-cyan-300/[0.05]",
            )}>
              {department.isUnassigned ? (
                <CircleAlert className="size-4.5 text-amber-200/80" />
              ) : (
                <Building2 className="size-4.5 text-cyan-300/70" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {department.isUnassigned ? "Data Quality Bucket" : department.code || "Department"}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-white">{department.name}</h2>
              <div className="mt-1 text-xs text-slate-600">
                {department.total} ISSUE • {department.modules.length} Module • {department.contacts.length} đầu mối
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5 md:p-6">
          {department.isUnassigned ? (
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-200/70" />
                <div>
                  <div className="text-xs font-semibold text-amber-100">Không bỏ sót ISSUE chưa mapping</div>
                  <p className="mt-1 text-[11px] leading-5 text-amber-100/45">
                    Bucket này không phải phòng ban thật. Nó gom toàn bộ ISSUE chưa có department_id để tổng Dashboard và Phòng ban luôn khớp nhau.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Tổng ISSUE", department.total, issueHref(department), "text-white"],
              ["Đã xử lý", department.resolved, issueHref(department, { status: "resolved" }), "text-cyan-100"],
              ["Đã Release", department.released, issueHref(department, { status: "released" }), "text-violet-100"],
              ["Quá hạn", department.overdue, issueHref(department, { overdue: true }), "text-rose-100"],
            ].map(([label, value, href, tone]) => (
              <Link key={String(label)} href={String(href)} className="tech-panel tech-panel-hover rounded-xl p-3">
                <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-700">{String(label)}</div>
                <div className={cn("mt-2 text-xl font-semibold", String(tone))}>{formatNumber(Number(value))}</div>
              </Link>
            ))}
          </section>

          <section className="tech-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Handover Progress</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">Tình trạng bàn giao</div>
              </div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-emerald-100">{department.handoverProgress}%</div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div className={cn("h-full rounded-full", progressTone(department.handoverProgress))} style={{ width: `${Math.min(100, department.handoverProgress)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
              <Link href={issueHref(department, { customerStatus: "handed_over" })} className="hover:text-emerald-200">
                Đã bàn giao {department.handedOver}
              </Link>
              <Link href={issueHref(department, { customerStatus: "not_handed_over" })} className="hover:text-amber-200">
                Còn lại {department.notHandedOver}
              </Link>
            </div>
          </section>

          <section className="tech-panel rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Stakeholder</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">Đầu mối phòng ban</div>
              </div>
              <UsersRound className="size-4 text-cyan-300/55" />
            </div>
            {department.contacts.length ? (
              <div className="space-y-2">
                {department.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04]">
                      <UserRound className="size-4 text-cyan-300/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-300">{contact.fullName}</div>
                      <div className="mt-1 text-[10px] text-slate-600">{contact.title || "Chưa có chức danh"}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {contact.email ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[9px] text-slate-500">
                            <Mail className="size-3" /> {contact.email}
                          </span>
                        ) : null}
                        {contact.zalo ? (
                          <span className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[9px] text-slate-500">Zalo: {contact.zalo}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-xs text-slate-600">
                Chưa có đầu mối được gán cho phòng ban này.
              </div>
            )}
          </section>

          <section className="tech-panel rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Contract Ownership</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">Module phụ trách</div>
              </div>
              <Layers3 className="size-4 text-violet-300/55" />
            </div>
            {department.modules.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {department.modules.map((module) => (
                  <Link
                    key={module.id}
                    href={`/contract?moduleId=${encodeURIComponent(module.id)}`}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.018] p-3 transition hover:border-violet-300/15 hover:bg-violet-300/[0.035]"
                  >
                    <div className="font-mono text-[9px] text-violet-300/50">{module.code || "MODULE"}</div>
                    <div className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-300">{module.name}</div>
                    <div className="mt-2 text-[9px] text-slate-600">{moduleStatusLabel(module.statusCode)}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-xs text-slate-600">
                Chưa có Module PLHĐ gán cho phòng ban này.
              </div>
            )}
          </section>

          <section className="tech-panel rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-300/55">Needs Attention</div>
                <div className="mt-1 text-sm font-semibold text-slate-200">ISSUE cần chú ý</div>
              </div>
              <CalendarClock className="size-4 text-rose-300/55" />
            </div>
            {department.attentionIssues.length ? (
              <div className="space-y-2">
                {department.attentionIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/issues?issueId=${encodeURIComponent(issue.id)}`}
                    className="block rounded-xl border border-white/[0.05] bg-white/[0.018] p-3 transition hover:border-rose-300/12 hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        issue.isOverdue ? "bg-rose-300" : issue.isNearDue ? "bg-amber-300" : "bg-slate-600",
                      )} />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-xs font-medium leading-5 text-slate-300">{issue.content}</div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-600">
                          <span>{statusLabel(issue.statusCode)}</span>
                          {issue.moduleName ? <span>• {issue.moduleName}</span> : null}
                          <span>• {issue.assigneeName || "Chưa phụ trách"}</span>
                          {issue.dueDate ? <span>• Due {new Date(issue.dueDate).toLocaleDateString("vi-VN")}</span> : null}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 size-3.5 shrink-0 text-slate-700" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-xs text-slate-600">
                Không có ISSUE quá hạn/gần hạn hoặc thiếu người phụ trách trong nhóm ưu tiên hiện tại.
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export function DepartmentIntelligence({ initialDepartmentId = "" }: { initialDepartmentId?: string }) {
  const { selectedProject } = useProject();
  const router = useRouter();

  const [data, setData] = useState<DepartmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [focus, setFocus] = useState("all");
  const [sort, setSort] = useState("total_desc");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDepartmentId);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/departments?projectId=${encodeURIComponent(selectedProject.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as DepartmentsApiResponse;
        if (!body.ok) throw new Error(body.message);
        return body.data;
      })
      .then((nextData) => {
        setData(nextData);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu phòng ban.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedProject.id, reloadKey]);

  useEffect(() => {
    setSelectedDepartmentId(initialDepartmentId);
  }, [initialDepartmentId]);

  useEffect(() => {
    if (!data || !selectedDepartmentId) return;
    if (!data.departments.some((row) => row.id === selectedDepartmentId)) {
      setSelectedDepartmentId("");
    }
  }, [data, selectedDepartmentId]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const search = normalize(deferredQuery);
    const rows = data.departments.filter((row) => {
      if (search && !normalize(`${row.code ?? ""} ${row.name}`).includes(search)) return false;
      if (focus === "attention" && row.overdue + row.nearDue + row.missingAssignee === 0) return false;
      if (focus === "overdue" && row.overdue === 0) return false;
      if (focus === "unassigned" && !row.isUnassigned) return false;
      if (focus === "no_contact" && (row.isUnassigned || row.contacts.length > 0)) return false;
      if (focus === "remaining" && row.notHandedOver === 0) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      if (sort === "progress_asc") return a.handoverProgress - b.handoverProgress || b.total - a.total;
      if (sort === "remaining_desc") return b.notHandedOver - a.notHandedOver || b.total - a.total;
      if (sort === "overdue_desc") return b.overdue - a.overdue || b.total - a.total;
      return b.total - a.total || a.name.localeCompare(b.name, "vi");
    });
  }, [data, deferredQuery, focus, sort]);

  const selectedDepartment = data?.departments.find((row) => row.id === selectedDepartmentId) ?? null;

  function openDepartment(row: DepartmentRow) {
    setSelectedDepartmentId(row.id);
    if (row.isUnassigned) router.replace("/departments?missingDepartment=1", { scroll: false });
    else router.replace(`/departments?departmentId=${encodeURIComponent(row.id)}`, { scroll: false });
  }

  function closeDrawer() {
    setSelectedDepartmentId("");
    router.replace("/departments", { scroll: false });
  }

  if (loading) return <DepartmentsLoading />;
  if (error) return <DepartmentsError message={error} retry={() => setReloadKey((value) => value + 1)} />;
  if (!data) return null;

  const emptyDatabase = data.source === "database" && data.summary.totalIssues === 0 && data.summary.departments === 0;

  return (
    <>
      <SummaryCards data={data} />

      {emptyDatabase ? (
        <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-200/70" />
            <div>
              <div className="text-xs font-semibold text-amber-100">Project chưa có dữ liệu Phòng ban/ISSUE</div>
              <div className="mt-1 text-[10px] leading-5 text-amber-100/45">
                V0.9.3 đang đọc Supabase thật và không lấy số mock để che dữ liệu trống. Hãy nạp departments, people, contract_items và issues cho project đang chọn.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {data.summary.unassignedIssues > 0 ? (
        <button
          type="button"
          onClick={() => {
            const bucket = data.departments.find((row) => row.isUnassigned);
            if (bucket) openDepartment(bucket);
          }}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-4 text-left transition hover:bg-amber-300/[0.065]"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06]">
            <CircleAlert className="size-4 text-amber-200/80" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-amber-100">{formatNumber(data.summary.unassignedIssues)} ISSUE chưa xác định phòng ban</div>
            <div className="mt-1 text-[10px] text-amber-100/40">Bucket riêng để tổng số liệu không bị lệch. Click để rà soát ISSUE cần mapping.</div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-amber-200/45" />
        </button>
      ) : null}

      <div className="tech-panel overflow-visible rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã hoặc tên phòng ban..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[500px]">
            <ThemedSelect
              value={focus}
              onChange={setFocus}
              ariaLabel="Lọc phòng ban"
              options={[
                { value: "all", label: "Tất cả phòng ban", description: "Bao gồm bucket chưa xác định" },
                { value: "attention", label: "Cần chú ý", description: "Quá hạn / gần hạn / thiếu phụ trách" },
                { value: "overdue", label: "Có ISSUE quá hạn" },
                { value: "remaining", label: "Còn chưa bàn giao" },
                { value: "no_contact", label: "Chưa có đầu mối" },
                { value: "unassigned", label: "Chưa xác định phòng ban" },
              ]}
            />
            <ThemedSelect
              value={sort}
              onChange={setSort}
              ariaLabel="Sắp xếp phòng ban"
              options={[
                { value: "total_desc", label: "Nhiều ISSUE nhất" },
                { value: "remaining_desc", label: "Còn lại nhiều nhất" },
                { value: "overdue_desc", label: "Quá hạn nhiều nhất" },
                { value: "progress_asc", label: "% bàn giao thấp nhất" },
                { value: "name", label: "Tên phòng ban A–Z" },
              ]}
            />
          </div>
          {(query || focus !== "all" || sort !== "total_desc") ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFocus("all");
                setSort("total_desc");
              }}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-500 transition hover:text-slate-200"
            >
              <FilterX className="size-3.5" /> Reset
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead className="bg-white/[0.025] text-[9px] uppercase tracking-[0.13em] text-slate-600">
              <tr>
                {[
                  "Phòng ban",
                  "ISSUE",
                  "Đã xử lý",
                  "Đã Release",
                  "Đã bàn giao",
                  "Còn lại",
                  "Quá hạn",
                  "% bàn giao",
                  "Stakeholder / Module",
                  "",
                ].map((head) => (
                  <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openDepartment(row)}
                  className={cn(
                    "cursor-pointer border-b border-white/[0.04] text-xs transition hover:bg-white/[0.022]",
                    row.isUnassigned && "bg-amber-300/[0.018] hover:bg-amber-300/[0.035]",
                  )}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl border",
                        row.isUnassigned
                          ? "border-amber-300/15 bg-amber-300/[0.055]"
                          : "border-cyan-300/10 bg-cyan-300/[0.04]",
                      )}>
                        {row.isUnassigned ? <CircleAlert className="size-4 text-amber-200/75" /> : <Building2 className="size-4 text-cyan-300/60" />}
                      </div>
                      <div className="min-w-0">
                        <div className={cn("font-medium", row.isUnassigned ? "text-amber-100" : "text-slate-300")}>{row.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-700">
                          <span>{row.code || (row.isUnassigned ? "UNMAPPED" : "NO CODE")}</span>
                          {row.missingAssignee > 0 ? <span>• {row.missingAssignee} chưa phụ trách</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2"><MetricLink value={row.total} label="Tổng" href={issueHref(row)} tone="text-slate-200" /></td>
                  <td className="px-2 py-2"><MetricLink value={row.resolved} label="Resolved" href={issueHref(row, { status: "resolved" })} tone="text-cyan-200/80" /></td>
                  <td className="px-2 py-2"><MetricLink value={row.released} label="Release" href={issueHref(row, { status: "released" })} tone="text-violet-200/80" /></td>
                  <td className="px-2 py-2"><MetricLink value={row.handedOver} label="Bàn giao" href={issueHref(row, { customerStatus: "handed_over" })} tone="text-emerald-200/80" /></td>
                  <td className="px-2 py-2"><MetricLink value={row.notHandedOver} label="Còn lại" href={issueHref(row, { customerStatus: "not_handed_over" })} tone="text-amber-200/80" /></td>
                  <td className="px-2 py-2"><MetricLink value={row.overdue} label="Overdue" href={issueHref(row, { overdue: true })} tone={row.overdue ? "text-rose-200" : "text-slate-600"} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[120px] items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className={cn("h-full rounded-full", progressTone(row.handoverProgress))} style={{ width: `${Math.min(100, row.handoverProgress)}%` }} />
                      </div>
                      <span className="w-8 text-right text-[10px] font-medium text-slate-500">{row.handoverProgress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span className="inline-flex items-center gap-1"><UsersRound className="size-3" /> {row.contacts.length}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1"><Layers3 className="size-3" /> {row.modules.length}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button type="button" className="grid size-8 place-items-center rounded-lg text-slate-700 transition hover:bg-white/[0.04] hover:text-cyan-200">
                      <ChevronRight className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredRows.length ? (
            <div className="grid min-h-[250px] place-items-center p-6 text-center">
              <div>
                <Building2 className="mx-auto size-6 text-slate-700" />
                <div className="mt-3 text-xs font-medium text-slate-400">Không có phòng ban phù hợp bộ lọc</div>
                <div className="mt-1 text-[10px] text-slate-700">Thử xóa từ khóa hoặc reset bộ lọc.</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/[0.04] px-4 py-3 text-[9px] uppercase tracking-[0.12em] text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{filteredRows.length} / {data.departments.length} nhóm hiển thị • Source: {data.source === "database" ? "Supabase" : "Demo Mode"}</span>
          <span>ASC WORKING V0.9.3 • Department Intelligence</span>
        </div>
      </div>

      {selectedDepartment ? <DepartmentDrawer department={selectedDepartment} onClose={closeDrawer} /> : null}
    </>
  );
}
