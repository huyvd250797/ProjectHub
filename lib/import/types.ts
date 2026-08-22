export type ImportSeverity = "info" | "warning" | "error";

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

export type ImportDryRunResult = {
  fileName: string;
  fileSize: number;
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
