"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { cn } from "@/lib/utils";
import type {
  DocumentApiResponse,
  DocumentCategory,
  DocumentLinkType,
  DocumentMutationResponse,
  DocumentListData,
  ProjectDocument,
  UploadSessionResponse,
} from "@/lib/documents/types";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  minutes: "Biên bản",
  contract: "Hợp đồng",
  guide: "Hướng dẫn",
  requirement: "Yêu cầu",
  report: "Báo cáo",
  other: "Khác",
};

const LINK_LABELS: Record<DocumentLinkType, string> = {
  project: "Toàn dự án",
  issue: "ISSUE",
  contract_item: "PLHĐ / Module",
  department: "Phòng ban",
  resource: "Resource",
  other: "Khác",
};

const EMPTY_FORM = {
  title: "",
  category: "other" as DocumentCategory,
  description: "",
  linkType: "project" as DocumentLinkType,
  linkedEntityLabel: "",
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toLocaleString("vi-VN", { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function fileIcon(mimeType: string, fileName: string) {
  const normalized = `${mimeType} ${fileName}`.toLowerCase();
  if (normalized.includes("pdf") || normalized.includes("word") || /\.docx?$/.test(normalized)) return FileText;
  if (normalized.includes("spreadsheet") || normalized.includes("excel") || /\.xlsx?$/.test(normalized)) return FileSpreadsheet;
  if (normalized.includes("image")) return FileImage;
  if (normalized.includes("zip") || normalized.includes("rar") || normalized.includes("7z")) return FileArchive;
  return File;
}

function canPreview(document: ProjectDocument) {
  return document.mimeType === "application/pdf" || document.mimeType.startsWith("image/") || document.mimeType.startsWith("text/");
}

function putFile(uploadUrl: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Mất kết nối khi tải file lên Google Drive."));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Google Drive từ chối upload (${xhr.status}).`));
        return;
      }
      try {
        const payload = JSON.parse(xhr.responseText) as { id?: string };
        if (!payload.id) throw new Error("Google Drive không trả về file ID.");
        resolve({ id: payload.id });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Không đọc được kết quả upload."));
      }
    };
    xhr.send(file);
  });
}

export function ProjectDocuments() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<DocumentListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [linkType, setLinkType] = useState<DocumentLinkType | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<ProjectDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<ProjectDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const payload = (await response.json()) as DocumentApiResponse;
      if (!payload.ok) throw new Error(payload.message);
      setData(payload.data);
    } catch (error) {
      setData(null);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không tải được tài liệu." });
    } finally {
      setLoading(false);
    }
  }, [selectedProject.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi-VN");
    return (data?.rows ?? []).filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (linkType !== "all" && row.linkType !== linkType) return false;
      if (!query) return true;
      return [row.title, row.originalFileName, row.description, row.linkedEntityLabel, row.uploadedByName]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("vi-VN").includes(query));
    });
  }, [category, data?.rows, linkType, search]);

  async function archiveDocument(document: ProjectDocument) {
    if (!window.confirm(`Lưu trữ “${document.title}”? File gốc vẫn được giữ trên Google Drive.`)) return;
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      const payload = (await response.json()) as DocumentMutationResponse;
      if (!payload.ok) throw new Error(payload.message);
      setMessage({ type: "success", text: payload.message ?? "Đã lưu trữ tài liệu." });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không lưu trữ được tài liệu." });
    }
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div className={cn("flex items-center justify-between rounded-xl border px-4 py-3 text-sm", message.type === "success" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : "border-rose-300/20 bg-rose-300/[0.06] text-rose-200")}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Đóng thông báo"><X className="size-4" /></button>
        </div>
      ) : null}

      {!loading && data && !data.driveReady ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-4 text-sm text-amber-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Cloud className="mt-0.5 size-5 shrink-0 text-amber-300" />
            <div>
              <div className="font-semibold">Google Drive chưa được kết nối</div>
              <div className="mt-1 text-xs leading-5 text-amber-100/65">Cấu hình OAuth trong Vercel rồi redeploy. Tài liệu mẫu vẫn hiển thị ở Demo Mode nhưng chưa thể upload.</div>
            </div>
          </div>
          <a href="/settings/system" className="secure-btn shrink-0">Xem cấu hình hệ thống <ExternalLink className="size-3.5" /></a>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng tài liệu" value={data?.summary.total ?? 0} helper="Trong project hiện tại" icon={FolderOpen} tone="cyan" />
        <SummaryCard label="Biên bản" value={data?.summary.minutes ?? 0} helper="Biên bản họp / nghiệm thu" icon={FileText} tone="violet" />
        <SummaryCard label="Báo cáo" value={data?.summary.reports ?? 0} helper="Báo cáo tiến độ" icon={FileSpreadsheet} tone="emerald" />
        <SummaryCard label="Dung lượng" value={formatBytes(data?.summary.totalBytes ?? 0)} helper={data?.summary.latestAt ? `Mới nhất ${formatDate(data.summary.latestAt)}` : "Chưa có dữ liệu"} icon={Cloud} tone="amber" />
      </div>

      <section className="tech-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input className="field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên file, mô tả, người tải..." />
            </label>
            <select className="field sm:w-44" value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory | "all")}>
              <option value="all">Tất cả loại</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="field sm:w-48" value={linkType} onChange={(event) => setLinkType(event.target.value as DocumentLinkType | "all")}>
              <option value="all">Tất cả liên kết</option>
              {Object.entries(LINK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="secure-btn" onClick={() => void load()} disabled={loading}><RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Làm mới</button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setUploadOpen(true)} disabled={!data?.canUpload || !data.driveReady}>
              <Plus className="size-4" /> Tải tài liệu
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-slate-600">
          <span>{filteredRows.length} tài liệu</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-300" /> Nội dung file private • tải qua API có kiểm tra Project</span>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="size-5 animate-spin text-cyan-300" /> Đang tải Project Documents...</div></div>
        ) : filteredRows.length ? (
          <div className="divide-y divide-white/[0.055]">
            {filteredRows.map((document) => {
              const Icon = fileIcon(document.mimeType, document.originalFileName);
              return (
                <article key={document.id} className="group grid gap-4 px-4 py-4 transition hover:bg-white/[0.018] lg:grid-cols-[minmax(0,1fr)_160px_180px_auto] lg:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.045] text-cyan-300"><Icon className="size-5" /></div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-100">{document.title}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{document.originalFileName}</div>
                      {document.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{document.description}</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 lg:block">
                    <span className="inline-flex rounded-md border border-violet-300/15 bg-violet-300/[0.055] px-2 py-1 text-[10px] font-medium text-violet-200">{CATEGORY_LABELS[document.category]}</span>
                    <div className="mt-1.5 truncate text-[11px] text-slate-500">{LINK_LABELS[document.linkType]}{document.linkedEntityLabel ? ` • ${document.linkedEntityLabel}` : ""}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    <div>{formatBytes(document.sizeBytes)} • V{document.versionNo}</div>
                    <div className="mt-1 truncate">{document.uploadedByName ?? "Người dùng dự án"}</div>
                    <div className="mt-1 text-[10px]">{formatDate(document.createdAt)}</div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" className="secure-btn px-2.5" onClick={() => setPreviewDocument(document)} title="Xem tài liệu"><ExternalLink className="size-3.5" /><span className="hidden xl:inline">Xem</span></button>
                    <a className="secure-btn px-2.5" href={`/api/documents/${document.id}/content?download=1`} title="Tải xuống"><Download className="size-3.5" /></a>
                    {data?.canManage ? <button type="button" className="secure-btn px-2.5" onClick={() => setEditDocument(document)} title="Sửa metadata"><Pencil className="size-3.5" /></button> : null}
                    {data?.canManage ? <button type="button" className="secure-btn px-2.5 hover:border-rose-300/20 hover:text-rose-200" onClick={() => void archiveDocument(document)} title="Lưu trữ"><Archive className="size-3.5" /></button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div><FolderOpen className="mx-auto size-10 text-slate-700" /><div className="mt-3 text-sm font-semibold text-slate-300">Chưa có tài liệu phù hợp</div><div className="mt-1 text-xs text-slate-500">Thay đổi bộ lọc hoặc tải tài liệu đầu tiên lên Google Drive.</div></div>
          </div>
        )}
      </section>

      {uploadOpen ? <UploadModal projectId={selectedProject.id} onClose={() => setUploadOpen(false)} onDone={async (text) => { setUploadOpen(false); setMessage({ type: "success", text }); await load(); }} /> : null}
      {editDocument ? <EditModal document={editDocument} onClose={() => setEditDocument(null)} onDone={async (text) => { setEditDocument(null); setMessage({ type: "success", text }); await load(); }} /> : null}
      {previewDocument ? <PreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} /> : null}
    </div>
  );
}

function SummaryCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string | number; helper: string; icon: typeof FolderOpen; tone: "cyan" | "violet" | "emerald" | "amber" }) {
  const tones = { cyan: "border-cyan-300/15 bg-cyan-300/[0.045] text-cyan-300", violet: "border-violet-300/15 bg-violet-300/[0.045] text-violet-300", emerald: "border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-300", amber: "border-amber-300/15 bg-amber-300/[0.045] text-amber-300" };
  return <div className="tech-panel rounded-2xl p-4"><div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div></div><div className={cn("grid size-9 place-items-center rounded-xl border", tones[tone])}><Icon className="size-[18px]" /></div></div><div className="mt-2 truncate text-[10px] text-slate-600">{helper}</div></div>;
}

function UploadModal({ projectId, onClose, onDone }: { projectId: string; onClose: () => void; onDone: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function chooseFile(value: File | null) {
    setFile(value);
    if (value && !form.title) setForm((current) => ({ ...current, title: value.name.replace(/\.[^.]+$/, "") }));
  }

  async function submit() {
    if (!file || !form.title.trim()) { setError("Chọn file và nhập tiêu đề tài liệu."); return; }
    setBusy(true); setProgress(1); setError(null);
    try {
      const sessionResponse = await fetch("/api/documents/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          ...form,
        }),
      });
      const session = (await sessionResponse.json()) as UploadSessionResponse;
      if (!session.ok) throw new Error(session.message);
      const uploaded = await putFile(session.uploadUrl, file, setProgress);
      setProgress(100);
      const completeResponse = await fetch("/api/documents/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, uploadToken: session.uploadToken, driveFileId: uploaded.id }),
      });
      const completed = (await completeResponse.json()) as DocumentMutationResponse;
      if (!completed.ok) throw new Error(completed.message);
      onDone(completed.message ?? "Đã tải tài liệu lên Google Drive.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không tải được tài liệu.");
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Tải tài liệu lên Google Drive" subtitle="File được upload trực tiếp bằng resumable session; Supabase chỉ lưu metadata." onClose={busy ? undefined : onClose}>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
      <div>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0] ?? null); }} className="grid min-h-56 w-full place-items-center rounded-2xl border border-dashed border-cyan-300/20 bg-cyan-300/[0.025] p-6 text-center transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.045] disabled:opacity-50">
          {file ? <div><CheckCircle2 className="mx-auto size-9 text-emerald-300" /><div className="mt-3 max-w-md truncate text-sm font-semibold text-slate-200">{file.name}</div><div className="mt-1 text-xs text-slate-500">{formatBytes(file.size)} • {file.type || "application/octet-stream"}</div><div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-cyan-300">Bấm để chọn file khác</div></div> : <div><UploadCloud className="mx-auto size-10 text-cyan-300" /><div className="mt-3 text-sm font-semibold text-slate-200">Kéo thả file hoặc bấm để chọn</div><div className="mt-1 text-xs text-slate-500">Tối đa 250 MB • chặn file thực thi/script</div></div>}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
        {busy ? <div className="mt-4"><div className="mb-2 flex justify-between text-xs text-slate-400"><span>Đang tải lên Google Drive...</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width]" style={{ width: `${progress}%` }} /></div></div> : null}
      </div>
      <DocumentFields form={form} setForm={setForm} disabled={busy} />
    </div>
    {error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.055] px-4 py-3 text-sm text-rose-200">{error}</div> : null}
    <div className="mt-5 flex justify-end gap-2"><button type="button" className="secure-btn" onClick={onClose} disabled={busy}>Hủy</button><button type="button" onClick={() => void submit()} disabled={busy || !file} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.1] px-4 text-xs font-semibold text-cyan-100 disabled:opacity-40">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Tải lên</button></div>
  </Modal>;
}

function EditModal({ document, onClose, onDone }: { document: ProjectDocument; onClose: () => void; onDone: (message: string) => void }) {
  const [form, setForm] = useState({ title: document.title, category: document.category, description: document.description ?? "", linkType: document.linkType, linkedEntityLabel: document.linkedEntityLabel ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = (await response.json()) as DocumentMutationResponse;
      if (!payload.ok) throw new Error(payload.message);
      onDone(payload.message ?? "Đã cập nhật tài liệu.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không cập nhật được tài liệu."); }
    finally { setBusy(false); }
  }
  return <Modal title="Cập nhật thông tin tài liệu" subtitle={document.originalFileName} onClose={busy ? undefined : onClose}><DocumentFields form={form} setForm={setForm} disabled={busy} />{error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.055] px-4 py-3 text-sm text-rose-200">{error}</div> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" className="secure-btn" onClick={onClose} disabled={busy}>Hủy</button><button type="button" onClick={() => void save()} disabled={busy || !form.title.trim()} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.1] px-4 text-xs font-semibold text-cyan-100 disabled:opacity-40">{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Lưu thay đổi</button></div></Modal>;
}

function DocumentFields({ form, setForm, disabled }: { form: typeof EMPTY_FORM; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; disabled: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tiêu đề *</span><input className="field" disabled={disabled} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Biên bản họp triển khai tuần 04" /></label>
    <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Loại tài liệu</span><select className="field" disabled={disabled} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DocumentCategory }))}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Liên kết nghiệp vụ</span><select className="field" disabled={disabled} value={form.linkType} onChange={(event) => setForm((current) => ({ ...current, linkType: event.target.value as DocumentLinkType }))}>{Object.entries(LINK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tên/Mã tham chiếu</span><input className="field" disabled={disabled || form.linkType === "project"} value={form.linkedEntityLabel} onChange={(event) => setForm((current) => ({ ...current, linkedEntityLabel: event.target.value }))} placeholder={form.linkType === "project" ? "Toàn dự án" : "Ví dụ: ISSUE #123 / Module B.1"} /></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mô tả</span><textarea className="min-h-28 w-full resize-y rounded-xl border border-white/[0.08] bg-black/10 p-3 text-sm text-slate-200 outline-none focus:border-cyan-300/25" disabled={disabled} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Nội dung hoặc mục đích của tài liệu..." /></label>
  </div>;
}

function PreviewModal({ document, onClose }: { document: ProjectDocument; onClose: () => void }) {
  const source = `/api/documents/${document.id}/content`;
  return <Modal title={document.title} subtitle={`${document.originalFileName} • ${formatBytes(document.sizeBytes)}`} onClose={onClose} wide>
    {canPreview(document) ? <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white"><iframe title={document.title} src={source} className="h-[68vh] w-full" /></div> : <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-white/[0.1] bg-black/10 p-8 text-center"><div><File className="mx-auto size-12 text-slate-600" /><div className="mt-3 text-sm font-semibold text-slate-200">Định dạng này cần tải xuống để mở</div><a className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 text-xs font-semibold text-cyan-100" href={`${source}?download=1`}><Download className="size-4" /> Tải file</a></div></div>}
  </Modal>;
}

function Modal({ title, subtitle, onClose, wide = false, children }: { title: string; subtitle: string; onClose?: () => void; wide?: boolean; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-3 backdrop-blur-sm"><div className={cn("max-h-[94vh] w-full overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0a1828] shadow-2xl", wide ? "max-w-[1320px]" : "max-w-[1040px]")}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/[0.07] bg-[#0a1828]/95 px-5 py-4 backdrop-blur"><div><div className="text-base font-semibold text-white">{title}</div><div className="mt-1 text-xs text-slate-500">{subtitle}</div></div>{onClose ? <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-slate-400 hover:text-white" aria-label="Đóng modal"><X className="size-4" /></button> : null}</div><div className="p-5">{children}</div></div></div>;
}
