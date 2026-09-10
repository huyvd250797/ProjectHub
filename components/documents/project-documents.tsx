"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  Archive,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
} from "@/lib/documents/types";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  minutes: "Biên bản",
  contract: "Hợp đồng",
  form: "Biểu mẫu",
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

type DocumentForm = {
  title: string;
  category: DocumentCategory;
  description: string;
  linkType: DocumentLinkType;
  linkedEntityLabel: string;
  driveUrl: string;
};

const EMPTY_FORM: DocumentForm = {
  title: "",
  category: "other",
  description: "",
  linkType: "project",
  linkedEntityLabel: "",
  driveUrl: "",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function documentUrl(document: ProjectDocument) {
  const raw = document.driveUrl || document.driveFileId || "";
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://drive.google.com/file/d/${encodeURIComponent(raw)}/view`;
}

export function ProjectDocuments() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<DocumentListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [linkType, setLinkType] = useState<DocumentLinkType | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<ProjectDocument | null>(null);
  const [copyDocument, setCopyDocument] = useState<ProjectDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents?projectId=${encodeURIComponent(selectedProject.id)}`, { cache: "no-store" });
      const payload = (await response.json()) as DocumentApiResponse;
      if (!payload.ok) throw new Error(payload.message);
      setData(payload.data);
    } catch (error) {
      setData(null);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không tải được danh sách tài liệu." });
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
      return [row.title, row.description, row.linkedEntityLabel, row.uploadedByName]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("vi-VN").includes(query));
    });
  }, [category, data?.rows, linkType, search]);

  async function archiveDocument(document: ProjectDocument) {
    if (!window.confirm(`Lưu trữ “${document.title}”? Link Drive gốc không bị xóa.`)) return;
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng tài liệu" value={data?.summary.total ?? 0} helper="Trong project hiện tại" icon={FolderOpen} tone="cyan" />
        <SummaryCard label="Biên bản" value={data?.summary.minutes ?? 0} helper="Biên bản họp / nghiệm thu" icon={FileText} tone="violet" />
        <SummaryCard label="Báo cáo" value={data?.summary.reports ?? 0} helper="Báo cáo tiến độ" icon={FileText} tone="emerald" />
        <SummaryCard label="Link Drive" value={data?.summary.total ?? 0} helper={data?.summary.latestAt ? `Mới nhất ${formatDate(data.summary.latestAt)}` : "Chưa có dữ liệu"} icon={Link2} tone="amber" />
      </div>

      <section className="tech-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input className="field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên tài liệu, mô tả, người tạo..." />
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
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setCreateOpen(true)} disabled={!data?.canUpload}>
              <Plus className="size-4" /> Thêm tài liệu
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-slate-600">
          <span>{filteredRows.length} tài liệu</span>
          <span className="flex items-center gap-1.5"><Link2 className="size-3.5 text-emerald-300" /> Chỉ lưu thông tin và link Google Drive</span>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="size-5 animate-spin text-cyan-300" /> Đang tải danh sách tài liệu...</div></div>
        ) : filteredRows.length ? (
          <div className="asc-data-grid overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tài liệu</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold">Liên kết</th>
                  <th className="px-4 py-3 font-semibold">Người tạo</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {filteredRows.map((document) => (
                  <tr key={document.id} className="asc-large-data-row transition hover:bg-white/[0.018]">
                    <td className="max-w-[360px] px-4 py-4 align-top">
                      <div className="font-semibold text-slate-100">{document.title}</div>
                      {document.description ? <div className="mt-1 whitespace-normal text-xs leading-5 text-slate-400">{document.description}</div> : null}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex rounded-md border border-violet-300/15 bg-violet-300/[0.055] px-2 py-1 text-[10px] font-medium text-violet-200">{CATEGORY_LABELS[document.category]}</span>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 align-top text-xs text-slate-400">
                      <div>{LINK_LABELS[document.linkType]}</div>
                      {document.linkedEntityLabel ? <div className="mt-1 whitespace-normal text-slate-500">{document.linkedEntityLabel}</div> : null}
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-slate-500">{document.uploadedByName ?? "Người dùng dự án"}</td>
                    <td className="px-4 py-4 align-top text-xs text-slate-500">{formatDate(document.createdAt)}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <a className="secure-btn px-2.5" href={documentUrl(document)} target="_blank" rel="noreferrer" title="Xem file trên Google Drive"><ExternalLink className="size-3.5" /><span className="hidden xl:inline">Xem file</span></a>
                        {data?.canManage ? <button type="button" className="secure-btn px-2.5" onClick={() => setEditDocument(document)} title="Sửa thông tin"><Pencil className="size-3.5" /></button> : null}
                        {data?.canUpload ? <button type="button" className="secure-btn px-2.5" onClick={() => setCopyDocument(document)} title="Sao chép dòng"><Copy className="size-3.5" /></button> : null}
                        {data?.canManage ? <button type="button" className="secure-btn px-2.5 hover:border-rose-300/20 hover:text-rose-200" onClick={() => void archiveDocument(document)} title="Lưu trữ"><Archive className="size-3.5" /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div><FolderOpen className="mx-auto size-10 text-slate-700" /><div className="mt-3 text-sm font-semibold text-slate-300">Chưa có tài liệu phù hợp</div><div className="mt-1 text-xs text-slate-500">Thêm tài liệu bằng cách nhập thông tin và dán link Google Drive.</div></div>
          </div>
        )}
      </section>

      {createOpen ? <DocumentModal projectId={selectedProject.id} onClose={() => setCreateOpen(false)} onDone={async (text) => { setCreateOpen(false); setMessage({ type: "success", text }); await load(); }} /> : null}
      {editDocument ? <DocumentModal document={editDocument} projectId={selectedProject.id} onClose={() => setEditDocument(null)} onDone={async (text) => { setEditDocument(null); setMessage({ type: "success", text }); await load(); }} /> : null}
      {copyDocument ? <DocumentModal copyFrom={copyDocument} projectId={selectedProject.id} onClose={() => setCopyDocument(null)} onDone={async (text) => { setCopyDocument(null); setMessage({ type: "success", text }); await load(); }} /> : null}
    </div>
  );
}

function SummaryCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string | number; helper: string; icon: typeof FolderOpen; tone: "cyan" | "violet" | "emerald" | "amber" }) {
  const tones = { cyan: "border-cyan-300/15 bg-cyan-300/[0.045] text-cyan-300", violet: "border-violet-300/15 bg-violet-300/[0.045] text-violet-300", emerald: "border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-300", amber: "border-amber-300/15 bg-amber-300/[0.045] text-amber-300" };
  return <div className="tech-panel rounded-2xl p-4"><div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div></div><div className={cn("grid size-9 place-items-center rounded-xl border", tones[tone])}><Icon className="size-[18px]" /></div></div><div className="mt-2 truncate text-[10px] text-slate-600">{helper}</div></div>;
}

function DocumentModal({ projectId, document, copyFrom, onClose, onDone }: { projectId: string; document?: ProjectDocument; copyFrom?: ProjectDocument; onClose: () => void; onDone: (message: string) => void }) {
  const source = document ?? copyFrom;
  const [form, setForm] = useState<DocumentForm>({
    title: source?.title ?? "",
    category: source?.category ?? "other",
    description: source?.description ?? "",
    linkType: source?.linkType ?? "project",
    linkedEntityLabel: source?.linkedEntityLabel ?? "",
    driveUrl: source ? documentUrl(source) : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(document ? `/api/documents/${document.id}` : "/api/documents", {
        method: document ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...form }),
      });
      const payload = (await response.json()) as DocumentMutationResponse;
      if (!payload.ok) throw new Error(payload.message);
      onDone(payload.message ?? (document ? "Đã cập nhật tài liệu." : "Đã thêm tài liệu."));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được tài liệu.");
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={document ? "Cập nhật tài liệu" : copyFrom ? "Sao chép tài liệu" : "Thêm tài liệu"} subtitle={copyFrom ? "Thông tin đã được fill từ dòng đang sao chép. Chỉnh lại nội dung rồi lưu để tạo dòng mới." : "Nhập thông tin tài liệu và dán link Google Drive để mở xem nhanh."} onClose={busy ? undefined : onClose}>
    <DocumentFields form={form} setForm={setForm} disabled={busy} />
    {error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.055] px-4 py-3 text-sm text-rose-200">{error}</div> : null}
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" className="secure-btn" onClick={onClose} disabled={busy}>Hủy</button>
      <button type="button" onClick={() => void save()} disabled={busy || !form.title.trim() || !form.driveUrl.trim()} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.1] px-4 text-xs font-semibold text-cyan-100 disabled:opacity-40">{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Lưu</button>
    </div>
  </Modal>;
}

function DocumentFields({ form, setForm, disabled }: { form: DocumentForm; setForm: Dispatch<SetStateAction<DocumentForm>>; disabled: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tiêu đề *</span><input className="field" disabled={disabled} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Biên bản nghiệm thu giai đoạn 1" /></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Link Google Drive *</span><input className="field" disabled={disabled} value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} placeholder="https://drive.google.com/file/d/... hoặc https://docs.google.com/..." /></label>
    <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Loại tài liệu</span><select className="field" disabled={disabled} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DocumentCategory }))}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Liên kết nghiệp vụ</span><select className="field" disabled={disabled} value={form.linkType} onChange={(event) => setForm((current) => ({ ...current, linkType: event.target.value as DocumentLinkType }))}>{Object.entries(LINK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tên/Mã tham chiếu</span><input className="field" disabled={disabled || form.linkType === "project"} value={form.linkedEntityLabel} onChange={(event) => setForm((current) => ({ ...current, linkedEntityLabel: event.target.value }))} placeholder={form.linkType === "project" ? "Toàn dự án" : "Ví dụ: ISSUE #123 / Module B.1"} /></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mô tả</span><textarea className="min-h-28 w-full resize-y rounded-xl border border-white/[0.08] bg-black/10 p-3 text-sm text-slate-200 outline-none focus:border-cyan-300/25" disabled={disabled} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ghi chú nội dung hoặc mục đích của tài liệu..." /></label>
  </div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose?: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-3 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-[880px] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0a1828] shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/[0.07] bg-[#0a1828]/95 px-5 py-4 backdrop-blur"><div><div className="text-base font-semibold text-white">{title}</div><div className="mt-1 text-xs text-slate-500">{subtitle}</div></div>{onClose ? <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-slate-400 hover:text-white" aria-label="Đóng modal"><X className="size-4" /></button> : null}</div><div className="p-5">{children}</div></div></div>;
}
