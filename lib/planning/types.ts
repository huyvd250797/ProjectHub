import type { ProjectRole } from "@/lib/issues/types";

export type PlanSource = "database" | "demo";
export type PlanScheduleMode = "calendar_days" | "business_days";
export type ProjectStageDateMode = "auto" | "manual";
export type MasterPlanStatus = "draft" | "active" | "on_hold" | "completed";
export type ProjectStageStatus = "not_started" | "in_progress" | "blocked" | "completed";
export type MilestoneStatus = "pending" | "at_risk" | "completed" | "missed";
export type PlanTaskStatus = "todo" | "doing" | "blocked" | "done";
export type PlanTaskPriority = "low" | "medium" | "high" | "critical";
export type PlanHealth = "no_plan" | "on_track" | "at_risk" | "late" | "completed";

export type PlanPerson = {
  value: string;
  label: string;
  description: string | null;
};

export type MasterPlan = {
  id: string;
  title: string;
  objective: string | null;
  startDate: string;
  targetEndDate: string | null;
  scheduleMode: PlanScheduleMode;
  status: MasterPlanStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectPlanStage = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationDays: number;
  dateMode: ProjectStageDateMode;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStageStatus;
  progress: number;
  color: string;
  ownerId: string | null;
  ownerName: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMilestone = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: MilestoneStatus;
  stageId: string | null;
  stageName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectPlanTask = {
  id: string;
  title: string;
  description: string | null;
  stageId: string | null;
  stageName: string | null;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  ownerId: string | null;
  ownerName: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MilestoneChecklistItem = {
  id: string;
  milestoneId: string;
  milestoneTitle: string | null;
  title: string;
  isDone: boolean;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanSummary = {
  totalDurationDays: number;
  forecastEndDate: string | null;
  varianceDays: number | null;
  overallProgress: number;
  completedStages: number;
  stageCount: number;
  completedMilestones: number;
  milestoneCount: number;
  overdueMilestones: number;
  nextMilestone: ProjectMilestone | null;
  taskCount: number;
  completedTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  nextTask: ProjectPlanTask | null;
  checklistCount: number;
  completedChecklistItems: number;
  executionProgress: number;
  health: PlanHealth;
};

export type ProjectPlanData = {
  source: PlanSource;
  projectId: string;
  projectCode: string;
  role: ProjectRole;
  canEdit: boolean;
  masterPlan: MasterPlan | null;
  stages: ProjectPlanStage[];
  milestones: ProjectMilestone[];
  tasks: ProjectPlanTask[];
  checklistItems: MilestoneChecklistItem[];
  people: PlanPerson[];
  summary: PlanSummary;
  generatedAt: string;
};

export type ProjectPlanApiResponse =
  | { ok: true; data: ProjectPlanData }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type PlanningMutationResponse =
  | { ok: true; message: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type MasterPlanInput = {
  projectId: string;
  title: string;
  objective: string | null;
  startDate: string;
  targetEndDate: string | null;
  scheduleMode: PlanScheduleMode;
  status: MasterPlanStatus;
  notes: string | null;
  recalculate: boolean;
};

export type StageInput = {
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  durationDays: number;
  dateMode: ProjectStageDateMode;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStageStatus;
  progress: number;
  color: string;
  ownerId: string | null;
  sortOrder: number | null;
  recalculate: boolean;
};

export type MilestoneInput = {
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: MilestoneStatus;
  stageId: string | null;
  ownerId: string | null;
  sortOrder: number | null;
};

export type PlanTaskInput = {
  projectId: string;
  title: string;
  description: string | null;
  stageId: string | null;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  dueDate: string | null;
  ownerId: string | null;
  sortOrder: number | null;
};

export type MilestoneChecklistInput = {
  projectId: string;
  milestoneId: string;
  title: string;
  isDone: boolean;
  sortOrder: number | null;
};
