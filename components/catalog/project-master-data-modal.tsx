"use client";

import {
  Building2,
  Check,
  DatabaseZap,
  Download,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/project-context";
import { ProjectQuickImportButton } from "@/components/catalog/quick-import-modal";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  ProjectCatalogData,
  ProjectCatalogDepartment,
  ProjectCatalogModule,
  ProjectCatalogMutationResponse,
  ProjectCatalogResponse,
  ProjectCatalogTab,
} from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

const fieldClass = "h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25";

type DepartmentDraft = { id: string; code: string; name: string; isActive: boolean };
type ModuleDraft = {
  id: string;
  code: string;
  name: string;
  parentId: string;
  ownerDepartmentId: string;
  moduleStatusCode: string;
  classification: string;
  sortOrder: string;
};

const emptyDepartment: DepartmentDraft = { id: "", code: "", name: "", isActive: true };
const emptyModule: ModuleDraft = { id: "", code: "", name: "", parentId: "", ownerDepartmentId: "", moduleStatusCode: "", classification: "", sortOrder: "0" };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi").trim();
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}{required ? " *" : ""}</span>
      {children}
      {error ? <span className="mt-1.5 block text-[10px] text-rose-300/90">{error}</span> : null}
    </label>
  );
}

function CatalogModal({ initialTab, onClose }: { initialTab: ProjectCatalogTab; onClose: () => void }) {
  const { selectedProject } = useProject();
  const [tab, setTab] = useState<ProjectCatalogTab>(initialTab);
  const [data, setData] = useState<ProjectCatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [departmentDraft, setDepartmentDraft] = useState<DepartmentDraft>(emptyDepartment);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft>(emptyModule);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const load = useCallback(async (preserveMessage = false) => {
    setLoading(true);
    if (!preserveMessage) setMessage(null);
    try {
      const response = await fetch(`/api/project-catalog?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const body = (await response.json()) as ProjectCatalogResponse;
      if (!body.ok) throw new Error(body.message);
      setData(body.data);
    } catch (reason) {
      setMessage({ type: "error", text: reason instanceof Error ? reason.message : "Không tải được danh mục Project." });
    } finally {
      setLoading(false);
    }
  }, [selectedProject.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filteredDepartments = useMemo(() => {
    const q = normalize(search);
    if (!q) return data?.departments ?? [];
    return (data?.departments ?? []).filter((row) => normalize(`${row.code ?? ""} ${row.name}`).includes(q));
  }, [data?.departments, search]);

  const filteredModules = useMemo(() => {
    const q = normalize(search);
    if (!q) return data?.modules ?? [];
    return (data?.modules ?? []).filter((row) => normalize(`${row.code ?? ""} ${row.name} ${row.parentName ?? ""} ${row.ownerDepartmentName ?? ""}`).includes(q));
  }, [data?.modules, search]);

  function resetDraft(nextTab = tab) {
    setFieldErrors({});
    setMessage(null);
    if (nextTab === "departments") setDepartmentDraft(emptyDepartment);
    else setModuleDraft(emptyModule);
  }

  function visibleIds() {
    return tab === "departments" ? filteredDepartments.map((row) => row.id) : filteredModules.map((row) => row.id);
  }

  function selectedIds() {
    return tab === "departments" ? selectedDepartments : selectedModules;
  }

  function toggleSelected(id: string, checked: boolean) {
    if (tab === "departments") {
      setSelectedDepartments((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
      return;
    }
    setSelectedModules((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  function toggleAllVisible(checked: boolean) {
    const ids = visibleIds();
    if (tab === "departments") {
      setSelectedDepartments((current) => checked ? [...new Set([...current, ...ids])] : current.filter((item) => !ids.includes(item)));
      return;
    }
    setSelectedModules((current) => checked ? [...new Set([...current, ...ids])] : current.filter((item) => !ids.includes(item)));
  }

  function editDepartment(row: ProjectCatalogDepartment) {
    setTab("departments");
    setDepartmentDraft({ id: row.id, code: row.code ?? "", name: row.name, isActive: row.isActive });
    setFieldErrors({}); setMessage(null);
  }

  function editModule(row: ProjectCatalogModule) {
    setTab("modules");
    setModuleDraft({
      id: row.id,
      code: row.code ?? "",
      name: row.name,
      parentId: row.parentId ?? "",
      ownerDepartmentId: row.ownerDepartmentId ?? "",
      moduleStatusCode: row.moduleStatusCode ?? "",
      classification: row.classification ?? "",
      sortOrder: String(row.sortOrder ?? 0),
    });
    setFieldErrors({}); setMessage(null);
  }

  async function saveDepartment() {
    if (!data?.canManage || saving) return;
    const errors: Record<string, string> = {};
    if (!departmentDraft.name.trim()) errors.name = "Tên phòng ban là bắt buộc.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setMessage({ type: "error", text: "Vui lòng kiểm tra các trường được đánh dấu." }); return; }
    setSaving(true); setFieldErrors({}); setMessage(null);
    try {
      const response = await fetch("/api/project-catalog", {
        method: departmentDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, entity: "department", ...departmentDraft }),
      });
      const body = (await response.json()) as ProjectCatalogMutationResponse;
      if (!body.ok) { setFieldErrors(body.fieldErrors ?? {}); throw new Error(body.message); }
      setDepartmentDraft(emptyDepartment);
      await load(true);
      setMessage({ type: "ok", text: body.message });
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: "department" } }));
    } catch (reason) {
      setMessage({ type: "error", text: reason instanceof Error ? reason.message : "Không lưu được phòng ban." });
    } finally { setSaving(false); }
  }

  async function saveModule() {
    if (!data?.canManage || saving) return;
    const errors: Record<string, string> = {};
    if (!moduleDraft.name.trim()) errors.name = "Tên Module là bắt buộc.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setMessage({ type: "error", text: "Vui lòng kiểm tra các trường được đánh dấu." }); return; }
    setSaving(true); setFieldErrors({}); setMessage(null);
    try {
      const response = await fetch("/api/project-catalog", {
        method: moduleDraft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, entity: "module", ...moduleDraft }),
      });
      const body = (await response.json()) as ProjectCatalogMutationResponse;
      if (!body.ok) { setFieldErrors(body.fieldErrors ?? {}); throw new Error(body.message); }
      setModuleDraft(emptyModule);
      await load(true);
      setMessage({ type: "ok", text: body.message });
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: "module" } }));
    } catch (reason) {
      setMessage({ type: "error", text: reason instanceof Error ? reason.message : "Không lưu được Module." });
    } finally { setSaving(false); }
  }

  async function deleteSelected() {
    if (!data?.canManage || saving) return;
    const ids = selectedIds();
    if (!ids.length) return;
    const label = tab === "departments" ? "phòng ban" : "Module";
    if (!window.confirm(`Xóa thật ${ids.length} ${label} đã chọn? Dữ liệu đang được sử dụng sẽ được giữ lại.`)) return;
    setSaving(true); setFieldErrors({}); setMessage(null);
    try {
      const response = await fetch("/api/project-catalog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, entity: tab === "departments" ? "department" : "module", ids }),
      });
      const body = (await response.json()) as ProjectCatalogMutationResponse;
      if (!body.ok) throw new Error(body.message);
      if (tab === "departments") setSelectedDepartments([]);
      else setSelectedModules([]);
      await load(true);
      setMessage({ type: body.blockedCount ? "error" : "ok", text: body.message });
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: tab === "departments" ? "department" : "module" } }));
    } catch (reason) {
      setMessage({ type: "error", text: reason instanceof Error ? reason.message : "Không xóa được dữ liệu." });
    } finally { setSaving(false); }
  }

  const activeDraft = tab === "departments" ? departmentDraft.id : moduleDraft.id;
  const visible = visibleIds();
  const selected = selectedIds();
  const allVisibleSelected = visible.length > 0 && visible.every((id) => selected.includes(id));

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-3 md:p-6">
      <button type="button" aria-label="Đóng danh mục Project" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <section className="relative flex h-[min(90dvh,920px)] w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#081421] shadow-[0_28px_100px_rgba(0,0,0,.55)]">
        <header className="flex items-start gap-4 border-b border-white/[0.06] px-5 py-4 md:px-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.05]"><Settings2 className="size-4.5 text-cyan-200/80" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">Project Master Data • V1.3.2</div>
            <h2 className="mt-1 text-lg font-semibold text-white">Danh mục {selectedProject.code} • {selectedProject.name}</h2>
            <p className="mt-1 text-[10px] text-slate-500">Phòng ban và Module được khai báo riêng theo từng Project, dùng chung cho ISSUE, PLHĐ, Analytics và báo cáo.</p>
          </div>
          <a href="/templates/ASC-WORKING-V1.3.2-Mau-Import-PhongBan-PLHD.xlsx" className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 text-[10px] font-medium text-slate-400 transition hover:border-cyan-300/15 hover:text-cyan-100 sm:flex" title="Tải mẫu Excel trước khi nhập dữ liệu"><Download className="size-3.5" /> Tải mẫu Excel</a>
          {data?.canManage ? <ProjectQuickImportButton label={tab === "departments" ? "Import Phòng ban" : "Import Module"} initialSections={tab === "departments" ? ["departments"] : ["contractItems"]} onApplied={() => void load()} /> : null}
          <button type="button" onClick={() => void load()} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-cyan-200" title="Tải lại"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3 md:px-6">
          <button type="button" onClick={() => { setTab("departments"); setSearch(""); resetDraft("departments"); }} className={cn("flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium", tab === "departments" ? "bg-cyan-300/[0.09] text-cyan-100" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300")}><Building2 className="size-3.5" /> Phòng ban <span className="text-[9px] opacity-60">{data?.departments.length ?? 0}</span></button>
          <button type="button" onClick={() => { setTab("modules"); setSearch(""); resetDraft("modules"); }} className={cn("flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium", tab === "modules" ? "bg-violet-300/[0.09] text-violet-100" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300")}><Layers3 className="size-3.5" /> Module PLHĐ <span className="text-[9px] opacity-60">{data?.modules.length ?? 0}</span></button>
          <div className="relative ml-auto w-full sm:w-[320px]"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "departments" ? "Tìm mã, tên phòng ban..." : "Tìm Module, phân hệ, phòng ban..."} className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" /></div>
          {data?.canManage ? <button type="button" disabled={!selected.length || saving} onClick={() => void deleteSelected()} className="flex h-9 items-center gap-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.055] px-3 text-[10px] font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-35"><Trash2 className="size-3.5" /> Xóa đã chọn {selected.length ? `(${selected.length})` : ""}</button> : null}
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5 md:p-6">
          {loading && !data ? <div className="grid min-h-[420px] place-items-center text-center"><div><LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300/70" /><div className="mt-3 text-xs text-slate-500">Đang tải danh mục Project...</div></div></div> : null}
          {message ? <div className={cn("mb-4 rounded-xl border px-4 py-3 text-xs", message.type === "ok" ? "border-emerald-300/12 bg-emerald-300/[0.045] text-emerald-100/80" : "border-rose-300/15 bg-rose-300/[0.05] text-rose-100/85")}>{message.text}</div> : null}
          {data ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.012]">
                {tab === "departments" ? (
                  <div className="max-h-[600px] overflow-auto scrollbar-thin">
                    <table className="w-full min-w-[650px] text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-[#0b192a]/95 text-[9px] uppercase tracking-[0.13em] text-slate-600"><tr><th className="w-12 px-4 py-3">{data.canManage ? <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Chọn tất cả phòng ban đang hiển thị" /> : null}</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên phòng ban</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                      <tbody>{filteredDepartments.map((row) => <tr key={row.id} className="border-t border-white/[0.045] hover:bg-white/[0.02]"><td className="px-4 py-3">{data.canManage ? <input type="checkbox" checked={selectedDepartments.includes(row.id)} onChange={(event) => toggleSelected(row.id, event.target.checked)} aria-label={`Chọn ${row.name}`} /> : null}</td><td className="px-4 py-3 font-mono text-[10px] text-cyan-300/60">{row.code || "—"}</td><td className="px-4 py-3 font-medium text-slate-300">{row.name}</td><td className="px-4 py-3"><span className={cn("rounded-lg border px-2 py-1 text-[9px]", row.isActive ? "border-emerald-300/12 bg-emerald-300/[0.04] text-emerald-200/70" : "border-white/[0.06] text-slate-600")}>{row.isActive ? "Đang dùng" : "Ngừng dùng"}</span></td><td className="px-4 py-3 text-right">{data.canManage ? <button onClick={() => editDepartment(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 hover:bg-white/[0.04] hover:text-cyan-200"><Pencil className="size-3" /> Sửa</button> : null}</td></tr>)}</tbody>
                    </table>
                    {!filteredDepartments.length ? <div className="p-12 text-center text-xs text-slate-600">Chưa có phòng ban phù hợp.</div> : null}
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-auto scrollbar-thin">
                    <table className="w-full min-w-[860px] text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-[#0b192a]/95 text-[9px] uppercase tracking-[0.13em] text-slate-600"><tr><th className="w-12 px-4 py-3">{data.canManage ? <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Chọn tất cả Module đang hiển thị" /> : null}</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Phân hệ/Nhóm</th><th className="px-4 py-3">Phòng ban</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                      <tbody>{filteredModules.map((row) => <tr key={row.id} className="border-t border-white/[0.045] hover:bg-white/[0.02]"><td className="px-4 py-3">{data.canManage ? <input type="checkbox" checked={selectedModules.includes(row.id)} onChange={(event) => toggleSelected(row.id, event.target.checked)} aria-label={`Chọn ${row.name}`} /> : null}</td><td className="px-4 py-3 font-mono text-[10px] text-violet-300/65">{row.code || "—"}</td><td className="max-w-[280px] px-4 py-3"><div className="truncate font-medium text-slate-300" title={row.name}>{row.name}</div>{row.classification ? <div className="mt-1 truncate text-[9px] text-slate-700">{row.classification}</div> : null}</td><td className="max-w-[200px] truncate px-4 py-3 text-slate-500" title={row.parentName ?? ""}>{row.parentName || "—"}</td><td className="max-w-[180px] truncate px-4 py-3 text-slate-500" title={row.ownerDepartmentName ?? ""}>{row.ownerDepartmentName || "—"}</td><td className="px-4 py-3 text-[10px] text-slate-500">{row.moduleStatusLabel || "—"}</td><td className="px-4 py-3 text-right">{data.canManage ? <button onClick={() => editModule(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 hover:bg-white/[0.04] hover:text-violet-200"><Pencil className="size-3" /> Sửa</button> : null}</td></tr>)}</tbody>
                    </table>
                    {!filteredModules.length ? <div className="p-12 text-center text-xs text-slate-600">Chưa có Module phù hợp.</div> : null}
                  </div>
                )}
              </div>

              <aside className="self-start rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-4 md:p-5">
                {data.canManage ? (
                  tab === "departments" ? <>
                    <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-300/60">Department Catalog</div><div className="mt-1 text-sm font-semibold text-slate-200">{departmentDraft.id ? "Cập nhật phòng ban" : "Thêm phòng ban"}</div></div>{activeDraft ? <button onClick={() => resetDraft()} className="text-[10px] text-slate-600 hover:text-white">Tạo mới</button> : <Plus className="size-4 text-cyan-300/60" />}</div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                      <Field label="Mã phòng ban"><input value={departmentDraft.code} onChange={(e) => setDepartmentDraft((c) => ({ ...c, code: e.target.value }))} className={fieldClass} placeholder="VD: P.ĐT" /></Field>
                      <Field label="Tên phòng ban" required error={fieldErrors.name}><input value={departmentDraft.name} onChange={(e) => setDepartmentDraft((c) => ({ ...c, name: e.target.value }))} className={fieldClass} placeholder="Phòng Đào tạo" /></Field>
                      <label className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3 text-xs text-slate-400"><input type="checkbox" checked={departmentDraft.isActive} onChange={(e) => setDepartmentDraft((c) => ({ ...c, isActive: e.target.checked }))} /> Đang sử dụng</label>
                    </div>
                    <button disabled={saving} onClick={() => void saveDepartment()} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{departmentDraft.id ? "Lưu thay đổi" : "Thêm phòng ban"}</button>
                  </> : <>
                    <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-300/60">PLHĐ Module Catalog</div><div className="mt-1 text-sm font-semibold text-slate-200">{moduleDraft.id ? "Cập nhật Module" : "Thêm Module"}</div></div>{activeDraft ? <button onClick={() => resetDraft()} className="text-[10px] text-slate-600 hover:text-white">Tạo mới</button> : <Plus className="size-4 text-violet-300/60" />}</div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="grid gap-3 sm:grid-cols-2"><Field label="Mã Module"><input value={moduleDraft.code} onChange={(e) => setModuleDraft((c) => ({ ...c, code: e.target.value }))} className={fieldClass} placeholder="MOD-01" /></Field><Field label="Thứ tự"><input type="number" value={moduleDraft.sortOrder} onChange={(e) => setModuleDraft((c) => ({ ...c, sortOrder: e.target.value }))} className={fieldClass} /></Field></div>
                      <Field label="Tên Module" required error={fieldErrors.name}><input value={moduleDraft.name} onChange={(e) => setModuleDraft((c) => ({ ...c, name: e.target.value }))} className={fieldClass} placeholder="Tên Module PLHĐ" /></Field>
                      <Field label="Phân hệ / Nhóm cha" error={fieldErrors.parentId}><ThemedSelect ariaLabel="Phân hệ / Nhóm cha" value={moduleDraft.parentId} onChange={(value) => setModuleDraft((c) => ({ ...c, parentId: value }))} options={[{ value: "", label: "Không gán cấp cha" }, ...data.parentOptions]} placeholder="Không gán" /></Field>
                      <Field label="Phòng ban phụ trách" error={fieldErrors.ownerDepartmentId}><ThemedSelect ariaLabel="Phòng ban phụ trách" value={moduleDraft.ownerDepartmentId} onChange={(value) => setModuleDraft((c) => ({ ...c, ownerDepartmentId: value }))} options={[{ value: "", label: "Chưa gán phòng ban" }, ...data.departments.filter((row) => row.isActive).map((row) => ({ value: row.id, label: `${row.code ? `${row.code} • ` : ""}${row.name}` }))]} placeholder="Chưa gán" /></Field>
                      <Field label="Trạng thái Module"><ThemedSelect ariaLabel="Trạng thái Module" value={moduleDraft.moduleStatusCode} onChange={(value) => setModuleDraft((c) => ({ ...c, moduleStatusCode: value }))} options={[{ value: "", label: "Chưa cập nhật" }, ...data.moduleStatusOptions]} placeholder="Chưa cập nhật" /></Field>
                      <Field label="Phân loại"><input value={moduleDraft.classification} onChange={(e) => setModuleDraft((c) => ({ ...c, classification: e.target.value }))} className={fieldClass} placeholder="Nhóm nghiệp vụ / phân loại..." /></Field>
                    </div>
                    <button disabled={saving} onClick={() => void saveModule()} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-200 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{moduleDraft.id ? "Lưu thay đổi" : "Thêm Module"}</button>
                  </>
                ) : (
                  <div className="rounded-xl border border-amber-300/12 bg-amber-300/[0.04] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldCheck className="size-4" /> Chế độ chỉ xem</div><p className="mt-2 text-[10px] leading-5 text-amber-100/50">Role {data.role} được xem danh mục. Chỉ MASTER/Admin/PM mới được thêm, chỉnh sửa hoặc xóa Phòng ban và Module của Project.</p></div>
                )}
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ProjectMasterDataButton({ defaultTab, label, className }: { defaultTab: ProjectCatalogTab; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("flex h-9 items-center gap-2 rounded-xl border border-cyan-300/12 bg-cyan-300/[0.045] px-3 text-[10px] font-medium text-cyan-100/75 transition hover:bg-cyan-300/[0.08]", className)}>
        {defaultTab === "departments" ? <Building2 className="size-3.5" /> : <DatabaseZap className="size-3.5" />}
        {label ?? (defaultTab === "departments" ? "Danh mục Phòng ban" : "Danh mục Module")}
      </button>
      {open ? <CatalogModal initialTab={defaultTab} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
