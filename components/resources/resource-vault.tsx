"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Clipboard, Copy, Database, ExternalLink, Eye, EyeOff, FileKey2, FolderKanban, Globe2, KeyRound, LoaderCircle, LockKeyhole, Pencil, Plus, RefreshCcw, Search, ServerCog, ShieldCheck, Trash2, X } from "lucide-react";
import { useProject } from "@/components/project-context";
import { ThemedSelect } from "@/components/ui/themed-select";
import type { ResourceActivity, ResourceApiResponse, ResourceData, ResourceDetailResponse, ResourceRow } from "@/lib/resources/types";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả loại" }, { value: "portal", label: "Portal" }, { value: "server", label: "Server" }, { value: "database", label: "Database" }, { value: "folder", label: "Folder / Document" }, { value: "test", label: "Test" }, { value: "other", label: "Other" },
];
const ENV_OPTIONS = [
  { value: "all", label: "Tất cả môi trường" }, { value: "production", label: "Production" }, { value: "staging", label: "Staging" }, { value: "test", label: "Test" }, { value: "development", label: "Development" }, { value: "other", label: "Other" },
];
const FORM_TYPE_OPTIONS = TYPE_OPTIONS.filter((x) => x.value !== "all");
const FORM_ENV_OPTIONS = ENV_OPTIONS.filter((x) => x.value !== "all");

function iconFor(type: string) {
  if (type === "portal") return Globe2;
  if (type === "server") return ServerCog;
  if (type === "database") return Database;
  if (type === "folder") return FolderKanban;
  return FileKey2;
}
function envClass(env: string | null) {
  if (env === "production") return "border-rose-300/15 bg-rose-300/[0.06] text-rose-200";
  if (env === "test") return "border-amber-300/15 bg-amber-300/[0.06] text-amber-200";
  if (env === "staging") return "border-violet-300/15 bg-violet-300/[0.06] text-violet-200";
  if (env === "development") return "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200";
  return "border-white/[0.07] bg-white/[0.025] text-slate-500";
}
function isHttpUrl(value: string | null) { return Boolean(value && /^https?:\/\//i.test(value)); }
function formatTime(value: string) {
  try { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
}

type FormState = { name: string; resourceType: string; environment: string; urlOrHost: string; remoteAddress: string; username: string; secret: string; notes: string; isSensitive: boolean; clearSecret: boolean };
const EMPTY_FORM: FormState = { name: "", resourceType: "portal", environment: "production", urlOrHost: "", remoteAddress: "", username: "", secret: "", notes: "", isSensitive: false, clearSecret: false };

export function ResourceVault() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [selected, setSelected] = useState<ResourceRow | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "create" | "edit">("view");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activity, setActivity] = useState<ResourceActivity[]>([]);
  const [permissionMembers, setPermissionMembers] = useState<Array<{ userId: string; role: string; name: string | null; email: string | null; canReveal: boolean; canCopy: boolean }>>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setSelected(null); setRevealed(null);
    try {
      const res = await fetch(`/api/resources?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body: ResourceApiResponse = await res.json();
      if (!body.ok) throw new Error(body.message);
      setData(body.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được Resource Vault."); }
    finally { setLoading(false); }
  }, [selectedProject.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (type !== "all" && row.resourceType !== type) return false;
      if (environment !== "all" && row.environment !== environment) return false;
      if (!q) return true;
      return [row.name, row.urlOrHost, row.remoteAddress, row.username, row.notes].some((v) => v?.toLowerCase().includes(q));
    });
  }, [data, search, type, environment]);

  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  async function openDetail(row: ResourceRow) {
    setSelected(row); setDrawerMode("view"); setRevealed(null); setActivity([]); setPermissionMembers([]);
    if (data?.source === "demo") return;
    const res = await fetch(`/api/resources/${row.id}?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
    const body: ResourceDetailResponse = await res.json();
    if (body.ok) { setSelected(body.resource); setActivity(body.activity); }
    if (data?.canManage) void loadPermissions(row.id);
  }
  async function loadPermissions(resourceId: string) {
    setPermissionLoading(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}/permissions?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body = await res.json();
      if (body.ok) setPermissionMembers(body.members ?? []);
    } finally { setPermissionLoading(false); }
  }
  async function updatePermission(resourceId: string, userId: string, patch: { canReveal: boolean; canCopy: boolean }) {
    const res = await fetch(`/api/resources/${resourceId}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, userId, ...patch }) });
    const body = await res.json();
    if (!body.ok) return showToast(body.message ?? "Không cập nhật được quyền.");
    setPermissionMembers((current) => current.map((member) => member.userId === userId ? { ...member, ...patch } : member));
    showToast("Đã cập nhật quyền credential.");
  }
  function startCreate() { setSelected(null); setForm(EMPTY_FORM); setDrawerMode("create"); setRevealed(null); }
  function startEdit(row: ResourceRow) {
    setSelected(row); setForm({ name: row.name, resourceType: row.resourceType, environment: row.environment ?? "other", urlOrHost: row.urlOrHost ?? "", remoteAddress: row.remoteAddress ?? "", username: row.username ?? "", secret: "", notes: row.notes ?? "", isSensitive: row.isSensitive, clearSecret: false }); setDrawerMode("edit"); setRevealed(null);
  }
  function closeDrawer() { setSelected(null); setDrawerMode("view"); setRevealed(null); if (hideTimer.current) clearTimeout(hideTimer.current); }

  async function save() {
    if (!form.name.trim()) return showToast("Nhập tên tài nguyên.");
    setSaving(true);
    try {
      const endpoint = drawerMode === "create" ? "/api/resources" : `/api/resources/${selected?.id}`;
      const res = await fetch(endpoint, { method: drawerMode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProject.id, ...form }) });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      showToast(drawerMode === "create" ? "Đã tạo tài nguyên." : "Đã cập nhật tài nguyên."); closeDrawer(); await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Không lưu được tài nguyên."); }
    finally { setSaving(false); }
  }
  async function remove(row: ResourceRow) {
    if (!window.confirm(`Xóa tài nguyên “${row.name}”? Secret mã hóa sẽ bị xóa cùng tài nguyên.`)) return;
    const res = await fetch(`/api/resources/${row.id}?projectId=${encodeURIComponent(selectedProject.id)}`, { method: "DELETE" });
    const body = await res.json(); if (!body.ok) return showToast(body.message ?? "Không xóa được."); showToast("Đã xóa tài nguyên."); closeDrawer(); await load();
  }
  async function access(row: ResourceRow, action: "reveal" | "copy" | "open_link") {
    try {
      const res = await fetch(`/api/resources/${row.id}/access`, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ projectId: selectedProject.id, action }) });
      const body = await res.json(); if (!body.ok) throw new Error(body.message);
      if (action === "reveal" && body.secret) {
        setRevealed(body.secret);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setRevealed(null), (body.hideAfterSeconds ?? 10) * 1000);
      }
      if (action === "copy" && body.secret) { await navigator.clipboard.writeText(body.secret); showToast("Đã copy secret. Hành động đã được audit."); }
      if (action === "open_link" && row.urlOrHost) window.open(row.urlOrHost, "_blank", "noopener,noreferrer");
      if (selected) void openDetail(row);
    } catch (e) { showToast(e instanceof Error ? e.message : "Thao tác bảo mật thất bại."); }
  }

  if (loading) return <div className="tech-panel grid min-h-[360px] place-items-center rounded-2xl"><div className="flex items-center gap-3 text-xs text-slate-500"><LoaderCircle className="size-4 animate-spin text-cyan-300" /> Đang tải Resource Vault...</div></div>;
  if (error) return <div className="tech-panel rounded-2xl p-6"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 text-rose-300" /><div><div className="text-sm font-semibold text-rose-200">Không tải được Remote Server</div><p className="mt-1 text-xs text-slate-500">{error}</p><button onClick={() => void load()} className="mt-4 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-slate-300"><RefreshCcw className="mr-2 inline size-3.5" />Thử lại</button></div></div></div>;
  if (!data) return null;

  return <>
    {!data.securityReady && data.source === "database" ? <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 size-4 text-amber-200" /><div><div className="text-xs font-semibold text-amber-100">Security environment chưa hoàn tất</div><div className="mt-1 text-xs leading-5 text-amber-100/50">Metadata vẫn xem được, nhưng để lưu/reveal secret cần cấu hình <b>SUPABASE_SERVICE_ROLE_KEY</b> và <b>APP_ENCRYPTION_KEY</b> trên Vercel.</div></div></div></div> : null}

    <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[ ["Tổng tài nguyên", data.summary.total, Globe2], ["Production", data.summary.production, ServerCog], ["Sensitive", data.summary.sensitive, ShieldCheck], ["Có credential", data.summary.withSecret, KeyRound] ].map(([label,value,Icon]) => { const C=Icon as typeof Globe2; return <div key={String(label)} className="tech-panel rounded-2xl p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{String(label)}</div><div className="mt-2 text-2xl font-semibold text-white">{String(value)}</div></div><C className="size-4.5 text-cyan-300/55" /></div></div> })}
    </section>

    <div className="tech-panel overflow-visible rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 xl:flex-row xl:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Tìm tên, URL/host, username, ghi chú..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20"/></div>
        <ThemedSelect ariaLabel="Loại resource" value={type} onChange={setType} options={TYPE_OPTIONS} className="w-full xl:w-[180px]" />
        <ThemedSelect ariaLabel="Môi trường" value={environment} onChange={setEnvironment} options={ENV_OPTIONS} className="w-full xl:w-[190px]" />
        {data.canManage ? <button onClick={startCreate} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] hover:bg-cyan-200"><Plus className="size-4"/>Thêm tài nguyên</button> : null}
      </div>

      <div className="overflow-x-auto"><table className="w-full min-w-[1040px]"><thead className="bg-white/[0.025] text-left text-[9px] uppercase tracking-[0.14em] text-slate-600"><tr>{["Tài nguyên","Loại","Môi trường","URL / Host","Username","Credential","Cập nhật",""].map(h=><th key={h} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>
      {rows.map(row=>{ const Icon=iconFor(row.resourceType); return <tr key={row.id} onDoubleClick={()=>void openDetail(row)} className="border-b border-white/[0.04] text-xs hover:bg-white/[0.02]"><td className="px-4 py-3"><button onClick={()=>void openDetail(row)} className="flex items-center gap-3 text-left"><span className="grid size-9 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.045]"><Icon className="size-4 text-cyan-300/65"/></span><span><span className="block font-medium text-slate-300">{row.name}</span>{row.isSensitive?<span className="mt-1 inline-flex items-center gap-1 text-[9px] text-amber-300/60"><LockKeyhole className="size-2.5"/>Sensitive</span>:null}</span></button></td><td className="px-4 py-3 text-slate-500">{row.resourceType}</td><td className="px-4 py-3"><span className={cn("rounded-lg border px-2 py-1 text-[9px] uppercase tracking-[0.08em]",envClass(row.environment))}>{row.environment ?? "other"}</span></td><td className="max-w-[260px] truncate px-4 py-3 font-mono text-[10px] text-slate-500">{row.urlOrHost ?? "—"}</td><td className="px-4 py-3 text-slate-500">{row.username ?? "—"}</td><td className="px-4 py-3">{row.hasSecret?<span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300/70"><KeyRound className="size-3"/>{row.secretHint ?? "••••••••"}</span>:<span className="text-[10px] text-slate-700">Không có</span>}</td><td className="px-4 py-3 text-[10px] text-slate-600">{formatTime(row.updatedAt)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={()=>void openDetail(row)} className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-white/[0.04] hover:text-cyan-200"><Eye className="size-3.5"/></button>{isHttpUrl(row.urlOrHost)?<button onClick={()=>void access(row,"open_link")} className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-white/[0.04] hover:text-cyan-200"><ExternalLink className="size-3.5"/></button>:null}</div></td></tr>})}
      {!rows.length?<tr><td colSpan={8} className="px-4 py-16 text-center text-xs text-slate-600">Không có tài nguyên phù hợp bộ lọc.</td></tr>:null}
      </tbody></table></div><div className="flex items-center justify-between border-t border-white/[0.04] px-4 py-3 text-[10px] text-slate-700"><span>{rows.length} / {data.summary.total} resources</span><span>{data.role} • {data.source}</span></div>
    </div>

    {(selected || drawerMode === "create") ? <div className="fixed inset-0 z-[100]"><button className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={closeDrawer} aria-label="Đóng drawer"/><aside className="scrollbar-thin absolute inset-y-0 right-0 w-full max-w-[620px] overflow-y-auto border-l border-white/[0.08] bg-[#081421] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#081421]/95 px-5 py-4 backdrop-blur-xl"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">Secure Resource Vault</div><div className="mt-1 text-base font-semibold text-white">{drawerMode === "create" ? "Thêm tài nguyên" : selected?.name}</div></div><button onClick={closeDrawer} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500"><X className="size-4"/></button></div>
      <div className="p-5">
      {drawerMode === "create" || drawerMode === "edit" ? <div className="space-y-4">
        <Field label="Tên tài nguyên"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="field" placeholder="Ví dụ: SQL Server Production"/></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Loại"><ThemedSelect ariaLabel="Loại" value={form.resourceType} onChange={v=>setForm({...form,resourceType:v})} options={FORM_TYPE_OPTIONS}/></Field><Field label="Môi trường"><ThemedSelect ariaLabel="Môi trường" value={form.environment} onChange={v=>setForm({...form,environment:v})} options={FORM_ENV_OPTIONS}/></Field></div>
        <Field label="URL / Host"><input value={form.urlOrHost} onChange={e=>setForm({...form,urlOrHost:e.target.value})} className="field" placeholder="https://... hoặc hostname"/></Field>
        <Field label="Remote Address"><input value={form.remoteAddress} onChange={e=>setForm({...form,remoteAddress:e.target.value})} className="field" placeholder="IP:port / RDP address"/></Field>
        <Field label="Username"><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} className="field"/></Field>
        <Field label={drawerMode === "edit" ? "Secret mới (để trống nếu giữ nguyên)" : "Password / Secret"}><input type="password" autoComplete="new-password" value={form.secret} onChange={e=>setForm({...form,secret:e.target.value,clearSecret:false})} className="field" placeholder="Không log / không đưa vào client list"/></Field>
        {drawerMode === "edit" && selected?.hasSecret ? <label className="flex items-center gap-2 rounded-xl border border-rose-300/10 bg-rose-300/[0.035] p-3 text-xs text-slate-400"><input type="checkbox" checked={form.clearSecret} onChange={e=>setForm({...form,clearSecret:e.target.checked,secret:e.target.checked?"":form.secret})}/> Xóa credential hiện tại</label>:null}
        <Field label="Ghi chú"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={4} className="field h-auto py-3"/></Field>
        <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={form.isSensitive} onChange={e=>setForm({...form,isSensitive:e.target.checked})}/> Đánh dấu tài nguyên nhạy cảm</label>
        <div className="flex gap-2 border-t border-white/[0.06] pt-4"><button disabled={saving} onClick={()=>void save()} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-50">{saving?<LoaderCircle className="size-4 animate-spin"/>:<Check className="size-4"/>}Lưu</button><button onClick={()=>drawerMode==="edit"&&selected?setDrawerMode("view"):closeDrawer()} className="h-10 rounded-xl border border-white/[0.08] px-4 text-xs text-slate-400">Hủy</button></div>
      </div> : selected ? <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3"><Info label="Loại" value={selected.resourceType}/><Info label="Môi trường" value={selected.environment ?? "other"}/></div><Info label="URL / Host" value={selected.urlOrHost ?? "—"}/><Info label="Remote Address" value={selected.remoteAddress ?? "—"}/><Info label="Username" value={selected.username ?? "—"}/>
        <div className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-4"><div className="flex items-center gap-2"><KeyRound className="size-4 text-cyan-300/70"/><div className="text-xs font-semibold text-slate-200">Credential</div><span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-slate-600">server-only encrypted</span></div>{selected.hasSecret?<><div className="mt-4 flex min-h-11 items-center rounded-xl border border-white/[0.07] bg-black/15 px-3 font-mono text-xs text-slate-300"><span className="min-w-0 flex-1 break-all">{revealed ?? selected.secretHint ?? "••••••••••••"}</span>{revealed?<button onClick={()=>setRevealed(null)} className="ml-2 text-slate-500"><EyeOff className="size-4"/></button>:null}</div><div className="mt-3 flex flex-wrap gap-2"><button disabled={!selected.canReveal} onClick={()=>void access(selected,"reveal")} className="secure-btn"><Eye className="size-3.5"/>Reveal 10s</button><button disabled={!selected.canCopy} onClick={()=>void access(selected,"copy")} className="secure-btn"><Copy className="size-3.5"/>Copy</button></div>{!selected.canReveal&&!selected.canCopy?<p className="mt-3 text-[10px] text-amber-200/60">Bạn chưa được cấp quyền Reveal/Copy credential này.</p>:null}</>:<p className="mt-4 text-xs text-slate-600">Tài nguyên không có credential.</p>}</div>
        {selected.notes?<Info label="Ghi chú" value={selected.notes}/>:null}
        {data.canManage?<div className="flex flex-wrap gap-2"><button onClick={()=>startEdit(selected)} className="secure-btn"><Pencil className="size-3.5"/>Chỉnh sửa</button><button onClick={()=>void remove(selected)} className="secure-btn border-rose-300/10 text-rose-200/70 hover:bg-rose-300/[0.05]"><Trash2 className="size-3.5"/>Xóa</button></div>:null}
        {data.canManage?<div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"><ShieldCheck className="size-3.5"/>Credential Permissions</div><div className="space-y-2">{permissionLoading?<div className="flex items-center gap-2 rounded-xl border border-white/[0.05] p-3 text-xs text-slate-600"><LoaderCircle className="size-3.5 animate-spin"/>Đang tải thành viên...</div>:permissionMembers.length?permissionMembers.map(member=><div key={member.userId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="min-w-0"><div className="truncate text-xs text-slate-300">{member.name ?? member.email ?? member.userId}</div><div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-700">{member.role}</div></div>{member.role === "admin" || member.role === "pm"?<span className="col-span-2 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.04] px-2 py-1 text-[9px] text-emerald-200/60">Full access</span>:<><label className="flex items-center gap-1.5 text-[10px] text-slate-500"><input type="checkbox" checked={member.canReveal} onChange={e=>void updatePermission(selected.id,member.userId,{canReveal:e.target.checked,canCopy:member.canCopy})}/>Reveal</label><label className="flex items-center gap-1.5 text-[10px] text-slate-500"><input type="checkbox" checked={member.canCopy} onChange={e=>void updatePermission(selected.id,member.userId,{canReveal:member.canReveal,canCopy:e.target.checked})}/>Copy</label></>}</div>):<div className="rounded-xl border border-white/[0.05] p-4 text-xs text-slate-700">Không có thành viên để cấp quyền.</div>}</div></div>:null}
        {data.canAudit?<div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"><Clipboard className="size-3.5"/>Security Activity</div><div className="space-y-2">{activity.length?activity.map(item=><div key={item.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300/60">{item.action}</span><span className="text-[9px] text-slate-700">{formatTime(item.createdAt)}</span></div><div className="mt-1 text-[10px] text-slate-500">{item.actorName ?? item.actorEmail ?? "System"}</div></div>):<div className="rounded-xl border border-white/[0.05] p-4 text-xs text-slate-700">Chưa có activity hoặc cần refresh detail.</div>}</div></div>:null}
      </div>:null}
      </div></aside></div>:null}
    {toast?<div className="fixed bottom-5 right-5 z-[140] max-w-sm rounded-xl border border-cyan-300/15 bg-[#0b1727] px-4 py-3 text-xs text-slate-200 shadow-2xl">{toast}</div>:null}
  </>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</span>{children}</label> }
function Info({label,value}:{label:string;value:string}) { return <div><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-700">{label}</div><div className="mt-1 break-words text-xs leading-5 text-slate-400">{value}</div></div> }
