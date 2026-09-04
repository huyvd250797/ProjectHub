export type ProjectCatalogTab = "departments" | "modules" | "details";

export type ProjectCatalogDepartment = {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  updatedAt: string | null;
};

export type ProjectCatalogModule = {
  id: string;
  parentId: string | null;
  parentName: string | null;
  code: string | null;
  name: string;
  itemType: "root" | "subsystem" | "module";
  ownerDepartmentId: string | null;
  ownerDepartmentName: string | null;
  moduleStatusCode: string | null;
  moduleStatusLabel: string | null;
  classification: string | null;
  sortOrder: number;
  updatedAt: string | null;
};

export type ProjectCatalogDetail = {
  id: string;
  parentId: string | null;
  parentContent: string | null;
  contractItemId: string | null;
  contractItemName: string | null;
  code: string | null;
  content: string;
  nodeType: string | null;
  level: number;
  sortOrder: number;
  note: string | null;
  updatedAt: string | null;
};

export type ProjectCatalogOption = {
  value: string;
  label: string;
};

export type ProjectCatalogData = {
  projectId: string;
  canManage: boolean;
  role: "admin" | "pm" | "member" | "viewer";
  departments: ProjectCatalogDepartment[];
  modules: ProjectCatalogModule[];
  details: ProjectCatalogDetail[];
  parentOptions: ProjectCatalogOption[];
  contractItemOptions: ProjectCatalogOption[];
  detailParentOptions: ProjectCatalogOption[];
  moduleStatusOptions: ProjectCatalogOption[];
};

export type ProjectCatalogResponse =
  | { ok: true; data: ProjectCatalogData }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type ProjectCatalogMutationResponse =
  | { ok: true; message: string; deletedCount?: number; blockedCount?: number }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };
