"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Archive,
  BriefcaseBusiness,
  CheckCircle2,
  LoaderCircle,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  MasterProjectMember,
  MasterProjectRow,
  MasterProjectsResponse,
  MasterMembersResponse,
} from "@/lib/master/types";
import type { ProjectRole } from "@/lib/issues/types";

const statusOptions = [
  { value: "active", label: "Active", description: "Project đang hoạt động" },
  { value: "paused", label: "Paused", description: "Tạm dừng triển khai" },
  { value: "completed", label: "Completed", description: "Đã hoàn tất" },
  { value: "archived", label: "Archived", description: "Lưu trữ, không còn hoạt động" },
];

const roleOptions = [
  { value: "admin", label: "Admin", description: "Toàn quyền trong Project" },
  { value: "pm", label: "PM", description: "Quản lý nghiệp vụ Project" },
  { value: "member", label: "Member", description: "Thao tác ISSUE và dữ liệu được phép" },
  { value: "viewer", label: "Viewer", description: "Chỉ xem" },
];

function statusTone(status: MasterProjectRow["status"]) {
  if (status === "active") return "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200";
  if (status === "paused") return "border-amber-300/15 bg-amber-300/[0.06] text-amber-200";
  if (status === "completed") return "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200";
  return "border-white/[0.08] bg-white/[0.03] text-slate-500";
}

export function MasterProjectConsole() {
  const [projects, setProjects] = useState<MasterProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<MasterProjectRow | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/master/projects", { cache: "no-store" });
      const result = (await response.json()) as MasterProjectsResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không đọc được Project." : result.message);
      setProjects(result.projects);
      if (selectedProject) {
        setSelectedProject(result.projects.find((item) => item.id === selectedProject.id) ?? null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đọc được Project.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => { void loadProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => [project.code, project.name, project.organizationName, project.contractNo].some((value) => value?.toLowerCase().includes(q)));
  }, [projects, search]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((item) => item.status === "active").length,
    paused: projects.filter((item) => item.status === "paused").length,
    archived: projects.filter((item) => item.status === "archived").length,
  }), [projects]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/master/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.get("code"),
          name: form.get("name"),
          organizationName: form.get("organizationName"),
          contractNo: form.get("contractNo"),
          startDate: form.get("startDate"),
          dueDate: form.get("dueDate"),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Không tạo được Project.");
      setShowCreate(false);
      formElement.reset();
      await loadProjects();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được Project.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(project: MasterProjectRow, status: string) {
    const previous = projects;
    setProjects((items) => items.map((item) => item.id === project.id ? { ...item, status: status as MasterProjectRow["status"] } : item));
    try {
      const response = await fetch(`/api/master/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Không cập nhật được trạng thái.");
      setProjects((items) => items.map((item) => item.id === project.id ? result.project : item));
      setSelectedProject((current) => current?.id === project.id ? result.project : current);
    } catch (error) {
      setProjects(previous);
      setMessage(error instanceof Error ? error.message : "Không cập nhật được trạng thái.");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Tổng Project", stats.total, BriefcaseBusiness, "text-cyan-200"],
          ["Active", stats.active, CheckCircle2, "text-emerald-200"],
          ["Paused", stats.paused, PauseCircle, "text-amber-200"],
          ["Archived", stats.archived, Archive, "text-slate-400"],
        ].map(([label, value, Icon, tone]) => {
          const C = Icon as typeof BriefcaseBusiness;
          return (
            <div key={String(label)} className="tech-panel rounded-2xl p-4">
              <div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[0.16em] text-slate-600">{String(label)}</span><C className={`size-4 ${tone}`} /></div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{String(value)}</div>
            </div>
          );
        })}
      </div>

      <div className="tech-panel mt-4 overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
            <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Tìm mã Project, đơn vị, hợp đồng..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" />
          </div>
          <button onClick={() => void loadProjects()} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-400"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          <button onClick={() => setShowCreate((value) => !value)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f]"><Plus className="size-4" /> Project mới</button>
        </div>

        {showCreate ? (
          <form onSubmit={createProject} className="grid gap-3 border-b border-cyan-300/10 bg-cyan-300/[0.025] p-4 md:grid-cols-2 xl:grid-cols-3">
            <input name="code" required maxLength={30} placeholder="Mã Project *" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none" />
            <input name="name" required maxLength={180} placeholder="Tên dự án *" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none" />
            <input name="organizationName" maxLength={180} placeholder="Đơn vị / Trường" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none" />
            <input name="contractNo" maxLength={120} placeholder="Số hợp đồng" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none" />
            <input name="startDate" type="date" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-400 outline-none" />
            <input name="dueDate" type="date" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-400 outline-none" />
            <button disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] md:col-span-2 xl:col-span-3">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? "Đang tạo..." : "Tạo Project"}</button>
          </form>
        ) : null}

        {message ? <div className="border-b border-rose-300/10 bg-rose-300/[0.035] px-4 py-3 text-xs text-rose-200">{message}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-white/[0.02] text-left text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <tr>{["Project", "Đơn vị", "Trạng thái", "Thành viên", "Kế hoạch", ""].map((head) => <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody>
              {loading && !projects.length ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-xs text-slate-600"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin text-cyan-300/60" />Đang tải toàn bộ Project...</td></tr>
              ) : filtered.map((project) => (
                <tr key={project.id} className="border-b border-white/[0.04] text-xs hover:bg-white/[0.018]">
                  <td className="px-4 py-4"><div className="font-semibold text-slate-200">{project.code}</div><div className="mt-1 max-w-[300px] truncate text-[10px] text-slate-600">{project.name}</div></td>
                  <td className="px-4 py-4 text-slate-500">{project.organizationName || "—"}</td>
                  <td className="px-4 py-4"><div className="w-[170px]"><ThemedSelect ariaLabel={`Trạng thái ${project.code}`} value={project.status} options={statusOptions} onChange={(value) => void updateStatus(project, value)} buttonClassName="h-9" /></div></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[10px] text-slate-400"><UsersRound className="size-3" /> {project.memberCount}</span></td>
                  <td className="px-4 py-4 text-[10px] text-slate-600">{project.startDate || "—"} → {project.dueDate || "—"}</td>
                  <td className="px-4 py-4 text-right"><button onClick={() => setSelectedProject(project)} className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.045] px-3 py-2 text-[10px] font-medium text-cyan-200/80 hover:bg-cyan-300/[0.08]">Quản lý thành viên</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProject ? <MemberDrawer project={selectedProject} onClose={() => setSelectedProject(null)} onChanged={loadProjects} /> : null}
    </>
  );
}

function MemberDrawer({ project, onClose, onChanged }: { project: MasterProjectRow; onClose: () => void; onChanged: () => Promise<void> }) {
  const [members, setMembers] = useState<MasterProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/master/projects/${project.id}/members`, { cache: "no-store" });
      const result = (await response.json()) as MasterMembersResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không tải được thành viên." : result.message);
      setMembers(result.members);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được thành viên."); }
    finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { void load(); }, [load]);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/master/projects/${project.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Không lưu được thành viên.");
      setEmail(""); await load(); await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được thành viên."); }
    finally { setSaving(false); }
  }

  async function removeMember(userId: string) {
    if (!window.confirm("Gỡ tài khoản này khỏi Project?")) return;
    const response = await fetch(`/api/master/projects/${project.id}/members?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.ok) { setMessage(result.message || "Không gỡ được thành viên."); return; }
    await load(); await onChanged();
  }

  return (
    <div className="fixed inset-0 z-[110]">
      <button aria-label="Đóng" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-white/[0.08] bg-[#081321] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/[0.06] p-5">
          <div className="grid size-10 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05]"><ShieldCheck className="size-4 text-cyan-200" /></div>
          <div><div className="text-[9px] uppercase tracking-[0.18em] text-cyan-300/60">Master Membership</div><div className="mt-1 text-sm font-semibold text-white">{project.code} • {project.name}</div></div>
          <button onClick={onClose} className="ml-auto grid size-9 place-items-center rounded-xl border border-white/[0.06] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          <form onSubmit={addMember} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><UserPlus className="size-3.5 text-cyan-300/60" /> Thêm / đổi quyền thành viên</div>
            <input type="email" required value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} placeholder="Email tài khoản Supabase" className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/20" />
            <div className="mt-3"><ThemedSelect ariaLabel="Role" value={role} options={roleOptions} onChange={(value) => setRole(value as ProjectRole)} /></div>
            <button disabled={saving} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{saving ? "Đang lưu..." : "Lưu thành viên"}</button>
            <div className="mt-3 text-[10px] leading-5 text-slate-600">Tài khoản phải đã tồn tại trong Supabase Auth/profiles. MASTER không cần được thêm vào project_members.</div>
          </form>

          {message ? <div className="mt-3 rounded-xl border border-rose-300/10 bg-rose-300/[0.035] p-3 text-xs text-rose-200">{message}</div> : null}

          <div className="mt-5 space-y-2">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Project Members • {members.length}</div>
            {loading ? <div className="py-12 text-center text-xs text-slate-600"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />Đang tải...</div> : members.length ? members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                <div className="grid size-9 place-items-center rounded-xl bg-white/[0.04] text-[10px] font-bold text-slate-400">{(member.displayName || member.email || "U").slice(0,2).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-300">{member.displayName || member.email || member.userId}</div><div className="mt-1 truncate text-[10px] text-slate-600">{member.email || member.userId}</div></div>
                <span className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.045] px-2 py-1 text-[9px] font-semibold uppercase text-cyan-200/75">{member.role}</span>
                <button onClick={() => void removeMember(member.userId)} className="grid size-8 place-items-center rounded-lg border border-rose-300/10 text-rose-300/55 hover:bg-rose-300/[0.05] hover:text-rose-200"><X className="size-3.5" /></button>
              </div>
            )) : <div className="rounded-xl border border-dashed border-white/[0.07] p-8 text-center text-xs text-slate-600">Project chưa có member. MASTER vẫn có toàn quyền truy cập.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}
