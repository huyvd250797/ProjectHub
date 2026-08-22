export type ProjectRole = "admin" | "pm" | "member" | "viewer";

export type SelectOption = {
  value: string;
  label: string;
  description?: string | null;
};

export type IssueRow = {
  id: string;
  issueNo: number | null;
  content: string;
  statusCode: string | null;
  customerStatusCode: string | null;
  priorityCode: string | null;
  stageCode: string | null;
  jiraUrl: string | null;
  releaseDate: string | null;
  dueDate: string | null;
  moduleId: string | null;
  moduleName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  requesterId: string | null;
  requesterName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  response: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IssueHistoryEntry = {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

export type IssueLookups = {
  statuses: SelectOption[];
  customerStatuses: SelectOption[];
  priorities: SelectOption[];
  stages: SelectOption[];
  modules: SelectOption[];
  departments: SelectOption[];
  assignees: SelectOption[];
  requesters: SelectOption[];
};

export type IssueSummary = {
  total: number;
  notHandedOver: number;
  mine: number;
  overdue: number;
  waiting: number;
  missingAssignee: number;
};

export type IssuesData = {
  source: "database" | "demo";
  projectId: string;
  role: ProjectRole;
  canEdit: boolean;
  canArchive: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: IssueSummary;
  rows: IssueRow[];
  lookups: IssueLookups;
};

export type IssuesApiResponse =
  | { ok: true; data: IssuesData }
  | { ok: false; code: string; message: string };

export type IssueDetailData = {
  issue: IssueRow;
  history: IssueHistoryEntry[];
};

export type IssueDetailApiResponse =
  | { ok: true; data: IssueDetailData }
  | { ok: false; code: string; message: string };

export type IssueMutationResponse =
  | { ok: true; issue: IssueRow }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };
