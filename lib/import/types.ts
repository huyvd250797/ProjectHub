export type ImportSeverity = "info" | "warning" | "error";
export type ImportMode = "merge" | "insert_only";
export type ImportWorkbookFormat = "canonical_v092" | "legacy";

export type ImportMessage = {
  severity: ImportSeverity;
  code: string;
  message: string;
  sheet?: string;
  row?: number;
};

export type SheetProfile = {
  name: string;
  found: boolean;
  rows: number;
  mappedTo: string;
  notes?: string;
};

export type ImportEntityPreview = {
  incoming: number;
  insert: number;
  update: number;
};

export type ImportPreview = {
  departments: ImportEntityPreview;
  people: ImportEntityPreview;
  stages: ImportEntityPreview;
  contractItems: ImportEntityPreview;
  contractDetails: ImportEntityPreview;
  releaseVersions: ImportEntityPreview;
  issues: ImportEntityPreview;
  remoteResources: ImportEntityPreview;
};

export type ImportDryRunResult = {
  fileName: string;
  fileSize: number;
  format?: ImportWorkbookFormat;
  templateVersion?: string | null;
  canApply?: boolean;
  preview?: ImportPreview | null;
  selectedProject: {
    id: string;
    code: string;
  } | null;
  sourceProject: {
    code: string;
    organizationName: string;
    contractNo: string;
    status: string;
  };
  canImport: boolean;
  sheets: SheetProfile[];
  summary: {
    issues: number;
    modules: number;
    subsystems: number;
    contractDetails: number;
    departments: number;
    customerPeople: number;
    ascMembers: number;
    releaseVersions: number;
    remoteResources: number;
    stages?: number;
  };
  quality: {
    issuesMissingModule: number;
    issuesMissingDepartment: number;
    issuesMissingAssignee: number;
    unknownIssueModules: number;
    duplicateJiraLinks: number;
    sensitiveColumnsExcluded: string[];
  };
  catalogs: {
    issueStatuses: string[];
    customerStatuses: string[];
    moduleStatuses: string[];
    priorities: string[];
  };
  samples: {
    issues: Array<Record<string, string | number | boolean | null>>;
    modules: Array<Record<string, string | number | boolean | null>>;
  };
  messages: ImportMessage[];
};

export type CanonicalProjectPayload = {
  projectId: string;
  projectCode: string;
  templateVersion: string;
  project: {
    name: string;
    organizationName: string | null;
    contractNo: string | null;
    contractValue: number | null;
    contractDate: string | null;
    startDate: string | null;
    dueDate: string | null;
    status: "active" | "paused" | "completed" | "archived";
  } | null;
  stages: Array<{
    importKey: string;
    code: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    sortOrder: number;
  }>;
  departments: Array<{
    importKey: string;
    code: string | null;
    name: string;
    normalizedName: string;
  }>;
  people: Array<{
    importKey: string;
    personType: "asc" | "customer";
    departmentKey: string | null;
    fullName: string;
    title: string | null;
    projectRole: string | null;
    email: string | null;
    zalo: string | null;
    moduleNotes: string | null;
  }>;
  contractItems: Array<{
    importKey: string;
    parentKey: string | null;
    code: string | null;
    name: string;
    itemType: "root" | "subsystem" | "module" | "other";
    departmentKey: string | null;
    moduleStatusCode: string | null;
    classification: string | null;
    sortOrder: number;
  }>;
  contractDetails: Array<{
    importKey: string;
    parentKey: string | null;
    contractItemKey: string | null;
    code: string | null;
    content: string;
    nodeType: string | null;
    level: number;
    sortOrder: number;
    note: string | null;
  }>;
  releaseVersions: Array<{
    importKey: string;
    sequenceNo: number | null;
    releaseDate: string;
    label: string | null;
  }>;
  issues: Array<{
    importKey: string;
    content: string;
    statusCode: string | null;
    customerStatusCode: string | null;
    priorityCode: string | null;
    stageCode: string | null;
    jiraUrl: string | null;
    releaseDate: string | null;
    dueDate: string | null;
    moduleKey: string | null;
    response: string | null;
    departmentKey: string | null;
    requesterKey: string | null;
    assigneeKey: string | null;
    notes: string | null;
  }>;
  remoteResources: Array<{
    importKey: string;
    name: string;
    resourceType: string;
    environment: string | null;
    urlOrHost: string | null;
    remoteAddress: string | null;
    username: string | null;
    notes: string | null;
    isSensitive: boolean;
  }>;
};

export type ImportApplyResult = {
  ok: true;
  batchId: string;
  mode: ImportMode;
  summary: ImportPreview;
  message: string;
};
