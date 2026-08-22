"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LoaderCircle,
  LockKeyhole,
  UploadCloud,
  XCircle,
} from "lucide-react";
import type { ImportDryRunResult } from "@/lib/import/types";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export function ImportWorkbook() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportDryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function runDryRun(selectedFile = file) {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/import/dry-run", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Import dry-run thất bại.");
      setResult(payload as ImportDryRunResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể phân tích file.");
    } finally {
      setLoading(false);
    }
  }

  function chooseFile(selectedFile?: File) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    setError("");
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
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
          <h2 className="mt-5 text-base font-semibold text-white">Import Dry-run</h2>
          <p className="mt-2 max-w-xl text-xs leading-6 text-slate-500">
            Upload workbook ASC-Working. Hệ thống chỉ phân tích cấu trúc, đếm dữ liệu, kiểm tra mapping và cảnh báo; V0.2.0 chưa ghi dữ liệu nghiệp vụ vào database.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.05]"
          >
            Chọn file .xlsx
          </button>
          <div className="mt-3 text-[10px] text-slate-700">Tối đa 10 MB • file không được lưu lại bởi endpoint dry-run</div>
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
            onClick={() => runDryRun()}
            disabled={loading}
            className="md:ml-auto flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Database className="size-4" />}
            {loading ? "Đang phân tích..." : "Chạy kiểm tra dữ liệu"}
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
                  {result.canImport ? "Workbook đủ cấu trúc để tiếp tục mapping" : "Workbook chưa đạt điều kiện dry-run"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Project nhận diện: <span className="font-semibold text-amber-200/80">{result.sourceProject.code}</span> • {result.sourceProject.organizationName || "Chưa xác định đơn vị"}
                </div>
              </div>
            </div>
          </div>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            {[
              ["ISSUE", result.summary.issues],
              ["Module", result.summary.modules],
              ["Phân hệ", result.summary.subsystems],
              ["PLHĐ chi tiết", result.summary.contractDetails],
              ["Phòng ban", result.summary.departments],
              ["Nhân sự trường", result.summary.customerPeople],
              ["ASC Member", result.summary.ascMembers],
              ["Release", result.summary.releaseVersions],
              ["Remote resources", result.summary.remoteResources],
            ].map(([label, value]) => (
              <div key={String(label)} className="tech-panel rounded-2xl p-4">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{String(label)}</div>
                <div className="mt-2 text-xl font-semibold text-white">{String(value)}</div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="tech-panel overflow-hidden rounded-2xl">
              <div className="border-b border-white/[0.06] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Sheet mapping</div>
              {result.sheets.map((sheet) => (
                <div key={sheet.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-xs">
                  {sheet.found ? <CheckCircle2 className="size-3.5 text-emerald-300/70" /> : <XCircle className="size-3.5 text-rose-300/70" />}
                  <div className="min-w-0">
                    <div className="font-medium text-slate-300">{sheet.name}</div>
                    <div className="mt-1 truncate text-[10px] text-slate-600">→ {sheet.mappedTo}</div>
                  </div>
                  <span className="text-[10px] text-slate-600">{sheet.rows} rows</span>
                </div>
              ))}
            </div>

            <div className="tech-panel rounded-2xl p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Data quality</div>
              <div className="mt-4 space-y-3">
                {[
                  ["ISSUE thiếu Module", result.quality.issuesMissingModule],
                  ["ISSUE thiếu Phòng ban", result.quality.issuesMissingDepartment],
                  ["ISSUE thiếu người phụ trách", result.quality.issuesMissingAssignee],
                  ["Module chưa match PLHĐ", result.quality.unknownIssueModules],
                  ["Jira link trùng", result.quality.duplicateJiraLinks],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2.5">
                    <span className="text-xs text-slate-500">{String(label)}</span>
                    <span className={`text-xs font-semibold ${Number(value) ? "text-amber-200" : "text-emerald-300/80"}`}>{String(value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-amber-300/12 bg-amber-300/[0.04] p-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">
                  <LockKeyhole className="size-3.5" /> Secret excluded
                </div>
                <p className="mt-2 text-[10px] leading-5 text-amber-100/40">
                  {result.quality.sensitiveColumnsExcluded.join(" • ")}
                </p>
              </div>
            </div>
          </section>

          {result.messages.length ? (
            <section className="tech-panel rounded-2xl p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Validation messages</div>
              <div className="mt-3 space-y-2">
                {result.messages.map((message, index) => (
                  <div key={`${message.code}-${index}`} className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2.5 text-xs text-slate-500">
                    {message.severity === "error" ? <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-300/70" /> : message.severity === "warning" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300/70" /> : <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-cyan-300/60" />}
                    <span>{message.message}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
