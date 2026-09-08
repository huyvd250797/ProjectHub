export type ResourceScheduleSource = "database" | "demo";
export type ResourceScheduleWorkType = "issue" | "task";
export type ResourceScheduleLevel = "available" | "balanced" | "tight" | "overloaded";

export type ResourceScheduleWeek = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type ResourceScheduleItem = {
  id: string;
  type: ResourceScheduleWorkType;
  code: string;
  title: string;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  estimatedHours: number;
  ownerId: string | null;
  ownerName: string | null;
  moduleName: string | null;
  departmentName: string | null;
  stageName: string | null;
  jiraUrl: string | null;
};

export type ResourceScheduleMemberWeek = {
  weekId: string;
  plannedHours: number;
  allocationPercent: number;
  availableHours: number;
  overloadHours: number;
  level: ResourceScheduleLevel;
  items: ResourceScheduleItem[];
};

export type ResourceScheduleMember = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  departmentName: string | null;
  capacityHoursPerWeek: number;
  allocationTargetPercent: number;
  effectiveCapacityHours: number;
  totalPlannedHours: number;
  totalAvailableHours: number;
  totalOverloadHours: number;
  averageAllocationPercent: number;
  weeks: ResourceScheduleMemberWeek[];
};

export type ResourceScheduleSummary = {
  memberCount: number;
  assignableItems: number;
  unassignedItems: number;
  overloadedSlots: number;
  totalPlannedHours: number;
  totalAvailableHours: number;
  totalOverloadHours: number;
};

export type ResourceScheduleData = {
  source: ResourceScheduleSource;
  projectId: string;
  projectCode: string;
  generatedAt: string;
  weeks: ResourceScheduleWeek[];
  members: ResourceScheduleMember[];
  unassignedItems: ResourceScheduleItem[];
  summary: ResourceScheduleSummary;
};

export type ResourceScheduleApiResponse =
  | { ok: true; data: ResourceScheduleData }
  | { ok: false; code: string; message: string };

export type ResourceScheduleAssignResponse =
  | { ok: true; message: string }
  | { ok: false; code: string; message: string };
