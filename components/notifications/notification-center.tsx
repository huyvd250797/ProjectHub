"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  Clock3,
  FileCheck2,
  LoaderCircle,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProject } from "@/components/project-context";
import type { NotificationCategory, NotificationInboxResponse, NotificationItem, NotificationMutationResponse } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function relativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function categoryMeta(category: NotificationCategory) {
  if (category === "issue_assignment") return { Icon: UserPlus, tone: "text-cyan-200 bg-cyan-300/[0.07] border-cyan-300/15" };
  if (category === "due_reminder") return { Icon: Clock3, tone: "text-amber-200 bg-amber-300/[0.07] border-amber-300/15" };
  if (category === "project_membership") return { Icon: UserPlus, tone: "text-violet-200 bg-violet-300/[0.07] border-violet-300/15" };
  if (category === "import_update") return { Icon: FileCheck2, tone: "text-emerald-200 bg-emerald-300/[0.07] border-emerald-300/15" };
  if (category === "security_event") return { Icon: ShieldCheck, tone: "text-rose-200 bg-rose-300/[0.07] border-rose-300/15" };
  return { Icon: CircleAlert, tone: "text-slate-300 bg-white/[0.035] border-white/[0.07]" };
}

export function NotificationCenter() {
  const { selectedProject } = useProject();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/notifications?projectId=${encodeURIComponent(selectedProject.id)}&limit=12`, { cache: "no-store" });
      const body = (await response.json()) as NotificationInboxResponse;
      if (!body.ok) throw new Error(body.message);
      setItems(body.data.items);
      setUnreadCount(body.data.unreadCount);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được thông báo.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedProject.id]);

  useEffect(() => {
    setOpen(false);
    setItems([]);
    setUnreadCount(0);
    void load(true);
  }, [selectedProject.id, load]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    const timer = window.setInterval(refresh, 90000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function markRead(notificationId: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: selectedProject.id, action: "mark_read", notificationId }),
    });
    const body = (await response.json()) as NotificationMutationResponse;
    if (body.ok) {
      setItems((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
      if (typeof body.unreadCount === "number") setUnreadCount(body.unreadCount);
    }
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: selectedProject.id, action: "mark_all_read" }),
    });
    const body = (await response.json()) as NotificationMutationResponse;
    if (body.ok) {
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnreadCount(body.unreadCount ?? 0);
    }
  }

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) await markRead(item.id);
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        className={cn(
          "relative grid size-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-500 transition hover:border-cyan-300/15 hover:text-slate-200",
          open && "border-cyan-300/18 bg-cyan-300/[0.055] text-cyan-200",
        )}
        aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
        aria-expanded={open}
      >
        {unreadCount ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-[var(--bg)] bg-cyan-300 px-1 text-[9px] font-bold leading-none text-[#07111f]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[80] mt-2 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1727]/98 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl">
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
            <div>
              <div className="text-xs font-semibold text-slate-100">Thông báo</div>
              <div className="mt-0.5 text-[10px] text-slate-500">{selectedProject.code} • {unreadCount} chưa đọc</div>
            </div>
            {unreadCount ? (
              <button type="button" onClick={() => void markAllRead()} className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-cyan-200 hover:bg-cyan-300/[0.06]">
                <CheckCheck className="size-3.5" /> Đọc tất cả
              </button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-white/[0.04] hover:text-slate-300" aria-label="Đóng thông báo">
              <X className="size-3.5" />
            </button>
          </div>

          <div className="scrollbar-thin max-h-[470px] overflow-y-auto">
            {loading ? (
              <div className="grid min-h-40 place-items-center text-slate-500"><LoaderCircle className="size-5 animate-spin" /></div>
            ) : error ? (
              <div className="p-5 text-center">
                <div className="text-xs text-rose-200">{error}</div>
                <button type="button" onClick={() => void load()} className="mt-3 rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-slate-400 hover:text-white">Thử lại</button>
              </div>
            ) : items.length ? (
              items.map((item) => {
                const { Icon, tone } = categoryMeta(item.category);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => void openNotification(item)}
                    className={cn(
                      "flex w-full gap-3 border-b border-white/[0.045] px-4 py-3.5 text-left transition hover:bg-white/[0.03]",
                      !item.readAt && "bg-cyan-300/[0.022]",
                    )}
                  >
                    <div className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border", tone)}><Icon className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className={cn("text-xs font-medium leading-5", item.readAt ? "text-slate-400" : "text-slate-100")}>{item.title}</div>
                        {!item.readAt ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan-300" /> : null}
                      </div>
                      {item.summary ? <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{item.summary}</div> : null}
                      <div className="mt-1.5 text-[9px] text-slate-600">{relativeTime(item.createdAt)}</div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="grid min-h-44 place-items-center px-6 text-center">
                <div>
                  <Bell className="mx-auto size-5 text-slate-600" />
                  <div className="mt-2 text-xs text-slate-400">Chưa có thông báo</div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-600">Khi ISSUE được giao hoặc sắp đến hạn, thông báo sẽ xuất hiện tại đây.</div>
                </div>
              </div>
            )}
          </div>

          <Link href="/activity" onClick={() => setOpen(false)} className="flex items-center justify-center border-t border-white/[0.07] px-4 py-3 text-[10px] font-medium text-cyan-200/80 hover:bg-cyan-300/[0.035] hover:text-cyan-100">
            Mở Activity Center
          </Link>
        </div>
      ) : null}
    </div>
  );
}
