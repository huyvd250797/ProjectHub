export type WorkloadSource = "database" | "demo";
export type WorkloadLevel = "low" | "normal" | "high" | "overloaded";
export type WorkloadRiskSeverity = "info" | "warning" | "critical";
export type WorkloadItemType = "issue" | "task" | "milestone" | "reminder";

export type WorkloadMemberItem = {
  id: string;
  type: WorkloadItemType;
  title: string;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  href: string;
};

export type WorkloadMember = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  role: string | null;
  departmentName: string | null;
  issueCount: number;
  openIssues: number;
  overdueIssues: number;
  dueSoonIssues: number;
  taskCount: number;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  milestoneCount: number;
  openMilestones: number;
  overdueMilestones: number;
  reminderCount: number;
  openReminders: number;
  overdueReminders: number;
  dueSoonWork: number;
  totalOpenWork: number;
  capacityScore: number;
  focusScore: number;
  level: WorkloadLevel;
  recommendation: string;
  nextDueDate: string | null;
  items: WorkloadMemberItem[];
};

export type WorkloadSummary = {
  memberCount: number;
  overloadedMembers: number;
  availableMembers: number;
  totalOpenWork: number;
  overdueWork: number;
  blockedTasks: number;
  dueSoonWork: number;
  averageCapacity: number;
};

export type WorkloadAssignmentSuggestion = {
  memberId: string;
  name: string;
  departmentName: string | null;
  level: WorkloadLevel;
  capacityScore: number;
  reason: string;
};

export type WorkloadRisk = {
  id: string;
  title: string;
  summary: string;
  severity: WorkloadRiskSeverity;
  ownerName: string | null;
  href: string;
};

export type WorkloadCalendarBucket = {
  label: string;
  startDate: string;
  endDate: string;
  dueItems: number;
  overloadedDueItems: number;
};

export type WorkloadData = {
  source: WorkloadSource;
  projectId: string;
  projectCode: string;
  generatedAt: string;
  summary: WorkloadSummary;
  members: WorkloadMember[];
  suggestions: WorkloadAssignmentSuggestion[];
  risks: WorkloadRisk[];
  calendar: WorkloadCalendarBucket[];
};

export type WorkloadApiResponse =
  | { ok: true; data: WorkloadData }
  | { ok: false; code: string; message: string };
