import type {
  MasterPlan,
  PlanScheduleMode,
  PlanSummary,
  ProjectMilestone,
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

export function calculateSequentialSchedule(
  startDate: string,
  mode: PlanScheduleMode,
  stages: ProjectPlanStage[],
) {
  let cursor = normalizeScheduleStart(startDate, mode);
  return [...stages]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, "vi"))
    .map((stage) => {
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
  const blocked = stages.some((stage) => stage.status === "blocked");

  let health: PlanSummary["health"] = "no_plan";
  if (masterPlan?.status === "completed") health = "completed";
  else if (masterPlan) {
    if ((varianceDays !== null && varianceDays > 0) || (masterPlan.targetEndDate && masterPlan.targetEndDate < today && overallProgress < 100)) health = "late";
    else if (blocked || overdueMilestones > 0 || milestones.some((milestone) => milestone.status === "at_risk")) health = "at_risk";
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
    health,
  };
}
