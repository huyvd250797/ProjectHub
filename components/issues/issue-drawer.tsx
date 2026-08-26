"use client";

import {
  Trash2,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  History,
  LoaderCircle,
  Save,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ThemedSelect } from "@/components/ui/themed-select";
import type {
  IssueDetailApiResponse,
  IssueHistoryEntry,
  IssueLookups,
  IssueMutationResponse,
  IssueRow,
} from "@/lib/issues/types";
import { cn } from "@/lib/utils";

type Draft = {
  content: string;
  statusCode: string;
  customerStatusCode: string;
  priorityCode: string;
  stageCode: string;
  jiraUrl: string;
  releaseDate: string;
  dueDate: string;
  moduleId: string;
  departmentId: string;
  requesterId: string;
  assigneeId: string;
  response: string;
  notes: string;
};

function fromIssue(issue?: IssueRow | null): Draft {
  return {
    content: issue?.content ?? "",
    statusCode: issue?.statusCode ?? "waiting",
    customerStatusCode: issue?.customerStatusCode ?? "not_handed_over",
    priorityCode: issue?.priorityCode ?? "B",
    stageCode: issue?.stageCode ?? "",
    jiraUrl: issue?.jiraUrl ?? "",
    releaseDate: issue?.releaseDate ?? "",
    dueDate: issue?.dueDate ?? "",
    moduleId: issue?.moduleId ?? "",
    departmentId: issue?.departmentId ?? "",
    requesterId: issue?.requesterId ?? "",
    assigneeId: issue?.assigneeId ?? "",
    response: issue?.response ?? "",
    notes: issue?.notes ?? "",
  };
}

const historyLabels: Record<string, string> = {
  created: "Tạo ISSUE",
  content: "Nội dung",
  status_code: "Trạng thái",
  customer_status_code: "Trạng thái KH",
  priority_code: "Ưu tiên",
  stage_code: "Giai đoạn",
  jira_url: "Jira",
  release_date: "Ngày release",
  due_date: "Due Date",
  module_id: "Module",
  response: "ASC phản hồi",
  department_id: "Phòng ban",
  requester_person_id: "Người yêu cầu",
  assignee_person_id: "Phụ trách",
  notes: "Ghi chú",
  lifecycle: "Vòng đời",
};

function dateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function historyValue(field: string, value: string | null, lookups: IssueLookups) {
  if (!value) return "—";
  const source =
    field === "status_code" ? lookups.statuses :
    field === "customer_status_code" ? lookups.customerStatuses :
    field === "priority_code" ? lookups.priorities :
    field === "stage_code" ? lookups.stages :
    field === "module_id" ? lookups.modules :
    field === "department_id" ? lookups.departments :
    field === "requester_person_id" ? lookups.requesters :
    field === "assignee_person_id" ? lookups.assignees : null;
  return source?.find((option) => option.value === value)?.label ?? value;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="mt-1.5 text-[10px] leading-4 text-rose-300/90">{message}</div> : null;
}

export function IssueDrawer({
  projectId,
  issue,
  createMode,
  lookups,
  canEdit,
  canArchive,
  source,
  onClose,
  onSaved,
  onArchived,
}: {
  projectId: string;
  issue: IssueRow | null;
  createMode: boolean;
  lookups: IssueLookups;
  canEdit: boolean;
  canArchive: boolean;
  source: "database" | "demo";
  onClose: () => void;
  onSaved: (issue: IssueRow) => void;
  onArchived: (issueId: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => fromIssue(issue));
  const [history, setHistory] = useState<IssueHistoryEntry[]>([]);
  const [tab, setTab] = useState<"detail" | "history">("detail");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(fromIssue(issue));
    setHistory([]);
    setTab("detail");
    setError("");
    setFieldErrors({});
  }, [issue?.id, issue?.updatedAt, createMode]);

  useEffect(() => {
    if (createMode || !issue || source === "demo") return;
    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/issues/${encodeURIComponent(issue.id)}?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as IssueDetailApiResponse;
        if (!body.ok) throw new Error("message" in body ? body.message : "Không tải được dữ liệu.");
        if (!cancelled) {
          setDraft(fromIssue(body.data.issue));
          setHistory(body.data.history);
        }
      })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : "Không tải được chi tiết ISSUE."))
      .finally(() => !cancelled && setLoadingDetail(false));
    return () => { cancelled = true; };
  }, [createMode, issue?.id, issue?.updatedAt, projectId, source]);

  const title = createMode ? "Tạo ISSUE mới" : `ISSUE #${issue?.issueNo ?? "—"}`;
  const subtitle = createMode ? "Tạo yêu cầu trong project đang chọn • Wide Modal" : "Chi tiết • chỉnh sửa • lịch sử thay đổi • Wide Modal";
  const writable = canEdit && source === "database";

  const assigneeOptions = useMemo(() => {
    const currentId = draft.assigneeId;
    if (!currentId || lookups.assignees.some((option) => option.value === currentId)) {
      return [{ value: "", label: "Chưa phụ trách" }, ...lookups.assignees];
    }
    return [
      { value: "", label: "Chưa phụ trách" },
      {
        value: currentId,
        label: `${issue?.assigneeName ?? "Phụ trách cũ"} • Legacy`,
        description: "Không còn là thành viên Project — chỉ giữ để hiển thị lịch sử",
        disabled: true,
      },
      ...lookups.assignees,
    ];
  }, [draft.assigneeId, issue?.assigneeName, lookups.assignees]);

  const payload = useMemo(() => ({
    projectId,
    content: draft.content,
    statusCode: draft.statusCode || null,
    customerStatusCode: draft.customerStatusCode || null,
    priorityCode: draft.priorityCode || null,
    stageCode: draft.stageCode || null,
    jiraUrl: draft.jiraUrl || null,
    releaseDate: draft.releaseDate || null,
    dueDate: draft.dueDate || null,
    moduleId: draft.moduleId || null,
    departmentId: draft.departmentId || null,
    requesterId: draft.requesterId || null,
    assigneeId: draft.assigneeId || null,
    response: draft.response || null,
    notes: draft.notes || null,
  }), [draft, projectId]);

  function validateBeforeSave() {
    const errors: Record<string, string> = {};
    if (!draft.content.trim()) errors.content = "Nội dung ISSUE là bắt buộc.";
    if (!draft.statusCode) errors.statusCode = "Vui lòng chọn Trạng thái.";
    if (!draft.customerStatusCode) errors.customerStatusCode = "Vui lòng chọn Trạng thái khách hàng.";
    if (!draft.priorityCode) errors.priorityCode = "Vui lòng chọn Ưu tiên.";
    if (draft.jiraUrl.trim()) {
      try {
        const url = new URL(draft.jiraUrl.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
      } catch {
        errors.jiraUrl = "Link Jira phải là URL http/https hợp lệ.";
      }
    }
    return errors;
  }

  async function save() {
    if (!writable || saving) return;
    const clientErrors = validateBeforeSave();
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      setError(`Chưa thể ${createMode ? "tạo" : "lưu"} ISSUE. Vui lòng bổ sung/kiểm tra các trường được đánh dấu bên dưới.`);
      return;
    }
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch(createMode ? "/api/issues" : `/api/issues/${encodeURIComponent(issue!.id)}`, {
        method: createMode ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as IssueMutationResponse;
      if (!body.ok) {
        setFieldErrors("fieldErrors" in body ? body.fieldErrors ?? {} : {});
        throw new Error("message" in body ? body.message : "Không lưu được ISSUE.");
      }
      onSaved(body.issue);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được ISSUE.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteIssue() {
    if (!issue || !canArchive || source !== "database" || archiving) return;
    if (!window.confirm(`Xóa ISSUE #${issue.issueNo ?? "—"}? ISSUE sẽ được ẩn khỏi danh sách hoạt động nhưng vẫn được lưu an toàn để phục hồi khi cần.`)) return;
    setArchiving(true);
    setError("");
    try {
      const response = await fetch(`/api/issues/${encodeURIComponent(issue.id)}?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" });
      const body = (await response.json()) as IssueMutationResponse;
      if (!body.ok) throw new Error("message" in body ? body.message : "Không tải được dữ liệu.");
      onArchived(issue.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xóa được ISSUE.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 md:p-6">
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <section className="relative flex h-[min(90dvh,920px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#07111f] shadow-[0_28px_100px_rgba(0,0,0,0.55)]">
        <div className="glow-line flex items-start gap-4 border-b border-white/[0.06] px-5 py-5 md:px-6">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">ISSUE Productivity</div>
            <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.025em] text-white">{title}</h2>
            <div className="mt-1 text-[10px] text-slate-600">{subtitle}</div>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:bg-white/[0.04] hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        {!createMode ? (
          <div className="flex gap-1 border-b border-white/[0.05] px-5 py-2 md:px-6">
            {[
              ["detail", "Chi tiết", Check],
              ["history", `Lịch sử ${history.length ? `(${history.length})` : ""}`, History],
            ].map(([value, label, Icon]) => {
              const C = Icon as typeof Check;
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setTab(value as "detail" | "history")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-medium transition",
                    tab === value ? "bg-cyan-300/[0.08] text-cyan-100" : "text-slate-600 hover:text-slate-300",
                  )}
                >
                  <C className="size-3.5" /> {String(label)}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {loadingDetail ? (
            <div className="grid min-h-[300px] place-items-center">
              <div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-cyan-300/70" /><div className="mt-3 text-xs text-slate-500">Đang tải chi tiết...</div></div>
            </div>
          ) : tab === "history" && !createMode ? (
            <div className="space-y-3">
              {history.length ? history.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025]"><Clock3 className="size-3.5 text-cyan-300/55" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-medium text-slate-300">{historyLabels[item.fieldName] ?? item.fieldName}</div>
                        <div className="text-[9px] text-slate-700">{dateTime(item.changedAt)}</div>
                      </div>
                      {item.fieldName !== "created" ? (
                        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px]">
                          <div className="truncate rounded-lg bg-rose-300/[0.04] px-2 py-1.5 text-slate-600">{historyValue(item.fieldName, item.oldValue, lookups)}</div>
                          <span className="text-slate-700">→</span>
                          <div className="truncate rounded-lg bg-emerald-300/[0.04] px-2 py-1.5 text-slate-500">{historyValue(item.fieldName, item.newValue, lookups)}</div>
                        </div>
                      ) : null}
                      <div className="mt-2 text-[9px] text-slate-700">{item.actorName || item.actorEmail || "System / Import"}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] p-8 text-center text-xs text-slate-600">Chưa có lịch sử thay đổi.</div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {source === "demo" ? (
                <div className="rounded-xl border border-amber-300/12 bg-amber-300/[0.045] px-4 py-3 text-[10px] leading-5 text-amber-100/55">
                  Demo Mode chỉ cho xem giao diện. Kết nối Supabase để tạo và cập nhật ISSUE thật.
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-rose-300/18 bg-rose-300/[0.06] px-4 py-3 text-xs text-rose-100/90">
                  <div className="flex gap-2 font-medium"><ShieldAlert className="mt-0.5 size-4 shrink-0" /> {error}</div>
                  {Object.keys(fieldErrors).length ? (
                    <ul className="mt-2 space-y-1 pl-6 text-[10px] leading-4 text-rose-200/80">
                      {Object.entries(fieldErrors).map(([field, message]) => <li key={field}>• {message}</li>)}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div>
                <FieldLabel>Nội dung yêu cầu *</FieldLabel>
                <textarea
                  value={draft.content}
                  disabled={!writable}
                  onChange={(e) => setDraft((current) => ({ ...current, content: e.target.value }))}
                  rows={5}
                  placeholder="Mô tả ISSUE / yêu cầu nghiệp vụ..."
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/10 px-3.5 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-300/25 disabled:opacity-65"
                />
                <FieldError message={fieldErrors.content} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div><FieldLabel>Trạng thái *</FieldLabel><ThemedSelect ariaLabel="Trạng thái" disabled={!writable} value={draft.statusCode} onChange={(value) => setDraft((c) => ({ ...c, statusCode: value }))} options={lookups.statuses} /><FieldError message={fieldErrors.statusCode} /></div>
                <div><FieldLabel>Trạng thái khách hàng *</FieldLabel><ThemedSelect ariaLabel="Trạng thái khách hàng" disabled={!writable} value={draft.customerStatusCode} onChange={(value) => setDraft((c) => ({ ...c, customerStatusCode: value }))} options={lookups.customerStatuses} /><FieldError message={fieldErrors.customerStatusCode} /></div>
                <div><FieldLabel>Ưu tiên *</FieldLabel><ThemedSelect ariaLabel="Ưu tiên" disabled={!writable} value={draft.priorityCode} onChange={(value) => setDraft((c) => ({ ...c, priorityCode: value }))} options={lookups.priorities} /><FieldError message={fieldErrors.priorityCode} /></div>
                <div><FieldLabel>Giai đoạn</FieldLabel><ThemedSelect ariaLabel="Giai đoạn" disabled={!writable} value={draft.stageCode} onChange={(value) => setDraft((c) => ({ ...c, stageCode: value }))} options={[{ value: "", label: "Chưa gán" }, ...lookups.stages]} placeholder="Chưa gán" /><FieldError message={fieldErrors.stageCode} /></div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div><FieldLabel>Module</FieldLabel><ThemedSelect ariaLabel="Module" disabled={!writable} value={draft.moduleId} onChange={(value) => setDraft((c) => ({ ...c, moduleId: value }))} options={[{ value: "", label: "Chưa xác định Module" }, ...lookups.modules]} placeholder="Chưa xác định Module" menuClassName="min-w-[360px]" /><FieldError message={fieldErrors.moduleId} /></div>
                <div><FieldLabel>Phòng ban</FieldLabel><ThemedSelect ariaLabel="Phòng ban" disabled={!writable} value={draft.departmentId} onChange={(value) => setDraft((c) => ({ ...c, departmentId: value }))} options={[{ value: "", label: "Chưa xác định Phòng ban" }, ...lookups.departments]} placeholder="Chưa xác định Phòng ban" /><FieldError message={fieldErrors.departmentId} /></div>
                <div><FieldLabel>Nhân sự yêu cầu</FieldLabel><ThemedSelect ariaLabel="Nhân sự yêu cầu" disabled={!writable} value={draft.requesterId} onChange={(value) => setDraft((c) => ({ ...c, requesterId: value }))} options={[{ value: "", label: "Chưa xác định" }, ...lookups.requesters]} placeholder="Chưa xác định" /><FieldError message={fieldErrors.requesterId} /></div>
                <div><FieldLabel>Phụ trách yêu cầu</FieldLabel><ThemedSelect ariaLabel="Phụ trách" disabled={!writable} value={draft.assigneeId} onChange={(value) => setDraft((c) => ({ ...c, assigneeId: value }))} options={assigneeOptions} placeholder="Chưa phụ trách" /><FieldError message={fieldErrors.assigneeId} /></div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block"><FieldLabel>Due Date</FieldLabel><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" /><input type="date" disabled={!writable} value={draft.dueDate} onChange={(e) => setDraft((c) => ({ ...c, dueDate: e.target.value }))} className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none focus:border-cyan-300/25 disabled:opacity-65" /></div><FieldError message={fieldErrors.dueDate} /></label>
                <label className="block"><FieldLabel>Ngày release</FieldLabel><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" /><input type="date" disabled={!writable} value={draft.releaseDate} onChange={(e) => setDraft((c) => ({ ...c, releaseDate: e.target.value }))} className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/10 pl-9 pr-3 text-xs text-slate-300 outline-none focus:border-cyan-300/25 disabled:opacity-65" /></div><FieldError message={fieldErrors.releaseDate} /></label>
              </div>

              <div>
                <FieldLabel>Link Jira</FieldLabel>
                <div className="flex gap-2">
                  <input disabled={!writable} value={draft.jiraUrl} onChange={(e) => setDraft((c) => ({ ...c, jiraUrl: e.target.value }))} placeholder="https://.../browse/PROJECT-123" className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/10 px-3.5 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/25 disabled:opacity-65" />
                  {draft.jiraUrl ? <a href={draft.jiraUrl} target="_blank" rel="noreferrer" className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-slate-500 hover:border-cyan-300/18 hover:text-cyan-200"><ExternalLink className="size-3.5" /></a> : null}
                </div>
                <FieldError message={fieldErrors.jiraUrl} />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div><FieldLabel>ASC phản hồi</FieldLabel><textarea disabled={!writable} value={draft.response} onChange={(e) => setDraft((c) => ({ ...c, response: e.target.value }))} rows={4} placeholder="Nội dung phản hồi / hướng xử lý..." className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/10 px-3.5 py-3 text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/25 disabled:opacity-65" /></div>
                <div><FieldLabel>Ghi chú</FieldLabel><textarea disabled={!writable} value={draft.notes} onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))} rows={4} placeholder="Ghi chú nội bộ..." className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/10 px-3.5 py-3 text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-300/25 disabled:opacity-65" /></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/[0.06] bg-[#07111f]/95 px-5 py-4 md:px-6">
          {!createMode && canArchive && source === "database" ? (
            <button type="button" disabled={archiving || saving} onClick={deleteIssue} className="flex h-10 items-center gap-2 rounded-xl border border-rose-300/12 bg-rose-300/[0.04] px-3 text-xs font-medium text-rose-200/70 hover:bg-rose-300/[0.07] disabled:opacity-45">
              {archiving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} {archiving ? "Đang xóa..." : "Xóa ISSUE"}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="ml-auto h-10 rounded-xl border border-white/[0.08] px-4 text-xs text-slate-500 hover:text-slate-200">Đóng</button>
          {writable ? (
            <button type="button" disabled={saving || archiving} onClick={save} className="flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f] hover:bg-cyan-200 disabled:opacity-55">
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} {saving ? "Đang lưu..." : createMode ? "Tạo ISSUE" : "Lưu thay đổi"}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
