"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  ContactRound,
  FilePenLine,
  FileText,
  LoaderCircle,
  MapPin,
  NotebookTabs,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  MasterProjectMember,
  MasterProjectRow,
  MasterProjectDeleteResponse,
  MasterProjectsResponse,
  MasterMembersResponse,
  MasterProjectMutationResponse,
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

const inputClass = "h-10 w-full rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25";
const textareaClass = "min-h-[96px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#081321] px-3 py-2.5 text-xs leading-5 text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25";

function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[9px] leading-4 text-slate-700">{hint}</span> : null}
    </label>
  );
}

export function MasterProjectConsole() {
  const router = useRouter();
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
      setSelectedProject((current) => current ? result.projects.find((item) => item.id === current.id) ?? null : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đọc được Project.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => [
      project.code,
      project.name,
      project.organizationName,
      project.organizationCode,
      project.contractNo,
      project.contactName,
    ].some((value) => value?.toLowerCase().includes(q)));
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
          contractDate: form.get("contractDate"),
          startDate: form.get("startDate"),
          dueDate: form.get("dueDate"),
        }),
      });
      const result = (await response.json()) as MasterProjectMutationResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không tạo được Project." : result.message);
      setShowCreate(false);
      formElement.reset();
      setProjects((items) => [...items, result.project]);
      setSelectedProject(result.project);
      router.refresh();
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
      const result = (await response.json()) as MasterProjectMutationResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không cập nhật được trạng thái." : result.message);
      handleProjectUpdated(result.project);
    } catch (error) {
      setProjects(previous);
      setMessage(error instanceof Error ? error.message : "Không cập nhật được trạng thái.");
    }
  }

  function handleProjectUpdated(project: MasterProjectRow) {
    setProjects((items) => items.map((item) => item.id === project.id ? project : item));
    setSelectedProject((current) => current?.id === project.id ? project : current);
    router.refresh();
  }

  async function deleteProject(project: MasterProjectRow) {
    const typedCode = window.prompt(`Xóa vĩnh viễn Project ${project.code}? Nhập đúng mã Project để xác nhận.`);
    if (typedCode !== project.code) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/master/projects/${project.id}`, { method: "DELETE" });
      const result = (await response.json()) as MasterProjectDeleteResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không xóa được Project." : result.message);
      setProjects((items) => items.filter((item) => item.id !== project.id));
      setSelectedProject(null);
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không xóa được Project.");
    } finally {
      setSaving(false);
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
            <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Tìm mã Project, trường/đơn vị, hợp đồng, đầu mối..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" />
          </div>
          <button onClick={() => void loadProjects()} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-400"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          <button onClick={() => setShowCreate((value) => !value)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f]"><Plus className="size-4" /> Project mới</button>
        </div>

        {showCreate ? (
          <div className="fixed inset-0 z-[125] flex items-center justify-center p-3 md:p-6">
            <button type="button" aria-label="Đóng form tạo Project" onClick={() => !saving && setShowCreate(false)} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
            <form onSubmit={createProject} className="relative w-full max-w-[1040px] overflow-hidden rounded-3xl border border-white/[0.09] bg-[#081421] shadow-[0_28px_100px_rgba(0,0,0,.55)]">
              <header className="flex items-start gap-4 border-b border-white/[0.06] px-5 py-4 md:px-6">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.05]"><BriefcaseBusiness className="size-4.5 text-cyan-200/80" /></div>
                <div className="min-w-0 flex-1"><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">Master Project Console • V1.3.2</div><h3 className="mt-1 text-lg font-semibold text-white">Tạo Project mới</h3><p className="mt-1 text-[10px] text-slate-500">Nhập thông tin nền tảng. Sau khi tạo, hệ thống sẽ mở Hồ sơ Project để bạn bổ sung đầy đủ thông tin và thành viên.</p></div>
                <button type="button" disabled={saving} onClick={() => setShowCreate(false)} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white disabled:opacity-40"><X className="size-4" /></button>
              </header>
              <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-3">
                <Field label="Mã Project" className="xl:col-span-1"><input name="code" required maxLength={30} placeholder="VD: EPU" className={inputClass} /></Field>
                <Field label="Tên dự án" className="md:col-span-1 xl:col-span-2"><input name="name" required maxLength={180} placeholder="Tên Project *" className={inputClass} /></Field>
                <Field label="Trường / Đơn vị" className="md:col-span-2 xl:col-span-3"><input name="organizationName" maxLength={180} placeholder="Tên trường / đơn vị triển khai" className={inputClass} /></Field>
                <Field label="Số hợp đồng"><input name="contractNo" maxLength={120} placeholder="Số hợp đồng" className={inputClass} /></Field>
                <Field label="Ngày ký hợp đồng"><input name="contractDate" type="date" className={inputClass} /></Field>
                <div className="hidden xl:block" />
                <Field label="Ngày bắt đầu"><input name="startDate" type="date" className={inputClass} /></Field>
                <Field label="Ngày kế hoạch kết thúc"><input name="dueDate" type="date" className={inputClass} /></Field>
              </div>
              <footer className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-4 md:px-6">
                <button type="button" disabled={saving} onClick={() => setShowCreate(false)} className="h-10 rounded-xl border border-white/[0.07] px-4 text-xs text-slate-400 hover:bg-white/[0.03] hover:text-white disabled:opacity-40">Hủy</button>
                <button disabled={saving} className="flex h-10 min-w-[155px] items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? "Đang tạo..." : "Tạo & mở hồ sơ"}</button>
              </footer>
            </form>
          </div>
        ) : null}

        {message ? <div className="border-b border-rose-300/10 bg-rose-300/[0.035] px-4 py-3 text-xs text-rose-200">{message}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="bg-white/[0.02] text-left text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <tr>{["Project", "Trường / Đơn vị", "Trạng thái", "Thành viên", "Hợp đồng / Kế hoạch", ""].map((head) => <th key={head} className="border-b border-white/[0.06] px-4 py-3 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody>
              {loading && !projects.length ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-xs text-slate-600"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin text-cyan-300/60" />Đang tải toàn bộ Project...</td></tr>
              ) : filtered.length ? filtered.map((project) => (
                <tr key={project.id} className="border-b border-white/[0.04] text-xs hover:bg-white/[0.018]">
                  <td className="px-4 py-4"><div className="font-semibold text-slate-200">{project.code}</div><div className="mt-1 max-w-[300px] truncate text-[10px] text-slate-600">{project.name}</div></td>
                  <td className="px-4 py-4"><div className="text-slate-400">{project.organizationName || "Chưa cập nhật"}</div><div className="mt-1 text-[9px] text-slate-700">{project.organizationCode || "—"}</div></td>
                  <td className="px-4 py-4"><div className="w-[170px]"><ThemedSelect ariaLabel={`Trạng thái ${project.code}`} value={project.status} options={statusOptions} onChange={(value) => void updateStatus(project, value)} buttonClassName="h-9" /></div></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[10px] text-slate-400"><UsersRound className="size-3" /> {project.memberCount}</span></td>
                  <td className="px-4 py-4"><div className="text-[10px] text-slate-500">{project.contractNo || "Chưa có HĐ"}</div><div className="mt-1 text-[9px] text-slate-700">{project.startDate || "—"} → {project.dueDate || "—"}</div></td>
                  <td className="px-4 py-4 text-right"><button onClick={() => setSelectedProject(project)} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.045] px-3 py-2 text-[10px] font-medium text-cyan-200/80 hover:bg-cyan-300/[0.08]"><Pencil className="size-3" /> Quản lý Project</button></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-xs text-slate-600">Không tìm thấy Project phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProject ? (
        <ProjectDrawer
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onProjectUpdated={handleProjectUpdated}
          onMembersChanged={loadProjects}
          onProjectDeleted={deleteProject}
          deleting={saving}
        />
      ) : null}
    </>
  );
}

function ProjectDrawer({
  project,
  onClose,
  onProjectUpdated,
  onMembersChanged,
  onProjectDeleted,
  deleting,
}: {
  project: MasterProjectRow;
  onClose: () => void;
  onProjectUpdated: (project: MasterProjectRow) => void;
  onMembersChanged: () => Promise<void>;
  onProjectDeleted: (project: MasterProjectRow) => Promise<void>;
  deleting: boolean;
}) {
  const [tab, setTab] = useState<"profile" | "members">("profile");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-6">
      <button aria-label="Đóng" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <section className="relative flex h-[min(90dvh,940px)] w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#081321] shadow-[0_28px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-start gap-3 border-b border-white/[0.06] p-5">
          <div className="grid size-10 place-items-center rounded-xl border border-cyan-300/12 bg-cyan-300/[0.05]"><BriefcaseBusiness className="size-4 text-cyan-200" /></div>
          <div className="min-w-0 flex-1"><div className="text-[9px] uppercase tracking-[0.18em] text-cyan-300/60">Master Project Management</div><div className="mt-1 truncate text-sm font-semibold text-white">{project.code} • {project.organizationName || project.name}</div><div className="mt-1 truncate text-[10px] text-slate-600">{project.name}</div></div>
          <button disabled={deleting} onClick={() => void onProjectDeleted(project)} className="flex h-9 items-center gap-2 rounded-xl border border-rose-300/12 bg-rose-300/[0.04] px-3 text-[10px] font-medium text-rose-200/75 hover:bg-rose-300/[0.07] disabled:opacity-45"><Trash2 className="size-3.5" /> Xóa Project</button>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.06] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>

        <div className="flex gap-1 border-b border-white/[0.06] px-5 py-3">
          <button onClick={() => setTab("profile")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${tab === "profile" ? "bg-cyan-300/[0.08] text-cyan-200" : "text-slate-500 hover:text-slate-300"}`}><FilePenLine className="size-3.5" /> Hồ sơ dự án</button>
          <button onClick={() => setTab("members")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${tab === "members" ? "bg-cyan-300/[0.08] text-cyan-200" : "text-slate-500 hover:text-slate-300"}`}><UsersRound className="size-3.5" /> Thành viên ({project.memberCount})</button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          {tab === "profile" ? <ProjectProfileForm key={`${project.id}-${project.updatedAt}`} project={project} onUpdated={onProjectUpdated} /> : <MembersPanel project={project} onChanged={onMembersChanged} />}
        </div>
      </section>
    </div>
  );
}

function ProjectProfileForm({ project, onUpdated }: { project: MasterProjectRow; onUpdated: (project: MasterProjectRow) => void }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(project.status);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/master/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.get("code"),
          slug: form.get("slug"),
          name: form.get("name"),
          description: form.get("description"),
          organizationName: form.get("organizationName"),
          organizationCode: form.get("organizationCode"),
          organizationAddress: form.get("organizationAddress"),
          status,
          contractNo: form.get("contractNo"),
          contractValue: form.get("contractValue"),
          contractDate: form.get("contractDate"),
          startDate: form.get("startDate"),
          dueDate: form.get("dueDate"),
          contactName: form.get("contactName"),
          contactTitle: form.get("contactTitle"),
          contactEmail: form.get("contactEmail"),
          contactPhone: form.get("contactPhone"),
          notes: form.get("notes"),
        }),
      });
      const result = (await response.json()) as MasterProjectMutationResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không cập nhật được hồ sơ Project." : result.message);
      onUpdated(result.project);
      setMessage({ type: "ok", text: "Đã cập nhật hồ sơ dự án. Project Switcher và Dashboard sẽ dùng thông tin mới." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không cập nhật được hồ sơ Project." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={saveProfile} className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 xl:col-span-2">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><NotebookTabs className="size-3.5 text-cyan-300/60" /> Nhận diện Project</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Mã Project *"><input name="code" required maxLength={30} defaultValue={project.code} className={inputClass} /></Field>
          <Field label="Slug" hint="Dùng cho định danh kỹ thuật; không nên đổi thường xuyên."><input name="slug" maxLength={80} defaultValue={project.slug} className={inputClass} /></Field>
          <Field label="Tên dự án *" className="md:col-span-2 xl:col-span-2"><input name="name" required maxLength={180} defaultValue={project.name} className={inputClass} /></Field>
          <Field label="Mô tả dự án" className="md:col-span-2 xl:col-span-3"><textarea name="description" maxLength={2000} defaultValue={project.description ?? ""} className={textareaClass} placeholder="Mục tiêu, phạm vi hoặc mô tả ngắn của dự án..." /></Field>
          <Field label="Trạng thái"><ThemedSelect ariaLabel="Trạng thái Project" value={status} onChange={(value) => setStatus(value as MasterProjectRow["status"])} options={statusOptions} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><Building2 className="size-3.5 text-cyan-300/60" /> Trường / Đơn vị triển khai</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tên trường / đơn vị" className="md:col-span-2"><input name="organizationName" maxLength={180} defaultValue={project.organizationName ?? ""} className={inputClass} placeholder="Ví dụ: Trường Đại học Điện lực" /></Field>
          <Field label="Mã đơn vị"><input name="organizationCode" maxLength={80} defaultValue={project.organizationCode ?? ""} className={inputClass} placeholder="Ví dụ: EPU" /></Field>
          <Field label="Địa chỉ" className="md:col-span-2"><textarea name="organizationAddress" maxLength={500} defaultValue={project.organizationAddress ?? ""} className="min-h-[72px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#081321] px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-cyan-300/25" placeholder="Địa chỉ trường / đơn vị..." /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><FileText className="size-3.5 text-violet-300/60" /> Hợp đồng & Kế hoạch</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Số hợp đồng"><input name="contractNo" maxLength={120} defaultValue={project.contractNo ?? ""} className={inputClass} /></Field>
          <Field label="Giá trị hợp đồng"><input name="contractValue" inputMode="decimal" defaultValue={project.contractValue ?? ""} className={inputClass} placeholder="Ví dụ: 1500000000" /></Field>
          <Field label="Ngày ký hợp đồng"><input name="contractDate" type="date" defaultValue={project.contractDate ?? ""} className={inputClass} /></Field>
          <div className="hidden md:block" />
          <Field label="Ngày bắt đầu"><input name="startDate" type="date" defaultValue={project.startDate ?? ""} className={inputClass} /></Field>
          <Field label="Ngày kết thúc dự kiến"><input name="dueDate" type="date" defaultValue={project.dueDate ?? ""} className={inputClass} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><ContactRound className="size-3.5 text-emerald-300/60" /> Đầu mối khách hàng</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Họ tên"><input name="contactName" maxLength={180} defaultValue={project.contactName ?? ""} className={inputClass} /></Field>
          <Field label="Chức vụ"><input name="contactTitle" maxLength={180} defaultValue={project.contactTitle ?? ""} className={inputClass} /></Field>
          <Field label="Email"><input name="contactEmail" type="email" maxLength={180} defaultValue={project.contactEmail ?? ""} className={inputClass} /></Field>
          <Field label="Điện thoại"><input name="contactPhone" maxLength={60} defaultValue={project.contactPhone ?? ""} className={inputClass} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500"><MapPin className="size-3.5 text-amber-300/60" /> Ghi chú vận hành</div>
        <Field label="Ghi chú"><textarea name="notes" maxLength={4000} defaultValue={project.notes ?? ""} className={textareaClass} placeholder="Các lưu ý quan trọng của Project..." /></Field>
      </section>

      {message ? <div className={`xl:col-span-2 rounded-xl border px-3 py-3 text-xs ${message.type === "ok" ? "border-emerald-300/12 bg-emerald-300/[0.045] text-emerald-200" : "border-rose-300/12 bg-rose-300/[0.045] text-rose-200"}`}>{message.text}</div> : null}

      <button disabled={saving} className="xl:col-span-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Đang cập nhật hồ sơ..." : "Lưu thông tin Project"}</button>
      <div className="xl:col-span-2 text-center text-[9px] text-slate-700">Cập nhật gần nhất: {new Date(project.updatedAt).toLocaleString("vi-VN")}</div>
    </form>
  );
}

function MembersPanel({ project, onChanged }: { project: MasterProjectRow; onChanged: () => Promise<void> }) {
  const [members, setMembers] = useState<MasterProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/master/projects/${project.id}/members`, { cache: "no-store" });
      const result = (await response.json()) as MasterMembersResponse;
      if (!response.ok || !result.ok) throw new Error(result.ok ? "Không tải được thành viên." : result.message);
      setMembers(result.members);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không tải được thành viên." });
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { void load(); }, [load]);

  function resetForm() {
    setFullName("");
    setEmail("");
    setRole("member");
    setEditingMemberId(null);
  }

  function editMember(member: MasterProjectMember) {
    setFullName(member.displayName ?? "");
    setEmail(member.email ?? "");
    setRole(member.role);
    setEditingMemberId(member.memberId);
    setMessage(null);
  }

  async function saveMember(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/master/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: editingMemberId, fullName, email, role }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Không lưu được thành viên.");
      setMessage({ type: "ok", text: result.message || "Đã lưu thành viên và cập nhật danh sách Phụ trách ISSUE." });
      resetForm();
      await load();
      await onChanged();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không lưu được thành viên." });
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!window.confirm("Gỡ nhân sự này khỏi Project Team? Thành viên sẽ không còn xuất hiện trong danh sách Phụ trách mới, nhưng ISSUE lịch sử vẫn giữ tên người đã phụ trách.")) return;
    const response = await fetch(`/api/master/projects/${project.id}/members?memberId=${encodeURIComponent(memberId)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setMessage({ type: "error", text: result.message || "Không gỡ được thành viên." });
      return;
    }
    if (editingMemberId === memberId) resetForm();
    setMessage({ type: "ok", text: "Đã gỡ thành viên khỏi Project và danh sách Phụ trách." });
    await load();
    await onChanged();
  }

  return (
    <>
      <form onSubmit={saveMember} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              <UserPlus className="size-3.5 text-cyan-300/60" />
              {editingMemberId ? "Cập nhật thành viên" : "Khai báo thành viên Project"}
            </div>
            <div className="mt-2 max-w-xl text-[10px] leading-5 text-slate-600">
              Danh sách này là nguồn của combobox <span className="font-semibold text-cyan-200/70">Phụ trách</span> trong ISSUE.
              Chỉ cần Họ tên để giao việc và thống kê; email có thể bổ sung sau khi nhân sự cần đăng nhập.
            </div>
          </div>
          {editingMemberId ? (
            <button type="button" onClick={resetForm} className="shrink-0 rounded-lg border border-white/[0.07] px-2.5 py-1.5 text-[9px] text-slate-500 hover:text-slate-200">
              Hủy sửa
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Họ tên">
            <input
              required
              value={fullName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)}
              placeholder="Ví dụ: Võ Đức Huy"
              className={inputClass}
              maxLength={180}
            />
          </Field>
          <Field label="Email đăng nhập (không bắt buộc)" hint="Để trống nếu hiện tại chỉ cần giao việc. Khi có tài khoản Supabase, bổ sung email và lưu lại để cấp quyền đăng nhập.">
            <input
              type="email"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              placeholder="Có thể bổ sung sau: user@company.com"
              className={inputClass}
              maxLength={180}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Quyền trong Project">
            <ThemedSelect ariaLabel="Role" value={role} options={roleOptions} onChange={(value) => setRole(value as ProjectRole)} />
          </Field>
        </div>

        <button disabled={saving} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] disabled:opacity-60">
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : editingMemberId ? <Save className="size-4" /> : <UserPlus className="size-4" />}
          {saving ? "Đang đồng bộ..." : editingMemberId ? "Cập nhật thành viên" : "Lưu thành viên"}
        </button>

        <div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.025] px-3 py-2.5 text-[10px] leading-5 text-amber-100/45">
          <span className="font-semibold text-amber-100/70">Email không bắt buộc.</span> Thành viên chưa có email vẫn xuất hiện trong Phụ trách ISSUE và được tính thống kê.
          Khi email trùng với một tài khoản trong <span className="font-mono text-amber-200/70">Supabase Authentication</span>, hệ thống tự liên kết quyền đăng nhập Project.
        </div>
      </form>

      {message ? (
        <div className={`mt-3 rounded-xl border px-3 py-3 text-xs ${message.type === "ok" ? "border-emerald-300/10 bg-emerald-300/[0.04] text-emerald-200" : "border-rose-300/10 bg-rose-300/[0.035] text-rose-200"}`}>
          {message.text}
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Project Team • {members.length}</div>
          <div className="text-[9px] text-slate-700">Nguồn dữ liệu Phụ trách ISSUE</div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-600">
            <LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />Đang tải...
          </div>
        ) : members.length ? members.map((member) => (
          <div key={member.memberId} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
            <div className="grid size-9 place-items-center rounded-xl bg-white/[0.04] text-[10px] font-bold text-slate-400">
              {(member.displayName || member.email || "U").slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-300">{member.displayName || member.email || member.memberId}</div>
              <div className="mt-1 truncate text-[10px] text-slate-600">{member.email || "Chưa có email đăng nhập"}</div>
              <div className={`mt-1.5 inline-flex items-center gap-1 text-[9px] ${member.loginLinked ? "text-emerald-300/70" : "text-amber-300/65"}`}>
                {member.loginLinked ? <CheckCircle2 className="size-3" /> : <UserPlus className="size-3" />}
                {member.loginLinked ? "Đã liên kết tài khoản đăng nhập" : "Nhân sự nội bộ • chưa cần tài khoản đăng nhập"}
              </div>
            </div>
            <span className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.045] px-2 py-1 text-[9px] font-semibold uppercase text-cyan-200/75">{member.role}</span>
            <button onClick={() => editMember(member)} type="button" className="grid size-8 place-items-center rounded-lg border border-white/[0.07] text-slate-500 hover:bg-white/[0.04] hover:text-cyan-200" title="Sửa thành viên">
              <Pencil className="size-3.5" />
            </button>
            <button onClick={() => void removeMember(member.memberId)} type="button" className="grid size-8 place-items-center rounded-lg border border-rose-300/10 text-rose-300/55 hover:bg-rose-300/[0.05] hover:text-rose-200" title="Gỡ khỏi Project">
              <X className="size-3.5" />
            </button>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-white/[0.07] p-8 text-center text-xs leading-6 text-slate-600">
            Project chưa có thành viên. Thêm Họ tên để bắt đầu giao ISSUE ngay; email có thể cập nhật sau.<br />
            MASTER vẫn có quyền toàn hệ thống nhưng không tự xuất hiện trong Phụ trách nếu chưa được thêm vào Project.
          </div>
        )}
      </div>
    </>
  );
}
