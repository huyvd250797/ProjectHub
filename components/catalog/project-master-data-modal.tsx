"use client";

import {
  Building2,
  Check,
  DatabaseZap,
  Download,
  FileText,
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
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/project-context";
import { ProjectQuickImportButton } from "@/components/catalog/quick-import-modal";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  ProjectCatalogData,
  ProjectCatalogDepartment,
  ProjectCatalogDetail,
  ProjectCatalogModule,
  ProjectCatalogMutationResponse,
  ProjectCatalogResponse,
  ProjectCatalogTab,
} from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

const fieldClass = "h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25";
const areaClass = "min-h-24 w-full resize-y rounded-xl border border-white/[0.08] bg-black/10 px-3 py-2.5 text-xs leading-5 text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25";

type DepartmentDraft = { id: string; code: string; name: string; isActive: boolean };
type ModuleDraft = {
  id: string;
  code: string;
  name: string;
  itemType: "root" | "subsystem" | "module";
  parentId: string;
  ownerDepartmentId: string;
  moduleStatusCode: string;
  classification: string;
  sortOrder: string;
};
type DetailDraft = {
  id: string;
  code: string;
  name: string;
  nodeType: string;
  parentId: string;
  contractItemId: string;
  level: string;
  sortOrder: string;
  note: string;
};

const emptyDepartment: DepartmentDraft = { id: "", code: "", name: "", isActive: true };
const emptyModule: ModuleDraft = { id: "", code: "", name: "", itemType: "module", parentId: "", ownerDepartmentId: "", moduleStatusCode: "", classification: "", sortOrder: "0" };
const emptyDetail: DetailDraft = { id: "", code: "", name: "", nodeType: "other", parentId: "", contractItemId: "", level: "3", sortOrder: "0", note: "" };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi").trim();
}

function itemTypeLabel(value: ProjectCatalogModule["itemType"]) {
  if (value === "root") return "Nhóm";
  if (value === "subsystem") return "Phân hệ";
  return "Module";
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
  const [detailDraft, setDetailDraft] = useState<DetailDraft>(emptyDetail);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);

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
    const rows = data?.departments ?? [];
    return q ? rows.filter((row) => normalize(`${row.code ?? ""} ${row.name}`).includes(q)) : rows;
  }, [data?.departments, search]);

  const filteredModules = useMemo(() => {
    const q = normalize(search);
    const rows = data?.modules ?? [];
    return q ? rows.filter((row) => normalize(`${row.code ?? ""} ${row.name} ${row.parentName ?? ""} ${row.ownerDepartmentName ?? ""} ${row.itemType}`).includes(q)) : rows;
  }, [data?.modules, search]);

  const filteredDetails = useMemo(() => {
    const q = normalize(search);
    const rows = data?.details ?? [];
    return q ? rows.filter((row) => normalize(`${row.code ?? ""} ${row.content} ${row.contractItemName ?? ""} ${row.parentContent ?? ""} ${row.note ?? ""}`).includes(q)) : rows;
  }, [data?.details, search]);

  function resetDraft(nextTab = tab) {
    setFieldErrors({});
    setMessage(null);
    if (nextTab === "departments") setDepartmentDraft(emptyDepartment);
    else if (nextTab === "modules") setModuleDraft(emptyModule);
    else setDetailDraft(emptyDetail);
  }

  function switchTab(nextTab: ProjectCatalogTab) {
    setTab(nextTab);
    setSearch("");
    resetDraft(nextTab);
  }

  function visibleIds() {
    if (tab === "departments") return filteredDepartments.map((row) => row.id);
    if (tab === "modules") return filteredModules.map((row) => row.id);
    return filteredDetails.map((row) => row.id);
  }

  function selectedIds() {
    if (tab === "departments") return selectedDepartments;
    if (tab === "modules") return selectedModules;
    return selectedDetails;
  }

  function setSelected(ids: string[]) {
    if (tab === "departments") setSelectedDepartments(ids);
    else if (tab === "modules") setSelectedModules(ids);
    else setSelectedDetails(ids);
  }

  function toggleSelected(id: string, checked: boolean) {
    const current = selectedIds();
    setSelected(checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  function toggleAllVisible(checked: boolean) {
    const ids = visibleIds();
    const current = selectedIds();
    setSelected(checked ? [...new Set([...current, ...ids])] : current.filter((item) => !ids.includes(item)));
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
      itemType: row.itemType,
      parentId: row.parentId ?? "",
      ownerDepartmentId: row.ownerDepartmentId ?? "",
      moduleStatusCode: row.moduleStatusCode ?? "",
      classification: row.classification ?? "",
      sortOrder: String(row.sortOrder ?? 0),
    });
    setFieldErrors({}); setMessage(null);
  }

  function editDetail(row: ProjectCatalogDetail) {
    setTab("details");
    setDetailDraft({
      id: row.id,
      code: row.code ?? "",
      name: row.content,
      nodeType: row.nodeType ?? "other",
      parentId: row.parentId ?? "",
      contractItemId: row.contractItemId ?? "",
      level: String(row.level ?? 3),
      sortOrder: String(row.sortOrder ?? 0),
      note: row.note ?? "",
    });
    setFieldErrors({}); setMessage(null);
  }

  async function saveDepartment() {
    if (!data?.canManage || saving) return;
    const errors: Record<string, string> = {};
    if (!departmentDraft.name.trim()) errors.name = "Tên phòng ban là bắt buộc.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setMessage({ type: "error", text: "Vui lòng kiểm tra các trường được đánh dấu." }); return; }
    await saveCatalog(departmentDraft.id ? "PATCH" : "POST", { entity: "department", ...departmentDraft }, "Không lưu được phòng ban.");
    if (!departmentDraft.id) setDepartmentDraft(emptyDepartment);
  }

  async function saveModule() {
    if (!data?.canManage || saving) return;
    const errors: Record<string, string> = {};
    if (!moduleDraft.name.trim()) errors.name = "Tên PLHĐ là bắt buộc.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setMessage({ type: "error", text: "Vui lòng kiểm tra các trường được đánh dấu." }); return; }
    await saveCatalog(moduleDraft.id ? "PATCH" : "POST", { entity: "module", ...moduleDraft }, "Không lưu được PLHĐ.");
    if (!moduleDraft.id) setModuleDraft(emptyModule);
  }

  async function saveDetail() {
    if (!data?.canManage || saving) return;
    const errors: Record<string, string> = {};
    if (!detailDraft.name.trim()) errors.name = "Nội dung chi tiết là bắt buộc.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setMessage({ type: "error", text: "Vui lòng kiểm tra các trường được đánh dấu." }); return; }
    await saveCatalog(detailDraft.id ? "PATCH" : "POST", { entity: "detail", ...detailDraft }, "Không lưu được chi tiết PLHĐ.");
    if (!detailDraft.id) setDetailDraft(emptyDetail);
  }

  async function saveCatalog(method: "POST" | "PATCH", payload: Record<string, unknown>, fallback: string) {
    setSaving(true); setFieldErrors({}); setMessage(null);
    try {
      const response = await fetch("/api/project-catalog", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, ...payload }),
      });
      const body = (await response.json()) as ProjectCatalogMutationResponse;
      if (!body.ok) { setFieldErrors(body.fieldErrors ?? {}); throw new Error(body.message); }
      await load(true);
      setMessage({ type: "ok", text: body.message });
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: payload.entity } }));
    } catch (reason) {
      setMessage({ type: "error", text: reason instanceof Error ? reason.message : fallback });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!data?.canManage || saving) return;
    const ids = selectedIds();
    if (!ids.length) return;
    const label = tab === "departments" ? "phòng ban" : tab === "modules" ? "PLHĐ" : "chi tiết PLHĐ";
    if (!window.confirm(`Xóa thật ${ids.length} ${label} đã chọn? Dữ liệu đang được sử dụng sẽ được giữ lại.`)) return;
    setSaving(true); setFieldErrors({}); setMessage(null);
    try {
      const response = await fetch("/api/project-catalog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id, entity: tab === "departments" ? "department" : tab === "modules" ? "module" : "detail", ids }),
      });
      const body = (await response.json()) as ProjectCatalogMutationResponse;
      if (!body.ok) throw new Error(body.message);
      if (tab === "departments") setSelectedDepartments([]);
      else if (tab === "modules") setSelectedModules([]);
      else setSelectedDetails([]);
      await load(true);
      setMessage({ type: body.blockedCount ? "error" : "ok", text: body.message });
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: tab } }));
    } catch (reason) {
      setMessage({ type: "error", text: reason instanceof Error ? reason.message : "Không xóa được dữ liệu." });
    } finally { setSaving(false); }
  }

  const activeDraft = tab === "departments" ? departmentDraft.id : tab === "modules" ? moduleDraft.id : detailDraft.id;
  const visible = visibleIds();
  const selected = selectedIds();
  const allVisibleSelected = visible.length > 0 && visible.every((id) => selected.includes(id));

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-3 md:p-6">
      <button type="button" aria-label="Đóng danh mục Project" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <section className="relative flex h-[min(90dvh,920px)] w-full max-w-[1340px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#081421] shadow-[0_28px_100px_rgba(0,0,0,.55)]">
        <header className="flex items-start gap-4 border-b border-white/[0.06] px-5 py-4 md:px-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.05]"><Settings2 className="size-4.5 text-cyan-200/80" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">Project Master Data • V1.9.2</div>
            <h2 className="mt-1 text-lg font-semibold text-white">Danh mục {selectedProject.code} • {selectedProject.name}</h2>
            <p className="mt-1 text-[10px] text-slate-500">Danh mục là nguồn chuẩn cho PLHĐ. Dữ liệu có trong danh mục mới được hiển thị ra lưới PLHĐ bên ngoài.</p>
          </div>
          <a href="/templates/ASC-WORKING-V1.3.2-Mau-Import-PhongBan-PLHD.xlsx" className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 text-[10px] font-medium text-slate-400 transition hover:border-cyan-300/15 hover:text-cyan-100 sm:flex" title="Tải mẫu Excel trước khi nhập dữ liệu"><Download className="size-3.5" /> Tải mẫu Excel</a>
          {data?.canManage ? <ProjectQuickImportButton label={tab === "departments" ? "Import Phòng ban" : "Import PLHĐ / Chi tiết"} initialSections={tab === "departments" ? ["departments"] : ["contractItems", "contractDetails"]} onApplied={() => void load()} /> : null}
          <button type="button" onClick={() => void load()} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-cyan-200" title="Tải lại"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3 md:px-6">
          <TabButton active={tab === "departments"} icon={<Building2 className="size-3.5" />} label="Phòng ban" count={data?.departments.length ?? 0} onClick={() => switchTab("departments")} />
          <TabButton active={tab === "modules"} icon={<Layers3 className="size-3.5" />} label="PLHĐ" count={data?.modules.length ?? 0} onClick={() => switchTab("modules")} />
          <TabButton active={tab === "details"} icon={<FileText className="size-3.5" />} label="Chi tiết PLHĐ" count={data?.details.length ?? 0} onClick={() => switchTab("details")} />
          <div className="relative ml-auto w-full sm:w-[340px]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "departments" ? "Tìm mã, tên phòng ban..." : tab === "modules" ? "Tìm PLHĐ, phân hệ, module..." : "Tìm chi tiết PLHĐ, module liên kết..."} className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/20" />
          </div>
          {data?.canManage ? <button type="button" disabled={!selected.length || saving} onClick={() => void deleteSelected()} className="flex h-9 items-center gap-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.055] px-3 text-[10px] font-medium text-rose-100 disabled:cursor-not-allowed disabled:opacity-35"><Trash2 className="size-3.5" /> Xóa đã chọn {selected.length ? `(${selected.length})` : ""}</button> : null}
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5 md:p-6">
          {loading && !data ? <div className="grid min-h-[420px] place-items-center text-center"><div><LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300/70" /><div className="mt-3 text-xs text-slate-500">Đang tải danh mục Project...</div></div></div> : null}
          {message ? <div className={cn("mb-4 rounded-xl border px-4 py-3 text-xs", message.type === "ok" ? "border-emerald-300/12 bg-emerald-300/[0.045] text-emerald-100/80" : "border-rose-300/15 bg-rose-300/[0.05] text-rose-100/85")}>{message.text}</div> : null}
          {data ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.012]">
                {tab === "departments" ? (
                  <DepartmentTable rows={filteredDepartments} canManage={data.canManage} allVisibleSelected={allVisibleSelected} selected={selectedDepartments} onAll={toggleAllVisible} onSelect={toggleSelected} onEdit={editDepartment} />
                ) : tab === "modules" ? (
                  <ModuleTable rows={filteredModules} canManage={data.canManage} allVisibleSelected={allVisibleSelected} selected={selectedModules} onAll={toggleAllVisible} onSelect={toggleSelected} onEdit={editModule} />
                ) : (
                  <DetailTable rows={filteredDetails} canManage={data.canManage} allVisibleSelected={allVisibleSelected} selected={selectedDetails} onAll={toggleAllVisible} onSelect={toggleSelected} onEdit={editDetail} />
                )}
              </div>

              <aside className="self-start rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-4 md:p-5">
                {data.canManage ? (
                  tab === "departments" ? (
                    <DepartmentForm draft={departmentDraft} active={Boolean(activeDraft)} fieldErrors={fieldErrors} saving={saving} onDraft={setDepartmentDraft} onReset={() => resetDraft()} onSave={() => void saveDepartment()} />
                  ) : tab === "modules" ? (
                    <ModuleForm data={data} draft={moduleDraft} active={Boolean(activeDraft)} fieldErrors={fieldErrors} saving={saving} onDraft={setModuleDraft} onReset={() => resetDraft()} onSave={() => void saveModule()} />
                  ) : (
                    <DetailForm data={data} draft={detailDraft} active={Boolean(activeDraft)} fieldErrors={fieldErrors} saving={saving} onDraft={setDetailDraft} onReset={() => resetDraft()} onSave={() => void saveDetail()} />
                  )
                ) : (
                  <div className="rounded-xl border border-amber-300/12 bg-amber-300/[0.04] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldCheck className="size-4" /> Chế độ chỉ xem</div><p className="mt-2 text-[10px] leading-5 text-amber-100/50">Role {data.role} được xem danh mục. Chỉ MASTER/Admin/PM mới được thêm, chỉnh sửa hoặc xóa dữ liệu Project.</p></div>
                )}
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TabButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium", active ? "bg-cyan-300/[0.09] text-cyan-100" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300")}>{icon} {label} <span className="text-[9px] opacity-60">{count}</span></button>;
}

function HeaderCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} />;
}

function DepartmentTable({ rows, canManage, allVisibleSelected, selected, onAll, onSelect, onEdit }: { rows: ProjectCatalogDepartment[]; canManage: boolean; allVisibleSelected: boolean; selected: string[]; onAll: (checked: boolean) => void; onSelect: (id: string, checked: boolean) => void; onEdit: (row: ProjectCatalogDepartment) => void }) {
  return (
    <div className="max-h-[600px] overflow-auto scrollbar-thin">
      <table className="w-full min-w-[650px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[#0b192a]/95 text-[9px] uppercase tracking-[0.13em] text-slate-600"><tr><th className="w-12 px-4 py-3">{canManage ? <HeaderCheckbox checked={allVisibleSelected} onChange={onAll} label="Chọn tất cả phòng ban đang hiển thị" /> : null}</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên phòng ban</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/[0.045] hover:bg-white/[0.02]"><td className="px-4 py-3">{canManage ? <input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => onSelect(row.id, event.target.checked)} aria-label={`Chọn ${row.name}`} /> : null}</td><td className="px-4 py-3 font-mono text-[10px] text-cyan-300/60">{row.code || "-"}</td><td className="px-4 py-3 font-medium text-slate-300">{row.name}</td><td className="px-4 py-3"><span className={cn("rounded-lg border px-2 py-1 text-[9px]", row.isActive ? "border-emerald-300/12 bg-emerald-300/[0.04] text-emerald-200/70" : "border-white/[0.06] text-slate-600")}>{row.isActive ? "Đang dùng" : "Ngừng dùng"}</span></td><td className="px-4 py-3 text-right">{canManage ? <button onClick={() => onEdit(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 hover:bg-white/[0.04] hover:text-cyan-200"><Pencil className="size-3" /> Sửa</button> : null}</td></tr>)}</tbody>
      </table>
      {!rows.length ? <div className="p-12 text-center text-xs text-slate-600">Chưa có phòng ban phù hợp.</div> : null}
    </div>
  );
}

function ModuleTable({ rows, canManage, allVisibleSelected, selected, onAll, onSelect, onEdit }: { rows: ProjectCatalogModule[]; canManage: boolean; allVisibleSelected: boolean; selected: string[]; onAll: (checked: boolean) => void; onSelect: (id: string, checked: boolean) => void; onEdit: (row: ProjectCatalogModule) => void }) {
  return (
    <div className="max-h-[600px] overflow-auto scrollbar-thin">
      <table className="w-full min-w-[960px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[#0b192a]/95 text-[9px] uppercase tracking-[0.13em] text-slate-600"><tr><th className="w-12 px-4 py-3">{canManage ? <HeaderCheckbox checked={allVisibleSelected} onChange={onAll} label="Chọn tất cả PLHĐ đang hiển thị" /> : null}</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên PLHĐ</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">Cha</th><th className="px-4 py-3">Phòng ban</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/[0.045] hover:bg-white/[0.02]"><td className="px-4 py-3">{canManage ? <input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => onSelect(row.id, event.target.checked)} aria-label={`Chọn ${row.name}`} /> : null}</td><td className="px-4 py-3 font-mono text-[10px] text-violet-300/65">{row.code || "-"}</td><td className="max-w-[280px] px-4 py-3"><div className="truncate font-medium text-slate-300" title={row.name}>{row.name}</div>{row.classification ? <div className="mt-1 truncate text-[9px] text-slate-700">{row.classification}</div> : null}</td><td className="px-4 py-3"><span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-500">{itemTypeLabel(row.itemType)}</span></td><td className="max-w-[200px] truncate px-4 py-3 text-slate-500" title={row.parentName ?? ""}>{row.parentName || "-"}</td><td className="max-w-[180px] truncate px-4 py-3 text-slate-500" title={row.ownerDepartmentName ?? ""}>{row.ownerDepartmentName || "-"}</td><td className="px-4 py-3 text-[10px] text-slate-500">{row.moduleStatusLabel || "-"}</td><td className="px-4 py-3 text-right">{canManage ? <button onClick={() => onEdit(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 hover:bg-white/[0.04] hover:text-violet-200"><Pencil className="size-3" /> Sửa</button> : null}</td></tr>)}</tbody>
      </table>
      {!rows.length ? <div className="p-12 text-center text-xs text-slate-600">Chưa có PLHĐ phù hợp.</div> : null}
    </div>
  );
}

function DetailTable({ rows, canManage, allVisibleSelected, selected, onAll, onSelect, onEdit }: { rows: ProjectCatalogDetail[]; canManage: boolean; allVisibleSelected: boolean; selected: string[]; onAll: (checked: boolean) => void; onSelect: (id: string, checked: boolean) => void; onEdit: (row: ProjectCatalogDetail) => void }) {
  return (
    <div className="max-h-[600px] overflow-auto scrollbar-thin">
      <table className="w-full min-w-[960px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[#0b192a]/95 text-[9px] uppercase tracking-[0.13em] text-slate-600"><tr><th className="w-12 px-4 py-3">{canManage ? <HeaderCheckbox checked={allVisibleSelected} onChange={onAll} label="Chọn tất cả chi tiết PLHĐ đang hiển thị" /> : null}</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">PLHĐ liên kết</th><th className="px-4 py-3">Chi tiết cha</th><th className="px-4 py-3">Cấp</th><th className="px-4 py-3">Loại node</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/[0.045] hover:bg-white/[0.02]"><td className="px-4 py-3">{canManage ? <input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => onSelect(row.id, event.target.checked)} aria-label={`Chọn ${row.content}`} /> : null}</td><td className="px-4 py-3 font-mono text-[10px] text-cyan-300/65">{row.code || "-"}</td><td className="max-w-[360px] px-4 py-3"><div className="truncate font-medium text-slate-300" title={row.content}>{row.content}</div>{row.note ? <div className="mt-1 truncate text-[9px] text-slate-700">{row.note}</div> : null}</td><td className="max-w-[220px] truncate px-4 py-3 text-slate-500" title={row.contractItemName ?? ""}>{row.contractItemName || "-"}</td><td className="max-w-[220px] truncate px-4 py-3 text-slate-500" title={row.parentContent ?? ""}>{row.parentContent || "-"}</td><td className="px-4 py-3 text-slate-500">{row.level}</td><td className="px-4 py-3 text-slate-500">{row.nodeType || "-"}</td><td className="px-4 py-3 text-right">{canManage ? <button onClick={() => onEdit(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 hover:bg-white/[0.04] hover:text-cyan-200"><Pencil className="size-3" /> Sửa</button> : null}</td></tr>)}</tbody>
      </table>
      {!rows.length ? <div className="p-12 text-center text-xs text-slate-600">Chưa có chi tiết PLHĐ phù hợp.</div> : null}
    </div>
  );
}

function DepartmentForm({ draft, active, fieldErrors, saving, onDraft, onReset, onSave }: { draft: DepartmentDraft; active: boolean; fieldErrors: Record<string, string>; saving: boolean; onDraft: React.Dispatch<React.SetStateAction<DepartmentDraft>>; onReset: () => void; onSave: () => void }) {
  return <><FormHeader eyebrow="Department Catalog" title={active ? "Cập nhật phòng ban" : "Thêm phòng ban"} active={active} onReset={onReset} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Field label="Mã phòng ban"><input value={draft.code} onChange={(e) => onDraft((c) => ({ ...c, code: e.target.value }))} className={fieldClass} placeholder="VD: P.ĐT" /></Field><Field label="Tên phòng ban" required error={fieldErrors.name}><input value={draft.name} onChange={(e) => onDraft((c) => ({ ...c, name: e.target.value }))} className={fieldClass} placeholder="Phòng Đào tạo" /></Field><label className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3 text-xs text-slate-400"><input type="checkbox" checked={draft.isActive} onChange={(e) => onDraft((c) => ({ ...c, isActive: e.target.checked }))} /> Đang sử dụng</label></div><SaveButton saving={saving} label={active ? "Lưu thay đổi" : "Thêm phòng ban"} onClick={onSave} /></>;
}

function ModuleForm({ data, draft, active, fieldErrors, saving, onDraft, onReset, onSave }: { data: ProjectCatalogData; draft: ModuleDraft; active: boolean; fieldErrors: Record<string, string>; saving: boolean; onDraft: React.Dispatch<React.SetStateAction<ModuleDraft>>; onReset: () => void; onSave: () => void }) {
  return <><FormHeader eyebrow="PLHĐ Catalog" title={active ? "Cập nhật PLHĐ" : "Thêm PLHĐ"} active={active} onReset={onReset} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><div className="grid gap-3 sm:grid-cols-2"><Field label="Mã PLHĐ"><input value={draft.code} onChange={(e) => onDraft((c) => ({ ...c, code: e.target.value }))} className={fieldClass} placeholder="A / 1 / MOD-01" /></Field><Field label="Thứ tự"><input type="number" value={draft.sortOrder} onChange={(e) => onDraft((c) => ({ ...c, sortOrder: e.target.value }))} className={fieldClass} /></Field></div><Field label="Tên PLHĐ" required error={fieldErrors.name}><input value={draft.name} onChange={(e) => onDraft((c) => ({ ...c, name: e.target.value }))} className={fieldClass} placeholder="Tên phân hệ / module" /></Field><Field label="Loại PLHĐ"><ThemedSelect ariaLabel="Loại PLHĐ" value={draft.itemType} onChange={(value) => onDraft((c) => ({ ...c, itemType: value === "root" || value === "subsystem" || value === "module" ? value : "module" }))} options={[{ value: "root", label: "Nhóm" }, { value: "subsystem", label: "Phân hệ" }, { value: "module", label: "Module" }]} /></Field><Field label="Phân hệ / Nhóm cha" error={fieldErrors.parentId}><ThemedSelect ariaLabel="Phân hệ / Nhóm cha" value={draft.parentId} onChange={(value) => onDraft((c) => ({ ...c, parentId: value }))} options={[{ value: "", label: "Không gán cấp cha" }, ...data.parentOptions.filter((item) => item.value !== draft.id)]} placeholder="Không gán" /></Field><Field label="Phòng ban phụ trách" error={fieldErrors.ownerDepartmentId}><ThemedSelect ariaLabel="Phòng ban phụ trách" value={draft.ownerDepartmentId} onChange={(value) => onDraft((c) => ({ ...c, ownerDepartmentId: value }))} options={[{ value: "", label: "Chưa gán phòng ban" }, ...data.departments.filter((row) => row.isActive).map((row) => ({ value: row.id, label: `${row.code ? `${row.code} • ` : ""}${row.name}` }))]} placeholder="Chưa gán" /></Field><Field label="Trạng thái Module"><ThemedSelect ariaLabel="Trạng thái Module" value={draft.moduleStatusCode} onChange={(value) => onDraft((c) => ({ ...c, moduleStatusCode: value }))} options={[{ value: "", label: "Chưa cập nhật" }, ...data.moduleStatusOptions]} placeholder="Chưa cập nhật" /></Field><Field label="Phân loại"><input value={draft.classification} onChange={(e) => onDraft((c) => ({ ...c, classification: e.target.value }))} className={fieldClass} placeholder="Nhóm nghiệp vụ / phân loại..." /></Field></div><SaveButton saving={saving} label={active ? "Lưu thay đổi" : "Thêm PLHĐ"} onClick={onSave} /></>;
}

function DetailForm({ data, draft, active, fieldErrors, saving, onDraft, onReset, onSave }: { data: ProjectCatalogData; draft: DetailDraft; active: boolean; fieldErrors: Record<string, string>; saving: boolean; onDraft: React.Dispatch<React.SetStateAction<DetailDraft>>; onReset: () => void; onSave: () => void }) {
  return <><FormHeader eyebrow="PLHĐ Detail Catalog" title={active ? "Cập nhật chi tiết PLHĐ" : "Thêm chi tiết PLHĐ"} active={active} onReset={onReset} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><div className="grid gap-3 sm:grid-cols-3"><Field label="Mã"><input value={draft.code} onChange={(e) => onDraft((c) => ({ ...c, code: e.target.value }))} className={fieldClass} placeholder="1.1" /></Field><Field label="Cấp"><input type="number" value={draft.level} onChange={(e) => onDraft((c) => ({ ...c, level: e.target.value }))} className={fieldClass} /></Field><Field label="Thứ tự"><input type="number" value={draft.sortOrder} onChange={(e) => onDraft((c) => ({ ...c, sortOrder: e.target.value }))} className={fieldClass} /></Field></div><Field label="Nội dung chi tiết" required error={fieldErrors.name}><textarea value={draft.name} onChange={(e) => onDraft((c) => ({ ...c, name: e.target.value }))} className={areaClass} placeholder="Nội dung chi tiết phụ lục hợp đồng" /></Field><Field label="PLHĐ liên kết" error={fieldErrors.contractItemId}><ThemedSelect ariaLabel="PLHĐ liên kết" value={draft.contractItemId} onChange={(value) => onDraft((c) => ({ ...c, contractItemId: value }))} options={[{ value: "", label: "Chưa gán PLHĐ" }, ...data.contractItemOptions]} placeholder="Chưa gán" menuClassName="min-w-[360px]" /></Field><Field label="Chi tiết cha" error={fieldErrors.parentId}><ThemedSelect ariaLabel="Chi tiết cha" value={draft.parentId} onChange={(value) => onDraft((c) => ({ ...c, parentId: value }))} options={[{ value: "", label: "Không gán chi tiết cha" }, ...data.detailParentOptions.filter((item) => item.value !== draft.id)]} placeholder="Không gán" menuClassName="min-w-[360px]" /></Field><Field label="Loại node"><input value={draft.nodeType} onChange={(e) => onDraft((c) => ({ ...c, nodeType: e.target.value }))} className={fieldClass} placeholder="other / section / detail" /></Field><Field label="Ghi chú"><textarea value={draft.note} onChange={(e) => onDraft((c) => ({ ...c, note: e.target.value }))} className={areaClass} placeholder="Ghi chú nội bộ..." /></Field></div><SaveButton saving={saving} label={active ? "Lưu thay đổi" : "Thêm chi tiết"} onClick={onSave} /></>;
}

function FormHeader({ eyebrow, title, active, onReset }: { eyebrow: string; title: string; active: boolean; onReset: () => void }) {
  return <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-300/60">{eyebrow}</div><div className="mt-1 text-sm font-semibold text-slate-200">{title}</div></div>{active ? <button onClick={onReset} className="text-[10px] text-slate-600 hover:text-white">Tạo mới</button> : <Plus className="size-4 text-cyan-300/60" />}</div>;
}

function SaveButton({ saving, label, onClick }: { saving: boolean; label: string; onClick: () => void }) {
  return <button disabled={saving} onClick={onClick} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{label}</button>;
}

export function ProjectMasterDataButton({ defaultTab, label, className }: { defaultTab: ProjectCatalogTab; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("flex h-9 items-center gap-2 rounded-xl border border-cyan-300/12 bg-cyan-300/[0.045] px-3 text-[10px] font-medium text-cyan-100/75 transition hover:bg-cyan-300/[0.08]", className)}>
        {defaultTab === "departments" ? <Building2 className="size-3.5" /> : defaultTab === "details" ? <FileText className="size-3.5" /> : <DatabaseZap className="size-3.5" />}
        {label ?? (defaultTab === "departments" ? "Danh mục Phòng ban" : defaultTab === "details" ? "Danh mục chi tiết PLHĐ" : "Danh mục PLHĐ")}
      </button>
      {open ? <CatalogModal initialTab={defaultTab} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
