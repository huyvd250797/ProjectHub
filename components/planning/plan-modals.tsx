"use client";

import { CalendarClock, CalendarRange, Check, CheckSquare2, ClipboardList, Flag, Layers3, LoaderCircle, Save, Target, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ThemedSelect } from "@/components/ui/themed-select";
import { addScheduleDuration, countScheduleDays } from "@/lib/planning/schedule";
import type {
  MasterPlan,
  MasterPlanStatus,
  MilestoneChecklistItem,
  MilestoneStatus,
  PlanTaskPriority,
  PlanTaskStatus,
  PlanPerson,
  PlanScheduleMode,
  PlanningMutationResponse,
  ProjectMilestone,
  ProjectPlanTask,
  ProjectPlanStage,
  ProjectStageDateMode,
  ProjectStageStatus,
} from "@/lib/planning/types";

const masterStatusOptions = [
  { value: "draft", label: "Bản nháp", description: "Đang xây dựng kế hoạch" },
  { value: "active", label: "Đang thực hiện", description: "Kế hoạch đang được triển khai" },
  { value: "on_hold", label: "Tạm dừng", description: "Kế hoạch đang tạm dừng" },
  { value: "completed", label: "Hoàn tất", description: "Kế hoạch đã hoàn thành" },
];

const scheduleOptions = [
  { value: "calendar_days", label: "Ngày lịch", description: "Tính cả thứ Bảy và Chủ nhật" },
  { value: "business_days", label: "Ngày làm việc", description: "Bỏ qua thứ Bảy và Chủ nhật" },
];

const stageStatusOptions = [
  { value: "not_started", label: "Chưa bắt đầu" },
  { value: "in_progress", label: "Đang thực hiện" },
  { value: "blocked", label: "Bị chặn" },
  { value: "completed", label: "Hoàn tất" },
];

const stageDateModeOptions = [
  { value: "manual", label: "Nhập Từ ngày – Đến ngày", description: "Giữ cố định khoảng ngày bạn nhập" },
  { value: "auto", label: "Tự động theo Master Plan", description: "Xếp nối tiếp theo thứ tự và số ngày" },
];

const milestoneStatusOptions = [
  { value: "pending", label: "Chờ thực hiện" },
  { value: "at_risk", label: "Có rủi ro" },
  { value: "completed", label: "Hoàn tất" },
  { value: "missed", label: "Không đạt" },
];

const taskStatusOptions = [
  { value: "todo", label: "Chưa làm" },
  { value: "doing", label: "Đang làm" },
  { value: "blocked", label: "Bị chặn" },
  { value: "done", label: "Hoàn tất" },
];

const taskPriorityOptions = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "critical", label: "Khẩn cấp" },
];

const stageColors = ["#22D3EE", "#8B5CF6", "#F59E0B", "#10B981", "#F43F5E", "#3B82F6", "#EC4899", "#84CC16"];

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return <label className="mb-1.5 block text-[10px] font-medium text-slate-500">{children}{required ? <span className="ml-1 text-rose-300">*</span> : null}</label>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="mt-1.5 text-[10px] text-rose-300">{message}</div> : null;
}

function ModalShell({
  eyebrow,
  title,
  description,
  icon,
  saving,
  onClose,
  onSubmit,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-3 md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng modal" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="tech-panel relative z-10 flex max-h-[92vh] w-full max-w-[940px] flex-col overflow-hidden rounded-2xl border-cyan-300/15 shadow-[0_30px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-start gap-4 border-b border-white/[0.07] px-5 py-4 md:px-6 md:py-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65">{eyebrow}</div>
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] text-slate-500 hover:text-white" aria-label="Đóng"><X className="size-4" /></button>
        </div>
        <div className="scrollbar-thin overflow-y-auto p-5 md:p-6">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-4 md:px-6">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/[0.08] px-4 text-xs text-slate-500 hover:text-slate-200">Hủy</button>
          <button type="submit" disabled={saving} className="flex h-10 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.1] px-4 text-xs font-medium text-cyan-100 hover:bg-cyan-300/[0.15] disabled:opacity-45">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi</button>
        </div>
      </form>
    </div>
  );
}

async function readMutation(response: Response) {
  const body = (await response.json()) as PlanningMutationResponse;
  if (!body.ok) throw Object.assign(new Error(body.message), { fieldErrors: body.fieldErrors ?? {} });
  return body;
}

function mutationError(error: unknown) {
  const candidate = error as { message?: string; fieldErrors?: Record<string, string> };
  return { message: candidate?.message ?? "Không lưu được dữ liệu.", fieldErrors: candidate?.fieldErrors ?? {} };
}

export function MasterPlanModal({
  projectId,
  projectName,
  plan,
  onClose,
  onSaved,
}: {
  projectId: string;
  projectName: string;
  plan: MasterPlan | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState(plan?.title ?? `Master Plan ${projectName}`);
  const [objective, setObjective] = useState(plan?.objective ?? "");
  const [startDate, setStartDate] = useState(plan?.startDate ?? new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEndDate] = useState(plan?.targetEndDate ?? "");
  const [scheduleMode, setScheduleMode] = useState<PlanScheduleMode>(plan?.scheduleMode ?? "business_days");
  const [status, setStatus] = useState<MasterPlanStatus>(plan?.status ?? "draft");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setFieldErrors({});
    try {
      const result = await readMutation(await fetch("/api/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, objective, startDate, targetEndDate, scheduleMode, status, notes, recalculate: true }),
      }));
      onSaved(result.message);
    } catch (reason) {
      const parsed = mutationError(reason); setError(parsed.message); setFieldErrors(parsed.fieldErrors);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell eyebrow="Master Plan" title={plan ? "Cập nhật Master Plan" : "Khởi tạo Master Plan"} description="Ngày bắt đầu và cách tính ngày sẽ điều khiển lịch tuần tự của toàn bộ Project Stages." icon={<Target className="size-5" />} saving={saving} onClose={onClose} onSubmit={submit}>
      {error ? <div className="mb-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2"><FieldLabel required>Tên Master Plan</FieldLabel><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Master Plan triển khai EPU" /><FieldError message={fieldErrors.title} /></div>
        <div className="md:col-span-2"><FieldLabel>Mục tiêu tổng thể</FieldLabel><textarea className="field min-h-24 resize-y py-3" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Mô tả kết quả dự án cần đạt..." /><FieldError message={fieldErrors.objective} /></div>
        <div><FieldLabel required>Ngày bắt đầu</FieldLabel><input type="date" className="field" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><FieldError message={fieldErrors.startDate} /></div>
        <div><FieldLabel>Ngày kết thúc mục tiêu</FieldLabel><input type="date" className="field" min={startDate || undefined} value={targetEndDate} onChange={(event) => setTargetEndDate(event.target.value)} /><FieldError message={fieldErrors.targetEndDate} /></div>
        <div><FieldLabel required>Cách tính thời lượng</FieldLabel><ThemedSelect value={scheduleMode} onChange={(value) => setScheduleMode(value as PlanScheduleMode)} options={scheduleOptions} ariaLabel="Cách tính thời lượng" leading={<CalendarClock className="size-3.5" />} /><FieldError message={fieldErrors.scheduleMode} /></div>
        <div><FieldLabel required>Trạng thái kế hoạch</FieldLabel><ThemedSelect value={status} onChange={(value) => setStatus(value as MasterPlanStatus)} options={masterStatusOptions} ariaLabel="Trạng thái Master Plan" /><FieldError message={fieldErrors.status} /></div>
        <div className="md:col-span-2"><FieldLabel>Ghi chú điều hành</FieldLabel><textarea className="field min-h-28 resize-y py-3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Giả định, ràng buộc, nguyên tắc điều phối..." /><FieldError message={fieldErrors.notes} /></div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 text-[10px] leading-5 text-slate-500"><Check className="mt-0.5 size-4 shrink-0 text-cyan-300/70" /><span>Khi lưu, hệ thống tính lại các stage ở chế độ tự động nhưng giữ nguyên Từ ngày – Đến ngày đã nhập thủ công. Ngày Master Plan cũng đồng bộ sang hồ sơ Project để Dashboard và Analytics sử dụng.</span></div>
    </ModalShell>
  );
}

export function StageModal({
  projectId,
  stage,
  suggestedCode,
  suggestedStartDate,
  scheduleMode,
  people,
  onClose,
  onSaved,
}: {
  projectId: string;
  stage: ProjectPlanStage | null;
  suggestedCode: string;
  suggestedStartDate: string;
  scheduleMode: PlanScheduleMode;
  people: PlanPerson[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [code, setCode] = useState(stage?.code ?? suggestedCode);
  const [name, setName] = useState(stage?.name ?? "");
  const [description, setDescription] = useState(stage?.description ?? "");
  const [dateMode, setDateMode] = useState<ProjectStageDateMode>(stage?.dateMode ?? "manual");
  const [startDate, setStartDate] = useState(stage?.startDate ?? suggestedStartDate);
  const [endDate, setEndDate] = useState(stage?.endDate ?? (suggestedStartDate ? addScheduleDuration(suggestedStartDate, 5, scheduleMode) : ""));
  const [durationDays, setDurationDays] = useState(String(stage?.durationDays ?? 5));
  const [status, setStatus] = useState<ProjectStageStatus>(stage?.status ?? "not_started");
  const [progress, setProgress] = useState(stage?.progress ?? 0);
  const [color, setColor] = useState(stage?.color ?? stageColors[0]);
  const [ownerId, setOwnerId] = useState(stage?.ownerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const manualDuration = useMemo(
    () => dateMode === "manual" ? countScheduleDays(startDate, endDate, scheduleMode) : 0,
    [dateMode, endDate, scheduleMode, startDate],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateMode === "manual" && (manualDuration < 1 || manualDuration > 3_650)) {
      setError("Vui lòng kiểm tra lại khoảng ngày stage.");
      setFieldErrors({ endDate: manualDuration < 1 ? "Khoảng đã chọn không có ngày làm việc." : "Khoảng ngày tối đa 3.650 ngày theo lịch Master Plan." });
      return;
    }
    setSaving(true); setError(""); setFieldErrors({});
    try {
      const result = await readMutation(await fetch(stage ? `/api/plan/stages/${stage.id}` : "/api/plan/stages", {
        method: stage ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, code, name, description, durationDays: dateMode === "manual" ? Math.max(1, manualDuration) : durationDays, dateMode, startDate, endDate, status, progress, color, ownerId, sortOrder: stage?.sortOrder ?? null, recalculate: true }),
      }));
      onSaved(result.message);
    } catch (reason) {
      const parsed = mutationError(reason); setError(parsed.message); setFieldErrors(parsed.fieldErrors);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell eyebrow="Project Stages" title={stage ? `Cập nhật ${stage.code}` : "Thêm Project Stage"} description="Nhập trực tiếp Từ ngày – Đến ngày, hoặc để hệ thống xếp lịch tự động theo Master Plan." icon={<Layers3 className="size-5" />} saving={saving} onClose={onClose} onSubmit={submit}>
      {error ? <div className="mb-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div><FieldLabel required>Mã stage</FieldLabel><input className="field uppercase disabled:cursor-not-allowed disabled:opacity-55" disabled={Boolean(stage)} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="STAGE-01" /><FieldError message={fieldErrors.code} />{stage ? <div className="mt-1.5 text-[9px] text-slate-600">Mã được khóa để giữ liên kết ISSUE hiện có.</div> : null}</div>
        <div><FieldLabel required>Tên stage</FieldLabel><input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Khảo sát & Phân tích" /><FieldError message={fieldErrors.name} /></div>
        <div className="md:col-span-2"><FieldLabel>Mô tả / đầu ra chính</FieldLabel><textarea className="field min-h-24 resize-y py-3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Các hoạt động và kết quả cần bàn giao trong stage..." /><FieldError message={fieldErrors.description} /></div>
        <div className="md:col-span-2"><FieldLabel required>Cách lập lịch stage</FieldLabel><ThemedSelect value={dateMode} onChange={(value) => setDateMode(value as ProjectStageDateMode)} options={stageDateModeOptions} ariaLabel="Cách lập lịch stage" leading={<CalendarRange className="size-3.5" />} /><FieldError message={fieldErrors.dateMode} /></div>
        <div className="md:col-span-2 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div><FieldLabel required={dateMode === "manual"}>Từ ngày</FieldLabel><input type="date" required={dateMode === "manual"} disabled={dateMode === "auto"} className="field disabled:cursor-not-allowed disabled:opacity-55" value={startDate} onChange={(event) => { const value = event.target.value; setStartDate(value); if (endDate && value && endDate < value) setEndDate(value); }} /><FieldError message={fieldErrors.startDate} /></div>
          <div><FieldLabel required={dateMode === "manual"}>Đến ngày</FieldLabel><input type="date" required={dateMode === "manual"} min={startDate || undefined} disabled={dateMode === "auto"} className="field disabled:cursor-not-allowed disabled:opacity-55" value={endDate} onChange={(event) => setEndDate(event.target.value)} /><FieldError message={fieldErrors.endDate} /></div>
          <div><FieldLabel required>Số ngày</FieldLabel><input type="number" min="1" max="3650" readOnly={dateMode === "manual"} className="field read-only:cursor-default read-only:bg-white/[0.02]" value={dateMode === "manual" ? manualDuration || "" : durationDays} onChange={(event) => setDurationDays(event.target.value)} /><FieldError message={fieldErrors.durationDays} /><div className="mt-1.5 text-[9px] text-slate-600">{dateMode === "manual" ? `Tự tính theo ${scheduleMode === "business_days" ? "ngày làm việc" : "ngày lịch"}.` : "Dùng để xếp lịch tự động."}</div></div>
        </div>
        <div><FieldLabel>Người phụ trách</FieldLabel><ThemedSelect value={ownerId} onChange={setOwnerId} options={[{ value: "", label: "Chưa phân công" }, ...people]} ariaLabel="Người phụ trách stage" placeholder="Chưa phân công" /><FieldError message={fieldErrors.ownerId} /></div>
        <div><FieldLabel required>Trạng thái</FieldLabel><ThemedSelect value={status} onChange={(value) => { const next = value as ProjectStageStatus; setStatus(next); if (next === "completed") setProgress(100); }} options={stageStatusOptions} ariaLabel="Trạng thái stage" /><FieldError message={fieldErrors.status} /></div>
        <div><FieldLabel required>Tiến độ: {progress}%</FieldLabel><div className="flex h-10 items-center gap-3 rounded-xl border border-white/[0.08] bg-black/10 px-3"><input type="range" min="0" max="100" step="5" value={progress} onChange={(event) => { const value = Number(event.target.value); setProgress(value); if (value === 100) setStatus("completed"); else if (value > 0 && status === "not_started") setStatus("in_progress"); }} className="w-full accent-cyan-300" /><span className="w-9 text-right text-[10px] font-semibold text-slate-300">{progress}%</span></div><FieldError message={fieldErrors.progress} /></div>
        <div className="md:col-span-2"><FieldLabel>Màu Timeline</FieldLabel><div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-black/10 p-3">{stageColors.map((item) => <button key={item} type="button" onClick={() => setColor(item)} className="relative size-8 rounded-lg border transition" style={{ backgroundColor: `${item}22`, borderColor: color === item ? item : `${item}55` }} aria-label={`Chọn màu ${item}`}>{color === item ? <Check className="absolute inset-0 m-auto size-4" style={{ color: item }} /> : <span className="absolute inset-2 rounded-full" style={{ backgroundColor: item }} />}</button>)}<input type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} className="ml-1 size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label="Chọn màu tùy chỉnh" /><span className="ml-1 text-[10px] font-medium text-slate-500">{color}</span></div><FieldError message={fieldErrors.color} /></div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 text-[10px] leading-5 text-slate-500"><CalendarRange className="mt-0.5 size-4 shrink-0 text-cyan-300/70" /><span>{dateMode === "manual" ? "Khoảng ngày thủ công được giữ nguyên khi đổi thứ tự hoặc chọn “Tính lại lịch”. Các stage tự động phía sau sẽ tiếp tục từ ngày kết thúc này." : "Ngày của stage sẽ được tính lại từ Master Plan theo thứ tự stage; bạn chỉ cần nhập số ngày."}</span></div>
    </ModalShell>
  );
}

export function MilestoneModal({
  projectId,
  milestone,
  defaultDate,
  stages,
  people,
  onClose,
  onSaved,
}: {
  projectId: string;
  milestone: ProjectMilestone | null;
  defaultDate: string;
  stages: ProjectPlanStage[];
  people: PlanPerson[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [dueDate, setDueDate] = useState(milestone?.dueDate ?? defaultDate);
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? "pending");
  const [stageId, setStageId] = useState(milestone?.stageId ?? "");
  const [ownerId, setOwnerId] = useState(milestone?.ownerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setFieldErrors({});
    try {
      const result = await readMutation(await fetch(milestone ? `/api/plan/milestones/${milestone.id}` : "/api/plan/milestones", {
        method: milestone ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, description, dueDate, status, stageId, ownerId, sortOrder: milestone?.sortOrder ?? null }),
      }));
      onSaved(result.message);
    } catch (reason) {
      const parsed = mutationError(reason); setError(parsed.message); setFieldErrors(parsed.fieldErrors);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell eyebrow="Milestone" title={milestone ? "Cập nhật Milestone" : "Thêm Milestone"} description="Đánh dấu một mốc phê duyệt, bàn giao hoặc quyết định quan trọng trên timeline." icon={<Flag className="size-5" />} saving={saving} onClose={onClose} onSubmit={submit}>
      {error ? <div className="mb-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2"><FieldLabel required>Tên milestone</FieldLabel><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Ký xác nhận tài liệu khảo sát" /><FieldError message={fieldErrors.title} /></div>
        <div className="md:col-span-2"><FieldLabel>Mô tả / tiêu chí hoàn thành</FieldLabel><textarea className="field min-h-24 resize-y py-3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Điều kiện để milestone được xem là hoàn tất..." /><FieldError message={fieldErrors.description} /></div>
        <div><FieldLabel required>Ngày milestone</FieldLabel><input type="date" className="field" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><FieldError message={fieldErrors.dueDate} /></div>
        <div><FieldLabel required>Trạng thái</FieldLabel><ThemedSelect value={status} onChange={(value) => setStatus(value as MilestoneStatus)} options={milestoneStatusOptions} ariaLabel="Trạng thái milestone" /><FieldError message={fieldErrors.status} /></div>
        <div><FieldLabel>Thuộc stage</FieldLabel><ThemedSelect value={stageId} onChange={(value) => { setStageId(value); const stage = stages.find((item) => item.id === value); if (!milestone && stage?.endDate) setDueDate(stage.endDate); }} options={[{ value: "", label: "Milestone độc lập" }, ...stages.map((stage) => ({ value: stage.id, label: stage.name, description: `${stage.code} • kết thúc ${stage.endDate ?? "chưa có lịch"}` }))]} ariaLabel="Stage của milestone" /><FieldError message={fieldErrors.stageId} /></div>
        <div><FieldLabel>Người phụ trách</FieldLabel><ThemedSelect value={ownerId} onChange={setOwnerId} options={[{ value: "", label: "Chưa phân công" }, ...people]} ariaLabel="Người phụ trách milestone" /><FieldError message={fieldErrors.ownerId} /></div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-4 text-[10px] leading-5 text-slate-500"><Flag className="mt-0.5 size-4 shrink-0 text-amber-300/70" /><span>Milestone có ngày cố định và không tự dịch chuyển khi thời lượng stage thay đổi. Điều này giúp bạn nhìn thấy ngay mốc nào cần cập nhật sau khi timeline được tính lại.</span></div>
    </ModalShell>
  );
}

export function PlanTaskModal({
  projectId,
  task,
  defaultStageId,
  defaultDueDate,
  stages,
  people,
  onClose,
  onSaved,
}: {
  projectId: string;
  task: ProjectPlanTask | null;
  defaultStageId: string;
  defaultDueDate: string;
  stages: ProjectPlanStage[];
  people: PlanPerson[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [stageId, setStageId] = useState(task?.stageId ?? defaultStageId);
  const [status, setStatus] = useState<PlanTaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<PlanTaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate);
  const [ownerId, setOwnerId] = useState(task?.ownerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setFieldErrors({});
    try {
      const result = await readMutation(await fetch(task ? `/api/plan/tasks/${task.id}` : "/api/plan/tasks", {
        method: task ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, description, stageId, status, priority, dueDate, ownerId, sortOrder: task?.sortOrder ?? null }),
      }));
      onSaved(result.message);
    } catch (reason) {
      const parsed = mutationError(reason); setError(parsed.message); setFieldErrors(parsed.fieldErrors);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell eyebrow="Execution Task" title={task ? "Cập nhật task" : "Thêm task thực thi"} description="Chia nhỏ stage thành đầu việc có deadline, mức ưu tiên và trạng thái để theo dõi khi triển khai." icon={<ClipboardList className="size-5" />} saving={saving} onClose={onClose} onSubmit={submit}>
      {error ? <div className="mb-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2"><FieldLabel required>Tên task</FieldLabel><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Hoàn tất cấu hình phân hệ nhân sự" /><FieldError message={fieldErrors.title} /></div>
        <div className="md:col-span-2"><FieldLabel>Mô tả / kết quả mong đợi</FieldLabel><textarea className="field min-h-24 resize-y py-3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ghi rõ đầu ra hoặc tiêu chí hoàn thành..." /><FieldError message={fieldErrors.description} /></div>
        <div><FieldLabel>Thuộc stage</FieldLabel><ThemedSelect value={stageId} onChange={(value) => { setStageId(value); const stage = stages.find((item) => item.id === value); if (!task && stage?.endDate) setDueDate(stage.endDate); }} options={[{ value: "", label: "Task độc lập" }, ...stages.map((stage) => ({ value: stage.id, label: stage.name, description: `${stage.code} • ${stage.startDate ?? "?"} → ${stage.endDate ?? "?"}` }))]} ariaLabel="Stage của task" /><FieldError message={fieldErrors.stageId} /></div>
        <div><FieldLabel>Deadline</FieldLabel><input type="date" className="field" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><FieldError message={fieldErrors.dueDate} /></div>
        <div><FieldLabel required>Trạng thái task</FieldLabel><ThemedSelect value={status} onChange={(value) => setStatus(value as PlanTaskStatus)} options={taskStatusOptions} ariaLabel="Trạng thái task" /><FieldError message={fieldErrors.status} /></div>
        <div><FieldLabel required>Ưu tiên</FieldLabel><ThemedSelect value={priority} onChange={(value) => setPriority(value as PlanTaskPriority)} options={taskPriorityOptions} ariaLabel="Mức ưu tiên task" /><FieldError message={fieldErrors.priority} /></div>
        <div className="md:col-span-2"><FieldLabel>Người phụ trách</FieldLabel><ThemedSelect value={ownerId} onChange={setOwnerId} options={[{ value: "", label: "Chưa phân công" }, ...people]} ariaLabel="Người phụ trách task" placeholder="Chưa phân công" /><FieldError message={fieldErrors.ownerId} /></div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 text-[10px] leading-5 text-slate-500"><ClipboardList className="mt-0.5 size-4 shrink-0 text-cyan-300/70" /><span>Task quá deadline khi chưa hoàn tất sẽ được đưa vào cảnh báo Execution Dashboard. Task bị chặn cũng tự đẩy Health sang trạng thái cần chú ý.</span></div>
    </ModalShell>
  );
}

export function MilestoneChecklistModal({
  projectId,
  item,
  milestoneId,
  milestones,
  onClose,
  onSaved,
}: {
  projectId: string;
  item: MilestoneChecklistItem | null;
  milestoneId: string;
  milestones: ProjectMilestone[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(item?.milestoneId ?? milestoneId);
  const [isDone, setIsDone] = useState(item?.isDone ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setFieldErrors({});
    try {
      const result = await readMutation(await fetch(item ? `/api/plan/checklist/${item.id}` : "/api/plan/checklist", {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, milestoneId: selectedMilestoneId, title, isDone, sortOrder: item?.sortOrder ?? null }),
      }));
      onSaved(result.message);
    } catch (reason) {
      const parsed = mutationError(reason); setError(parsed.message); setFieldErrors(parsed.fieldErrors);
    } finally { setSaving(false); }
  }

  return (
    <ModalShell eyebrow="Milestone Checklist" title={item ? "Cập nhật checklist" : "Thêm checklist milestone"} description="Chia milestone thành các điều kiện hoàn thành cụ thể để dễ nghiệm thu và kiểm tra." icon={<CheckSquare2 className="size-5" />} saving={saving} onClose={onClose} onSubmit={submit}>
      {error ? <div className="mb-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-xs text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2"><FieldLabel required>Nội dung checklist</FieldLabel><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Có biên bản xác nhận UAT" /><FieldError message={fieldErrors.title} /></div>
        <div><FieldLabel required>Milestone</FieldLabel><ThemedSelect value={selectedMilestoneId} onChange={setSelectedMilestoneId} options={milestones.map((milestone) => ({ value: milestone.id, label: milestone.title, description: milestone.dueDate }))} ariaLabel="Milestone của checklist" /><FieldError message={fieldErrors.milestoneId} /></div>
        <div><FieldLabel>Trạng thái</FieldLabel><button type="button" onClick={() => setIsDone((value) => !value)} className="flex h-10 w-full items-center justify-between rounded-xl border border-white/[0.08] bg-black/10 px-3 text-left text-xs text-slate-300"><span>{isDone ? "Đã hoàn tất" : "Chưa hoàn tất"}</span><Check className={isDone ? "size-4 text-emerald-300" : "size-4 text-slate-700"} /></button></div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-4 text-[10px] leading-5 text-slate-500"><CheckSquare2 className="mt-0.5 size-4 shrink-0 text-amber-300/70" /><span>Khi toàn bộ checklist xong, milestone có đủ căn cứ để chuyển sang Hoàn tất. Bản V1.7.0 chưa tự ép trạng thái milestone để bạn vẫn kiểm soát mốc nghiệm thu.</span></div>
    </ModalShell>
  );
}
