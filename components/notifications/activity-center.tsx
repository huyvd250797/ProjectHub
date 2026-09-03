"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  ListTodo,
  LoaderCircle,
  Map,
  RadioTower,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/project-context";
import { PageHeader } from "@/components/page-header";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/demo";
import type { ActivityApiResponse, ActivityData, ActivityEvent, NotificationPreferences, NotificationPreferencesResponse } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function relativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function eventMeta(item: ActivityEvent) {
  if (item.entityType === "issue") return { Icon: ListTodo, tone: "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200", label: "ISSUE" };
  if (item.entityType === "resource") return { Icon: RadioTower, tone: "border-rose-300/15 bg-rose-300/[0.055] text-rose-200", label: "RESOURCE" };
  if (item.entityType === "import") return { Icon: FileSpreadsheet, tone: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-200", label: "IMPORT" };
  if (item.entityType === "project_member") return { Icon: UserRoundPlus, tone: "border-violet-300/15 bg-violet-300/[0.055] text-violet-200", label: "PROJECT" };
  if (item.entityType === "plan" || item.entityType === "stage" || item.entityType === "milestone") return { Icon: Map, tone: "border-amber-300/15 bg-amber-300/[0.055] text-amber-200", label: "PLAN" };
  return { Icon: Activity, tone: "border-white/[0.08] bg-white/[0.03] text-slate-300", label: "ACTIVITY" };
}

const filters = [
  { value: "", label: "Tất cả" },
  { value: "issue", label: "ISSUE" },
  { value: "project", label: "Project" },
  { value: "import", label: "Import" },
  { value: "resource", label: "Resource" },
  { value: "plan", label: "Kế hoạch" },
];

const preferenceRows: Array<{ key: keyof NotificationPreferences; title: string; description: string; icon: typeof Bell }> = [
  { key: "issueAssignment", title: "ISSUE được giao", description: "Thông báo khi một ISSUE mới được giao cho bạn hoặc đổi người phụ trách sang bạn.", icon: UserRoundPlus },
  { key: "issueUpdates", title: "Cập nhật ISSUE", description: "Trạng thái, bàn giao, Due Date, ưu tiên hoặc phản hồi thay đổi trên ISSUE bạn phụ trách.", icon: ListTodo },
  { key: "dueReminders", title: "Nhắc Due Date", description: "ISSUE bạn phụ trách đến hạn trong 3 ngày, đến hạn hôm nay hoặc đã quá hạn.", icon: Clock3 },
  { key: "projectMembership", title: "Thành viên Project", description: "Bạn được thêm vào Project hoặc role Project thay đổi.", icon: UserRoundPlus },
  { key: "importUpdates", title: "Excel Import", description: "Thông tin các đợt Apply Import trong Project.", icon: FileSpreadsheet },
  { key: "securityEvents", title: "Security / Resource", description: "Dành cho các sự kiện bảo mật và Resource Vault trong các bản mở rộng tiếp theo.", icon: ShieldCheck },
];

export function ActivityCenter() {
  const { selectedProject } = useProject();
  const [mode, setMode] = useState<"activity" | "preferences">("activity");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [preferenceLoading, setPreferenceLoading] = useState(false);
  const [preferenceSaving, setPreferenceSaving] = useState<keyof NotificationPreferences | null>(null);
  const [notice, setNotice] = useState("");

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ projectId: selectedProject.id, page: String(page), pageSize: "30" });
      if (group) params.set("group", group);
      const response = await fetch(`/api/activity?${params}`, { cache: "no-store" });
      const body = (await response.json()) as ActivityApiResponse;
      if (!body.ok) throw new Error(body.message);
      setData(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được Activity Center.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject.id, page, group]);

  const loadPreferences = useCallback(async () => {
    setPreferenceLoading(true);
    try {
      const response = await fetch(`/api/notifications/preferences?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body = (await response.json()) as NotificationPreferencesResponse;
      if (!body.ok) throw new Error(body.message);
      setPreferences(body.preferences);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được cài đặt thông báo.");
    } finally {
      setPreferenceLoading(false);
    }
  }, [selectedProject.id]);

  useEffect(() => {
    setPage(1);
    setGroup("");
    setData(null);
  }, [selectedProject.id]);

  useEffect(() => { if (mode === "activity") void loadActivity(); }, [mode, loadActivity]);
  useEffect(() => { if (mode === "preferences") void loadPreferences(); }, [mode, loadPreferences]);

  const summary = useMemo(() => {
    const items = data?.items ?? [];
    return {
      issue: items.filter((item) => item.entityType === "issue").length,
      project: items.filter((item) => item.entityType === "project_member" || item.entityType === "project").length,
      resource: items.filter((item) => item.entityType === "resource").length,
      import: items.filter((item) => item.entityType === "import").length,
      plan: items.filter((item) => item.entityType === "plan" || item.entityType === "stage" || item.entityType === "milestone").length,
    };
  }, [data?.items]);

  async function togglePreference(key: keyof NotificationPreferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setPreferenceSaving(key);
    setNotice("");
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, preferences: next }),
      });
      const body = (await response.json()) as NotificationPreferencesResponse;
      if (!body.ok) throw new Error(body.message);
      setPreferences(body.preferences);
      setNotice("Đã lưu cài đặt thông báo.");
    } catch (saveError) {
      setPreferences(preferences);
      setError(saveError instanceof Error ? saveError.message : "Không lưu được cài đặt.");
    } finally {
      setPreferenceSaving(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Project Operations"
        title="Notifications & Activity Center"
        description={`Theo dõi thay đổi quan trọng của ${selectedProject.code}, xem ai đã thao tác gì và cấu hình những thông báo bạn muốn nhận.`}
        actions={
          <div className="inline-flex rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">
            <button type="button" onClick={() => setMode("activity")} className={cn("flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] transition", mode === "activity" ? "bg-cyan-300/[0.09] text-cyan-100" : "text-slate-500 hover:text-slate-300")}><Activity className="size-3.5" /> Hoạt động</button>
            <button type="button" onClick={() => setMode("preferences")} className={cn("flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] transition", mode === "preferences" ? "bg-cyan-300/[0.09] text-cyan-100" : "text-slate-500 hover:text-slate-300")}><Settings2 className="size-3.5" /> Cài đặt</button>
          </div>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-3 text-xs text-emerald-200">{notice}</div> : null}

      {mode === "activity" ? (
        <>
          <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["ISSUE", summary.issue, ListTodo, "text-cyan-200"],
              ["Project", summary.project, UserRoundPlus, "text-violet-200"],
              ["Import", summary.import, FileSpreadsheet, "text-emerald-200"],
              ["Resource", summary.resource, RadioTower, "text-rose-200"],
              ["Kế hoạch", summary.plan, Map, "text-amber-200"],
            ].map(([label, value, Icon, tone]) => {
              const C = Icon as typeof Activity;
              return <div key={String(label)} className="tech-panel rounded-2xl p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{String(label)}</div><div className="mt-2 text-2xl font-semibold text-white">{String(value)}</div><div className="mt-1 text-[9px] text-slate-600">trong trang hiện tại</div></div><C className={cn("size-5", String(tone))} /></div></div>;
            })}
          </section>

          <div className="tech-panel overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2 overflow-x-auto">
                {filters.map((filter) => <button key={filter.value || "all"} type="button" onClick={() => { setGroup(filter.value); setPage(1); }} className={cn("shrink-0 rounded-lg border px-3 py-2 text-[10px] transition", group === filter.value ? "border-cyan-300/16 bg-cyan-300/[0.07] text-cyan-100" : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300")}>{filter.label}</button>)}
              </div>
              <button type="button" onClick={() => void loadActivity()} className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-slate-500 hover:text-slate-200"><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Làm mới</button>
            </div>

            {loading ? <div className="grid min-h-72 place-items-center text-slate-500"><LoaderCircle className="size-6 animate-spin" /></div> : data?.items.length ? (
              <div>
                {data.items.map((item) => {
                  const { Icon, tone, label } = eventMeta(item);
                  const content = (
                    <div className="flex gap-4 px-4 py-4 md:px-5">
                      <div className={cn("mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border", tone)}><Icon className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate-200">{item.title}</span>
                          <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</span>
                        </div>
                        {item.summary ? <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{item.summary}</div> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-600"><span>{item.actorName || item.actorEmail || "System"}</span><span>•</span><span>{relativeTime(item.createdAt)}</span></div>
                      </div>
                    </div>
                  );
                  return item.href ? <Link key={item.id} href={item.href} className="block border-b border-white/[0.045] transition hover:bg-white/[0.025]">{content}</Link> : <div key={item.id} className="border-b border-white/[0.045]">{content}</div>;
                })}
              </div>
            ) : <div className="grid min-h-72 place-items-center px-6 text-center"><div><Activity className="mx-auto size-6 text-slate-600" /><div className="mt-3 text-sm font-medium text-slate-300">Chưa có hoạt động</div><div className="mt-1 text-xs text-slate-600">Các thay đổi ISSUE, Project, Import và Resource sẽ xuất hiện ở đây.</div></div></div>}

            {data && data.totalPages > 1 ? <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3"><div className="text-[10px] text-slate-600">Trang {data.page}/{data.totalPages} • {data.total.toLocaleString("vi-VN")} hoạt động</div><div className="flex gap-1.5"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 disabled:opacity-30"><ChevronLeft className="size-3.5" /></button><button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 disabled:opacity-30"><ChevronRight className="size-3.5" /></button></div></div> : null}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
          <div className="tech-panel overflow-hidden rounded-2xl">
            <div className="border-b border-white/[0.07] px-5 py-4"><div className="text-sm font-semibold text-slate-200">Cài đặt thông báo</div><div className="mt-1 text-[10px] text-slate-600">Áp dụng riêng cho Project {selectedProject.code}.</div></div>
            {preferenceLoading ? <div className="grid min-h-56 place-items-center"><LoaderCircle className="size-5 animate-spin text-slate-500" /></div> : preferenceRows.map((row) => {
              const Icon = row.icon;
              const enabled = preferences[row.key];
              return <div key={row.key} className="flex items-center gap-4 border-b border-white/[0.045] px-5 py-4"><div className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025]"><Icon className="size-4 text-cyan-300/70" /></div><div className="min-w-0 flex-1"><div className="text-xs font-medium text-slate-300">{row.title}</div><div className="mt-1 text-[10px] leading-4 text-slate-600">{row.description}</div></div><button type="button" disabled={Boolean(preferenceSaving)} onClick={() => void togglePreference(row.key)} className={cn("relative h-6 w-11 shrink-0 rounded-full border transition", enabled ? "border-cyan-300/20 bg-cyan-300/20" : "border-white/[0.08] bg-white/[0.035]", preferenceSaving === row.key && "opacity-50")} aria-pressed={enabled}><span className={cn("absolute top-0.5 size-4.5 rounded-full transition", enabled ? "left-[22px] bg-cyan-200" : "left-0.5 bg-slate-500")} /></button></div>;
            })}
          </div>

          <aside className="space-y-4">
            <div className="tech-panel rounded-2xl p-5"><Bell className="size-5 text-cyan-300/70" /><div className="mt-4 text-sm font-semibold text-slate-200">Bell Center</div><div className="mt-2 text-xs leading-5 text-slate-600">Icon chuông trên Topbar hiển thị thông báo của Project đang chọn, cập nhật định kỳ mỗi 60 giây và hỗ trợ đánh dấu đã đọc.</div></div>
            <div className="tech-panel rounded-2xl p-5"><CircleAlert className="size-5 text-amber-300/70" /><div className="mt-4 text-sm font-semibold text-slate-200">Due Reminder</div><div className="mt-2 text-xs leading-5 text-slate-600">Nhắc hạn được tạo khi bạn mở ASC WORKING. ISSUE được giao cho bạn sẽ được cảnh báo khi còn tối đa 3 ngày hoặc đã quá hạn.</div></div>
          </aside>
        </div>
      )}
    </>
  );
}
