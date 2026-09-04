"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/components/project-context";
import type {
  QuickCatalogImportApplyResponse,
  QuickCatalogImportPreviewResponse,
  QuickCatalogImportSection,
} from "@/lib/catalog/quick-import-types";
import { cn } from "@/lib/utils";

const sectionOptions: Array<{ key: QuickCatalogImportSection; label: string; description: string }> = [
  { key: "departments", label: "Phòng ban", description: "Sheet Phòng ban • cột A có thể chỉ cần tên." },
  { key: "contractItems", label: "PLHĐ / Module", description: "Sheet PLHĐ • hỗ trợ file một cột như mẫu hiện tại." },
  { key: "contractDetails", label: "Chức năng", description: "Sheet PLHĐ chi tiết • Mã + Nội dung; tự dựng cây Chức năng và mapping Module." },
];

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function SectionCheckbox({
  item,
  checked,
  disabled,
  onChange,
}: {
  item: (typeof sectionOptions)[number];
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn(
      "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
      checked ? "border-cyan-300/18 bg-cyan-300/[0.05]" : "border-white/[0.06] bg-white/[0.015]",
      disabled && "cursor-not-allowed opacity-45",
    )}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate-200">{item.label}</span>
        <span className="mt-1 block text-[10px] leading-4 text-slate-600">{item.description}</span>
      </span>
    </label>
  );
}

function normalizedInitialSections(initialSections?: QuickCatalogImportSection[]) {
  const next = new Set<QuickCatalogImportSection>(initialSections?.length ? initialSections : ["departments", "contractItems", "contractDetails"]);
  if (next.has("contractDetails")) next.add("contractItems");
  return sectionOptions.map((item) => item.key).filter((item) => next.has(item));
}

export function QuickCatalogImportModal({
  onClose,
  onApplied,
  initialSections,
}: {
  onClose: () => void;
  onApplied?: () => void;
  initialSections?: QuickCatalogImportSection[];
}) {
  const { selectedProject } = useProject();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<QuickCatalogImportSection[]>(() => normalizedInitialSections(initialSections));
  const [preview, setPreview] = useState<QuickCatalogImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [applied, setApplied] = useState<QuickCatalogImportApplyResponse | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !applying) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [applying, onClose]);

  const sectionString = useMemo(() => sections.join(","), [sections]);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      setError("Chỉ hỗ trợ file Excel .xlsx.");
      setFile(null);
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError("File vượt quá giới hạn 20 MB.");
      setFile(null);
      return;
    }
    setFile(nextFile);
    setPreview(null);
    setApplied(null);
    setError("");
    setConfirmCode("");
  }

  function toggleSection(key: QuickCatalogImportSection, checked: boolean) {
    setSections((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      if (key === "contractItems" && !checked) next.delete("contractDetails");
      if (key === "contractDetails" && checked) next.add("contractItems");
      return sectionOptions.map((item) => item.key).filter((item) => next.has(item));
    });
    setPreview(null);
    setApplied(null);
  }

  async function runPreview() {
    if (!file || !sections.length || loading) return;
    setLoading(true);
    setError("");
    setPreview(null);
    setApplied(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProject.id);
      formData.append("projectCode", selectedProject.code);
      formData.append("sections", sectionString);
      const response = await fetch("/api/project-catalog/import/preview", { method: "POST", body: formData });
      const body = await response.json() as QuickCatalogImportPreviewResponse | { error?: string };
      if (!response.ok || !("ok" in body) || body.ok !== true) throw new Error("error" in body ? body.error || "Preview thất bại." : "Preview thất bại.");
      setPreview(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đọc file Excel.");
    } finally {
      setLoading(false);
    }
  }

  async function applyImport() {
    if (!file || !preview?.canApply || applying) return;
    setApplying(true);
    setError("");
    setApplied(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProject.id);
      formData.append("projectCode", selectedProject.code);
      formData.append("confirmCode", confirmCode);
      formData.append("sections", sectionString);
      const response = await fetch("/api/project-catalog/import/apply", { method: "POST", body: formData });
      const body = await response.json() as QuickCatalogImportApplyResponse | { error?: string };
      if (!response.ok || !("ok" in body) || body.ok !== true) throw new Error("error" in body ? body.error || "Import thất bại." : "Import thất bại.");
      setApplied(body);
      window.dispatchEvent(new CustomEvent("asc-working:catalog-changed", { detail: { projectId: selectedProject.id, entity: "quick-import" } }));
      onApplied?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import thất bại.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-3 md:p-6">
      <button type="button" aria-label="Đóng Import Excel" onClick={() => !applying && onClose()} className="absolute inset-0 bg-black/72 backdrop-blur-md" />
      <section className="relative flex h-[min(92dvh,940px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#081421] shadow-[0_30px_120px_rgba(0,0,0,.65)]">
        <header className="flex items-start gap-4 border-b border-white/[0.06] px-5 py-4 md:px-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/14 bg-emerald-300/[0.055]"><FileSpreadsheet className="size-5 text-emerald-200/80" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-300/60">Fast Excel Import • V1.3.2</div>
            <h2 className="mt-1 text-lg font-semibold text-white">Import Phòng ban • PLHĐ • Chức năng</h2>
            <p className="mt-1 text-[10px] text-slate-500">Project đích: <span className="font-semibold text-amber-200/80">{selectedProject.code}</span>. Hỗ trợ trực tiếp file 3 sheet đơn giản như file Excel bạn đang sử dụng, không cần nhập tay từng dòng.</p>
          </div>
          <a href="/templates/ASC-WORKING-V1.3.2-Mau-Import-PhongBan-PLHD.xlsx" className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-[10px] text-slate-400 hover:border-emerald-300/15 hover:text-emerald-200 md:flex"><Download className="size-3.5" /> Tải mẫu</a>
          <button type="button" onClick={() => !applying && onClose()} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white"><X className="size-4" /></button>
        </header>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5 md:p-6">
          <div className="grid gap-3 lg:grid-cols-3">
            {sectionOptions.map((item) => (
              <SectionCheckbox key={item.key} item={item} checked={sections.includes(item.key)} disabled={item.key === "contractItems" && sections.includes("contractDetails")} onChange={(checked) => toggleSection(item.key, checked)} />
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}
                className="rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.012] p-6 text-center"
              >
                <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
                <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.045]"><UploadCloud className="size-5 text-cyan-200/70" /></div>
                <div className="mt-4 text-sm font-semibold text-slate-200">Chọn file Excel hiện có</div>
                <div className="mt-2 text-[11px] leading-5 text-slate-600">Chấp nhận sheet <b>Phòng ban</b>, <b>PLHĐ</b>, <b>PLHĐ chi tiết</b> hoặc <b>PLHĐ - Chi tiết</b>. Dòng chi tiết sẽ hiển thị là <b>Chức năng</b> dưới Module. File không bắt buộc có header. Tối đa <b>20 MB</b>.</div>
                <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-slate-200 hover:border-cyan-300/18 hover:bg-cyan-300/[0.04]">Chọn file .xlsx</button>
                <a href="/templates/ASC-WORKING-V1.3.2-Mau-Import-PhongBan-PLHD.xlsx" className="mt-3 flex items-center justify-center gap-2 text-[10px] text-emerald-300/65 hover:text-emerald-200 md:hidden"><Download className="size-3" /> Tải mẫu nhanh</a>
              </div>

              {file ? (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-emerald-300/12 bg-emerald-300/[0.035] p-4 sm:flex-row sm:items-center">
                  <FileSpreadsheet className="size-4 shrink-0 text-emerald-200/75" />
                  <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-200">{file.name}</div><div className="mt-1 text-[10px] text-slate-600">{formatBytes(file.size)}</div></div>
                  <button type="button" onClick={() => void runPreview()} disabled={loading || !sections.length} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-40">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}{loading ? "Đang phân tích..." : "Preview dữ liệu"}</button>
                </div>
              ) : null}

              {error ? <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-4 text-xs text-rose-100/85"><XCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}

              {preview ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Phòng ban", preview.summary.departments],
                      ["PLHĐ", preview.summary.contractItems],
                      ["Module", preview.summary.modules],
                      ["Chức năng", preview.summary.contractDetails],
                    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4"><div className="text-[9px] uppercase tracking-[0.13em] text-slate-600">{label}</div><div className="mt-2 text-xl font-semibold text-slate-200">{value}</div></div>)}
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.012] p-4">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">Nhận diện cấu trúc</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {preview.sheets.map((sheet) => <div key={sheet.key} className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2 text-[10px]"><span className={cn("size-1.5 rounded-full", sheet.found ? "bg-emerald-300" : "bg-rose-300")} /><span className="text-slate-400">{sheet.label}</span><span className="ml-auto font-mono text-slate-600">{sheet.rows}</span></div>)}
                    </div>
                    {preview.summary.contractItems > 0 ? <div className="mt-3 text-[10px] leading-5 text-slate-500">PLHĐ nhận diện: <span className="font-semibold text-cyan-200/75">{preview.summary.roots} Nhóm • {preview.summary.subsystems} Phân hệ • {preview.summary.modules} Module</span>.</div> : null}
                    {preview.summary.contractDetails > 0 ? <div className="mt-1 text-[10px] leading-5 text-slate-500">Mapping chi tiết: <span className="font-semibold text-emerald-200/75">{preview.summary.mappedDetailRows} dòng nghiệp vụ đã gắn Module</span> • {preview.summary.groupDetailRows} node nhóm/phân hệ • {preview.summary.unmappedBusinessRows} dòng nghiệp vụ chưa mapping.</div> : null}
                  </div>

                  {preview.warnings.length ? <div className="rounded-2xl border border-amber-300/12 bg-amber-300/[0.035] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-amber-100/85"><AlertTriangle className="size-4" /> Cảnh báo ({preview.warnings.length})</div><div className="mt-2 max-h-32 space-y-1 overflow-auto pr-2 text-[10px] leading-5 text-amber-100/55 scrollbar-thin">{preview.warnings.map((message, index) => <div key={`${index}-${message}`}>• {message}</div>)}</div></div> : null}
                  {preview.errors.length ? <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.045] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-rose-100"><XCircle className="size-4" /> Không thể Apply</div><div className="mt-2 space-y-1 text-[10px] leading-5 text-rose-100/65">{preview.errors.map((message, index) => <div key={`${index}-${message}`}>• {message}</div>)}</div></div> : null}
                </div>
              ) : null}
            </div>

            <aside className="self-start rounded-2xl border border-violet-300/10 bg-violet-300/[0.025] p-4 md:p-5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-300/60">Cách đọc file hiện tại</div>
              <div className="mt-3 space-y-3 text-[10px] leading-5 text-slate-500">
                <div><b className="text-slate-300">Phòng ban:</b> cột A là tên. Cột B nếu có sẽ hiểu là mã.</div>
                <div><b className="text-slate-300">PLHĐ:</b> cột A là tên. Nếu có cột Loại, hệ thống đọc đủ cây <b>subsystem → module → function</b>. File cũ ghi <b>other/khác</b> vẫn được nhận là Chức năng và gắn với Module gần nhất.</div>
                <div><b className="text-slate-300">Chức năng:</b> cột A là mã, cột B là nội dung. Các dòng này được lưu vào danh mục Chức năng dưới Module để lưới PLHĐ bên ngoài hiển thị cùng một cây.</div>
              </div>

              {preview?.databasePreview ? (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">Database Preview</div>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Phòng ban", preview.databasePreview.departments],
                      ["PLHĐ", preview.databasePreview.contractItems],
                      ["Chi tiết", preview.databasePreview.contractDetails],
                    ].map(([label, stats]) => {
                      const row = stats as { incoming: number; insert: number; update: number };
                      return <div key={String(label)} className="rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2"><div className="flex items-center text-[10px]"><span className="text-slate-400">{String(label)}</span><span className="ml-auto font-mono text-slate-600">{row.incoming}</span></div><div className="mt-1 text-[9px] text-slate-700">Thêm {row.insert} • Cập nhật {row.update}</div></div>;
                    })}
                  </div>
                </div>
              ) : null}

              {preview?.canApply && !applied ? (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <label className="block"><span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-600">Nhập mã Project để xác nhận</span><input value={confirmCode} onChange={(event) => setConfirmCode(event.target.value)} placeholder={selectedProject.code} className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-emerald-300/20" /></label>
                  <button type="button" onClick={() => void applyImport()} disabled={applying || confirmCode.trim().toLowerCase() !== selectedProject.code.toLowerCase()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-35">{applying ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}{applying ? "Đang import..." : "Apply Import"}</button>
                  <div className="mt-2 text-[9px] leading-4 text-slate-700">Chế độ Merge: dữ liệu cùng import key sẽ cập nhật; dữ liệu mới sẽ thêm. Không xóa dữ liệu hiện có.</div>
                </div>
              ) : null}

              {applied && "ok" in applied && applied.ok ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.045] p-4"><CheckCircle2 className="size-5 text-emerald-300" /><div className="mt-2 text-xs font-semibold text-emerald-100">Import hoàn tất</div><div className="mt-1 text-[10px] leading-5 text-emerald-100/55">{applied.message}</div><button type="button" onClick={onClose} className="mt-3 w-full rounded-xl border border-emerald-300/12 bg-emerald-300/[0.05] px-3 py-2 text-xs font-medium text-emerald-100">Đóng và xem dữ liệu</button></div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ProjectQuickImportButton({
  className,
  label = "Import Excel",
  initialSections,
  onApplied,
}: {
  className?: string;
  label?: string;
  initialSections?: QuickCatalogImportSection[];
  onApplied?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("flex h-9 items-center gap-2 rounded-xl border border-emerald-300/12 bg-emerald-300/[0.045] px-3 text-[10px] font-medium text-emerald-100/75 transition hover:bg-emerald-300/[0.08]", className)}><UploadCloud className="size-3.5" /> {label}</button>
      {open ? <QuickCatalogImportModal onClose={() => setOpen(false)} initialSections={initialSections} onApplied={onApplied} /> : null}
    </>
  );
}
