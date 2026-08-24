"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import type {
  ImportApplyResult,
  ImportDryRunResult,
  ImportMode,
  ImportPreview,
} from "@/lib/import/types";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

const previewLabels: Array<[keyof ImportPreview, string]> = [
  ["departments", "Phòng ban"],
  ["people", "Nhân sự"],
  ["stages", "Giai đoạn"],
  ["contractItems", "PLHĐ"],
  ["contractDetails", "PLHĐ chi tiết"],
  ["releaseVersions", "Release"],
  ["issues", "ISSUE"],
  ["remoteResources", "Resource"],
];

export function ImportWorkbook() {
  const router = useRouter();
  const { selectedProject } = useProject();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportDryRunResult | null>(null);
  const [applyResult, setApplyResult] = useState<ImportApplyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [confirmCode, setConfirmCode] = useState("");

  function chooseFile(selectedFile?: File) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    setApplyResult(null);
    setError("");
    setConfirmCode("");
  }

  async function runDryRun() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    setApplyResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProject.id);
      formData.append("projectCode", selectedProject.code);

      const response = await fetch("/api/import/dry-run", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Kiểm tra dữ liệu thất bại.");
      setResult(payload as ImportDryRunResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể phân tích file.");
    } finally {
      setLoading(false);
    }
  }

  async function applyImport() {
    if (!file || !result?.canApply) return;
    setApplying(true);
    setError("");
    setApplyResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", selectedProject.id);
      formData.append("projectCode", selectedProject.code);
      formData.append("confirmCode", confirmCode);
      formData.append("mode", mode);

      const response = await fetch("/api/import/apply", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Apply Import thất bại.");
      setApplyResult(payload as ImportApplyResult);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Apply Import thất bại.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[
          ["01", "Tải mẫu", "Template được khóa theo Project đang chọn."],
          ["02", "Điền Excel", "Giữ nguyên sheet/cột và dùng key ổn định."],
          ["03", "Preview → Apply", "Dry-run trước, xác nhận rồi mới ghi Supabase."],
        ].map(([step, title, text]) => (
          <div key={step} className="tech-panel rounded-2xl p-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">STEP {step}</div>
            <div className="mt-2 text-sm font-semibold text-slate-200">{title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-600">{text}</div>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-4 text-xs leading-5 text-slate-400">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-cyan-200/75" />
            <div>
              Project đích: <span className="font-semibold text-amber-200">{selectedProject.code}</span> • {selectedProject.organizationName || selectedProject.name}. Template tải xuống gắn Project ID để tránh import nhầm dự án.
            </div>
          </div>
          <a
            href={`/api/import/template?projectId=${encodeURIComponent(selectedProject.id)}`}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.065] px-4 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/[0.1] md:ml-auto"
          >
            <Download className="size-4" /> Tải mẫu Excel V0.9.2
          </a>
        </div>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
        className={`tech-panel rounded-2xl border-dashed p-6 transition md:p-8 ${dragging ? "border-cyan-300/35 bg-cyan-300/[0.04]" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <div className="flex flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06]">
            <UploadCloud className="size-6 text-cyan-200/80" />
          </div>
          <h2 className="mt-5 text-base font-semibold text-white">Import Excel</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">
            Upload file đã điền từ Template V0.9.2. Workbook cũ vẫn được đọc để Dry-run nhưng không thể Apply; production import chỉ nhận template chuẩn để tránh mapping sai.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.05]"
          >
            Chọn file .xlsx
          </button>
          <div className="mt-3 text-[10px] text-slate-700">Tối đa 10 MB • file upload không được lưu trên server</div>
        </div>
      </div>

      {file ? (
        <div className="tech-panel flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05]">
            <FileSpreadsheet className="size-4 text-emerald-200/80" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-200">{file.name}</div>
            <div className="mt-1 text-[10px] text-slate-600">{formatBytes(file.size)}</div>
          </div>
          <button
            type="button"
            onClick={runDryRun}
            disabled={loading || applying}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-50 md:ml-auto"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}
            {loading ? "Đang kiểm tra..." : "Kiểm tra dữ liệu / Preview"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.055] p-4 text-xs text-rose-200">
          <div className="flex items-center gap-2"><XCircle className="size-4" /> {error}</div>
        </div>
      ) : null}

      {result ? (
        <>
          <div className={`rounded-2xl border p-4 ${result.canImport ? "border-emerald-300/15 bg-emerald-300/[0.045]" : "border-rose-300/15 bg-rose-300/[0.045]"}`}>
            <div className="flex items-start gap-3">
              {result.canImport ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" /> : <XCircle className="mt-0.5 size-4 text-rose-300" />}
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {result.canImport ? "Workbook đạt validation" : "Workbook chưa đạt validation"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Format: <span className="font-semibold text-cyan-200/80">{result.format === "canonical_v092" ? `Template ${result.templateVersion}` : "Legacy workbook"}</span> • Project: <span className="font-semibold text-amber-200/80">{selectedProject.code}</span>
                </div>
              </div>
            </div>
          </div>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[
              ["ISSUE", result.summary.issues],
              ["Module", result.summary.modules],
              ["Phân hệ", result.summary.subsystems],
              ["PLHĐ chi tiết", result.summary.contractDetails],
              ["Phòng ban", result.summary.departments],
              ["Nhân sự trường", result.summary.customerPeople],
              ["ASC Member", result.summary.ascMembers],
              ["Giai đoạn", result.summary.stages ?? 0],
              ["Release", result.summary.releaseVersions],
              ["Resources", result.summary.remoteResources],
            ].map(([label, value]) => (
              <div key={String(label)} className="tech-panel rounded-2xl p-4">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{String(label)}</div>
                <div className="mt-2 text-xl font-semibold text-white">{String(value)}</div>
              </div>
            ))}
          </section>

          {result.preview ? (
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Database Preview</div>
                <div className="mt-1 text-[11px] text-slate-500">So sánh key trong file với dữ liệu Project hiện tại trước khi Apply.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs">
                  <thead className="bg-white/[0.025] text-[9px] uppercase tracking-[0.14em] text-slate-600">
                    <tr><th className="px-4 py-3 text-left">Entity</th><th className="px-4 py-3 text-right">Trong file</th><th className="px-4 py-3 text-right">Thêm mới</th><th className="px-4 py-3 text-right">Cập nhật</th></tr>
                  </thead>
                  <tbody>
                    {previewLabels.map(([key, label]) => {
                      const item = result.preview![key];
                      return (
                        <tr key={key} className="border-t border-white/[0.045]">
                          <td className="px-4 py-3 font-medium text-slate-300">{label}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.incoming}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-300/80">+{item.insert}</td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-200/80">~{item.update}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="border-b border-white/[0.06] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Sheet mapping</div>
              {result.sheets.map((sheet) => (
                <div key={sheet.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-xs">
                  {sheet.found ? <CheckCircle2 className="size-3.5 text-emerald-300/70" /> : <XCircle className="size-3.5 text-rose-300/70" />}
                  <div className="min-w-0"><div className="font-medium text-slate-300">{sheet.name}</div><div className="mt-1 truncate text-[10px] text-slate-600">→ {sheet.mappedTo}</div></div>
                  <span className="text-[10px] text-slate-600">{sheet.rows} rows</span>
                </div>
              ))}
            </div>

            <div className="tech-panel rounded-2xl p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Data quality</div>
              <div className="mt-4 space-y-2">
                {[
                  ["ISSUE thiếu Module", result.quality.issuesMissingModule],
                  ["ISSUE thiếu Phòng ban", result.quality.issuesMissingDepartment],
                  ["ISSUE thiếu phụ trách", result.quality.issuesMissingAssignee],
                  ["Module chưa match", result.quality.unknownIssueModules],
                  ["Jira link trùng", result.quality.duplicateJiraLinks],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-xs">
                    <span className="text-slate-500">{String(label)}</span>
                    <span className={Number(value) > 0 ? "font-semibold text-amber-200" : "font-semibold text-emerald-300/75"}>{String(value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3 text-[10px] leading-5 text-amber-100/55">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> RESOURCE không import password/token/secret. Credential phải nhập qua Resource Vault.
              </div>
            </div>
          </section>

          {result.messages.length ? (
            <div className="tech-panel rounded-2xl p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Validation messages</div>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {result.messages.map((message, index) => (
                  <div key={`${message.code}-${index}`} className="flex items-start gap-2 rounded-xl border border-white/[0.045] bg-white/[0.015] px-3 py-2.5 text-[11px] leading-5">
                    {message.severity === "error" ? <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-300" /> : message.severity === "warning" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-cyan-300" />}
                    <span className="text-slate-500">{message.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.canApply ? (
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.035] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-emerald-300/80" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-200">Apply Import vào {selectedProject.code}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Apply chạy transaction trong PostgreSQL: nếu một bước lỗi, toàn bộ import được rollback. Chỉ MASTER/Admin/PM được thực hiện.</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button type="button" onClick={() => setMode("merge")} className={`rounded-xl border p-3 text-left transition ${mode === "merge" ? "border-cyan-300/25 bg-cyan-300/[0.07]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className="text-xs font-semibold text-slate-200">Thêm mới + cập nhật</div>
                      <div className="mt-1 text-[10px] leading-4 text-slate-600">Cùng key → update; key mới → insert. Khuyến nghị.</div>
                    </button>
                    <button type="button" onClick={() => setMode("insert_only")} className={`rounded-xl border p-3 text-left transition ${mode === "insert_only" ? "border-cyan-300/25 bg-cyan-300/[0.07]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className="text-xs font-semibold text-slate-200">Chỉ thêm mới</div>
                      <div className="mt-1 text-[10px] leading-4 text-slate-600">Key đã tồn tại sẽ bỏ qua, không cập nhật.</div>
                    </button>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Nhập mã Project để xác nhận: {selectedProject.code}</span>
                    <input
                      value={confirmCode}
                      onChange={(event) => setConfirmCode(event.target.value)}
                      placeholder={selectedProject.code}
                      className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3 text-xs text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25 md:max-w-sm"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={applyImport}
                    disabled={applying || confirmCode.trim().toLowerCase() !== selectedProject.code.toLowerCase()}
                    className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-semibold text-[#07111f] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {applying ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}
                    {applying ? "Đang Apply Import..." : "Apply Import"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {applyResult ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.055] p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-300" />
            <div>
              <div className="text-sm font-semibold text-emerald-100">Import hoàn tất</div>
              <div className="mt-1 text-xs leading-5 text-emerald-100/55">{applyResult.message}</div>
              <div className="mt-2 font-mono text-[10px] text-emerald-200/50">Batch: {applyResult.batchId}</div>
              <button type="button" onClick={() => window.location.reload()} className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-xs font-medium text-emerald-100">
                <RefreshCw className="size-3.5" /> Reload dữ liệu Project
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
