export type DepartmentSource = "database" | "demo";

export type DepartmentContact = {
  id: string;
  fullName: string;
  title: string | null;
  email: string | null;
  zalo: string | null;
};

export type DepartmentModule = {
  id: string;
  code: string | null;
  name: string;
  statusCode: string | null;
};

export type DepartmentAttentionIssue = {
  id: string;
  content: string;
  statusCode: string | null;
  dueDate: string | null;
  moduleName: string | null;
  assigneeName: string | null;
  isOverdue: boolean;
  isNearDue: boolean;
};

export type DepartmentRow = {
  id: string;
  code: string | null;
  name: string;
  isUnassigned: boolean;
  isActive: boolean;
  total: number;
  resolved: number;
  released: number;
  handedOver: number;
  notHandedOver: number;
  overdue: number;
  nearDue: number;
  missingAssignee: number;
  handoverProgress: number;
  contacts: DepartmentContact[];
  modules: DepartmentModule[];
  attentionIssues: DepartmentAttentionIssue[];
};

export type DepartmentsData = {
  source: DepartmentSource;
  generatedAt: string;
  projectId: string;
  summary: {
    departments: number;
    totalIssues: number;
    linkedIssues: number;
    unassignedIssues: number;
    handedOver: number;
    overdue: number;
    contacts: number;
    modules: number;
  };
  departments: DepartmentRow[];
};

export type DepartmentsApiResponse =
  | { ok: true; data: DepartmentsData }
  | { ok: false; code: string; message: string };
