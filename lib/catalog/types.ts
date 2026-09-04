export type ProjectCatalogTab = "departments" | "modules";

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
  ownerDepartmentId: string | null;
  ownerDepartmentName: string | null;
  moduleStatusCode: string | null;
  moduleStatusLabel: string | null;
  classification: string | null;
  sortOrder: number;
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
  parentOptions: ProjectCatalogOption[];
  moduleStatusOptions: ProjectCatalogOption[];
};

export type ProjectCatalogResponse =
  | { ok: true; data: ProjectCatalogData }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type ProjectCatalogMutationResponse =
  | { ok: true; message: string; deletedCount?: number; blockedCount?: number }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };
