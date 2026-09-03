import type {
  MasterPlan,
  PlanScheduleMode,
  PlanSummary,
  MilestoneChecklistItem,
  ProjectMilestone,
  ProjectPlanTask,
  ProjectPlanStage,
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

export function buildPlanSummary(
  masterPlan: MasterPlan | null,
  stages: ProjectPlanStage[],
  milestones: ProjectMilestone[],
  tasks: ProjectPlanTask[] = [],
  checklistItems: MilestoneChecklistItem[] = [],
  today = new Date().toISOString().slice(0, 10),
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
    else if (blocked || blockedTasks > 0 || overdueTasks > 0 || overdueMilestones > 0 || milestones.some((milestone) => milestone.status === "at_risk")) health = "at_risk";
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
    executionProgress,
    health,
  };
}
