import type { ProjectRole } from "@/lib/issues/types";

export type PlanSource = "database" | "demo";
export type PlanScheduleMode = "calendar_days" | "business_days";
export type MasterPlanStatus = "draft" | "active" | "on_hold" | "completed";
export type ProjectStageStatus = "not_started" | "in_progress" | "blocked" | "completed";
export type MilestoneStatus = "pending" | "at_risk" | "completed" | "missed";
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
