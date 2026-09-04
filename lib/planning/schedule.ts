import type {
  MasterPlan,
  PlanScheduleMode,
  PlanSummary,
  ProjectPlanReminder,
  MilestoneChecklistItem,
  ProjectMilestone,
  ProjectPlanTask,
  ProjectPlanStage,
  SmartPlanAlert,
} from "@/lib/planning/types";

const DAY_MS = 86_400_000;

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function diffCalendarDays(from: string, to: string) {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS);
}

export function isWeekend(value: Date) {
  return value.getUTCDay() === 0 || value.getUTCDay() === 6;
}

function nextBusinessDate(value: Date) {
  const result = new Date(value);
  while (isWeekend(result)) result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

export function normalizeScheduleStart(startDate: string, mode: PlanScheduleMode) {
  const parsed = parseDateOnly(startDate);
  return formatDateOnly(mode === "business_days" ? nextBusinessDate(parsed) : parsed);
}

export function addScheduleDuration(startDate: string, durationDays: number, mode: PlanScheduleMode) {
  const duration = Math.max(1, Math.trunc(durationDays));
  const cursor = parseDateOnly(normalizeScheduleStart(startDate, mode));
  let counted = 1;
  while (counted < duration) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (mode === "business_days" && isWeekend(cursor)) continue;
    counted += 1;
  }
  return formatDateOnly(cursor);
}

export function nextScheduleDate(endDate: string, mode: PlanScheduleMode) {
  const cursor = parseDateOnly(endDate);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  return formatDateOnly(mode === "business_days" ? nextBusinessDate(cursor) : cursor);
}

export function countScheduleDays(startDate: string, endDate: string, mode: PlanScheduleMode) {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const totalDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (mode !== "business_days") return totalDays;

  let counted = Math.floor(totalDays / 7) * 5;
  const remainder = totalDays % 7;
  for (let offset = 0; offset < remainder; offset += 1) {
    const weekday = (start.getUTCDay() + offset) % 7;
    if (weekday !== 0 && weekday !== 6) counted += 1;
  }
  return counted;
}

export function calculateSequentialSchedule(
  startDate: string,
  mode: PlanScheduleMode,
  stages: ProjectPlanStage[],
) {
  let cursor = normalizeScheduleStart(startDate, mode);
  return [...stages]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, "vi"))
    .map((stage) => {
      if (stage.dateMode === "manual" && stage.startDate && stage.endDate) {
        const durationDays = countScheduleDays(stage.startDate, stage.endDate, mode);
        if (stage.endDate >= cursor) cursor = nextScheduleDate(stage.endDate, mode);
        return { ...stage, durationDays: Math.max(1, durationDays) };
      }
      const endDate = addScheduleDuration(cursor, stage.durationDays, mode);
      const scheduled = { ...stage, startDate: cursor, endDate };
      cursor = nextScheduleDate(endDate, mode);
      return scheduled;
    });
}

function addDays(value: string, days: number) {
  const result = parseDateOnly(value);
  result.setUTCDate(result.getUTCDate() + days);
  return formatDateOnly(result);
}

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : null;
}

export function buildSmartPlanAlerts(
  stages: ProjectPlanStage[],
  milestones: ProjectMilestone[],
  tasks: ProjectPlanTask[] = [],
  reminders: ProjectPlanReminder[] = [],
  today = new Date().toISOString().slice(0, 10),
): SmartPlanAlert[] {
  const dueSoonDate = addDays(today, 7);
  const alerts: SmartPlanAlert[] = [];

  for (const stage of stages) {
    if (stage.status !== "completed" && stage.endDate && stage.endDate < today) {
      alerts.push({
        id: `stage-overdue-${stage.id}`,
        type: "stage_overdue",
        severity: "critical",
        title: `Stage trễ hạn: ${stage.name}`,
        summary: `${stage.code} kết thúc ngày ${stage.endDate} nhưng mới đạt ${stage.progress}%.`,
        dueDate: stage.endDate,
        entityType: "stage",
        entityId: stage.id,
        ownerName: stage.ownerName,
      });
    }
  }

  for (const milestone of milestones) {
    if (milestone.status === "completed") continue;
    if (milestone.dueDate < today) {
      alerts.push({
        id: `milestone-overdue-${milestone.id}`,
        type: "milestone_overdue",
        severity: "critical",
        title: `Milestone quá hạn: ${milestone.title}`,
        summary: `${milestone.stageName || "Milestone độc lập"} cần được xử lý hoặc cập nhật ngày.`,
        dueDate: milestone.dueDate,
        entityType: "milestone",
        entityId: milestone.id,
        ownerName: milestone.ownerName,
      });
    } else if (milestone.dueDate <= dueSoonDate) {
      alerts.push({
        id: `milestone-due-soon-${milestone.id}`,
        type: "milestone_due_soon",
        severity: milestone.status === "at_risk" ? "critical" : "warning",
        title: `Milestone sắp đến hạn: ${milestone.title}`,
        summary: `${milestone.stageName || "Milestone độc lập"} đến hạn trong 7 ngày.`,
        dueDate: milestone.dueDate,
        entityType: "milestone",
        entityId: milestone.id,
        ownerName: milestone.ownerName,
      });
    }
  }

  for (const task of tasks) {
    if (task.status === "done") continue;
    if (task.status === "blocked") {
      alerts.push({
        id: `task-blocked-${task.id}`,
        type: "task_blocked",
        severity: "critical",
        title: `Task bị chặn: ${task.title}`,
        summary: `${task.stageName || "Task độc lập"} cần gỡ blocker để không ảnh hưởng timeline.`,
        dueDate: task.dueDate,
        entityType: "task",
        entityId: task.id,
        ownerName: task.ownerName,
      });
    }
    if (task.dueDate && task.dueDate < today) {
      alerts.push({
        id: `task-overdue-${task.id}`,
        type: "task_overdue",
        severity: "critical",
        title: `Task quá hạn: ${task.title}`,
        summary: `${task.stageName || "Task độc lập"} chưa hoàn tất sau deadline.`,
        dueDate: task.dueDate,
        entityType: "task",
        entityId: task.id,
        ownerName: task.ownerName,
      });
    } else if (task.dueDate && task.dueDate <= dueSoonDate) {
      alerts.push({
        id: `task-due-soon-${task.id}`,
        type: "task_due_soon",
        severity: task.priority === "critical" || task.priority === "high" ? "warning" : "info",
        title: `Task sắp đến hạn: ${task.title}`,
        summary: `${task.stageName || "Task độc lập"} cần hoàn tất trong 7 ngày.`,
        dueDate: task.dueDate,
        entityType: "task",
        entityId: task.id,
        ownerName: task.ownerName,
      });
    }
  }

  for (const reminder of reminders) {
    if (reminder.status !== "open" && reminder.status !== "snoozed") continue;
    const activeAt = dateOnly(reminder.status === "snoozed" ? reminder.snoozedUntil : reminder.remindAt) ?? dateOnly(reminder.remindAt);
    if (!activeAt) continue;
    if (activeAt < today) {
      alerts.push({
        id: `reminder-overdue-${reminder.id}`,
        type: "reminder_overdue",
        severity: reminder.priority === "critical" ? "critical" : "warning",
        title: `Reminder quá hạn: ${reminder.title}`,
        summary: reminder.entityTitle || reminder.description || "Nhắc việc cần xử lý.",
        dueDate: activeAt,
        entityType: reminder.entityType,
        entityId: reminder.entityId,
        ownerName: reminder.ownerName,
      });
    } else if (activeAt === today) {
      alerts.push({
        id: `reminder-today-${reminder.id}`,
        type: "reminder_due_today",
        severity: reminder.priority === "critical" || reminder.priority === "high" ? "warning" : "info",
        title: `Reminder hôm nay: ${reminder.title}`,
        summary: reminder.entityTitle || reminder.description || "Nhắc việc đến hạn hôm nay.",
        dueDate: activeAt,
        entityType: reminder.entityType,
        entityId: reminder.entityId,
        ownerName: reminder.ownerName,
      });
    }
  }

  const weight = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => weight[a.severity] - weight[b.severity] || (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || a.title.localeCompare(b.title, "vi"));
}

export function buildPlanSummary(
  masterPlan: MasterPlan | null,
  stages: ProjectPlanStage[],
  milestones: ProjectMilestone[],
  tasks: ProjectPlanTask[] = [],
  checklistItems: MilestoneChecklistItem[] = [],
  reminders: ProjectPlanReminder[] = [],
  today = new Date().toISOString().slice(0, 10),
  smartAlerts: SmartPlanAlert[] = buildSmartPlanAlerts(stages, milestones, tasks, reminders, today),
): PlanSummary {
  const totalDurationDays = stages.reduce((total, stage) => total + Math.max(1, stage.durationDays), 0);
  const weightedTotal = stages.reduce((total, stage) => total + Math.max(1, stage.durationDays) * stage.progress, 0);
  const overallProgress = totalDurationDays ? Math.round(weightedTotal / totalDurationDays) : 0;
  const datedStages = stages.filter((stage) => stage.endDate);
  const forecastEndDate = datedStages.length
    ? datedStages.map((stage) => stage.endDate as string).sort().at(-1) ?? null
    : null;
  const varianceDays = masterPlan?.targetEndDate && forecastEndDate
    ? diffCalendarDays(masterPlan.targetEndDate, forecastEndDate)
    : null;
  const openMilestones = milestones
    .filter((milestone) => milestone.status !== "completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.sortOrder - b.sortOrder);
  const overdueMilestones = openMilestones.filter((milestone) => milestone.dueDate < today).length;
  const openTasks = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || a.sortOrder - b.sortOrder);
  const todayDate = parseDateOnly(today);
  const dueSoonLimit = new Date(todayDate);
  dueSoonLimit.setUTCDate(todayDate.getUTCDate() + 7);
  const dueSoonDate = formatDateOnly(dueSoonLimit);
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < today).length;
  const dueSoonTasks = openTasks.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= dueSoonDate).length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const completedChecklistItems = checklistItems.filter((item) => item.isDone).length;
  const activeReminders = reminders.filter((reminder) => reminder.status === "open" || reminder.status === "snoozed");
  const dueTodayReminders = activeReminders.filter((reminder) => (dateOnly(reminder.status === "snoozed" ? reminder.snoozedUntil : reminder.remindAt) ?? "") === today).length;
  const overdueReminders = activeReminders.filter((reminder) => (dateOnly(reminder.status === "snoozed" ? reminder.snoozedUntil : reminder.remindAt) ?? "9999-12-31") < today).length;
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : overallProgress;
  const checklistProgress = checklistItems.length ? Math.round((completedChecklistItems / checklistItems.length) * 100) : taskProgress;
  const executionProgress = tasks.length || checklistItems.length
    ? Math.round((taskProgress + checklistProgress + overallProgress) / 3)
    : overallProgress;
  const blocked = stages.some((stage) => stage.status === "blocked");

  let health: PlanSummary["health"] = "no_plan";
  if (masterPlan?.status === "completed") health = "completed";
  else if (masterPlan) {
    if ((varianceDays !== null && varianceDays > 0) || (masterPlan.targetEndDate && masterPlan.targetEndDate < today && overallProgress < 100)) health = "late";
    else if (blocked || blockedTasks > 0 || overdueTasks > 0 || overdueMilestones > 0 || overdueReminders > 0 || smartAlerts.some((alert) => alert.severity === "critical") || milestones.some((milestone) => milestone.status === "at_risk")) health = "at_risk";
    else health = "on_track";
  }

  return {
    totalDurationDays,
    forecastEndDate,
    varianceDays,
    overallProgress,
    completedStages: stages.filter((stage) => stage.status === "completed").length,
    stageCount: stages.length,
    completedMilestones: milestones.filter((milestone) => milestone.status === "completed").length,
    milestoneCount: milestones.length,
    overdueMilestones,
    nextMilestone: openMilestones[0] ?? null,
    taskCount: tasks.length,
    completedTasks,
    blockedTasks,
    overdueTasks,
    dueSoonTasks,
    nextTask: openTasks[0] ?? null,
    checklistCount: checklistItems.length,
    completedChecklistItems,
    reminderCount: reminders.length,
    openReminders: activeReminders.length,
    dueTodayReminders,
    overdueReminders,
    smartAlertCount: smartAlerts.length,
    executionProgress,
    health,
  };
}
