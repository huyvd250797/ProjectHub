export type ContractSource = "database" | "demo";

export type ContractOverviewItem = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  itemType: "root" | "subsystem" | "module" | "other";
  ownerDepartmentId: string | null;
  ownerDepartmentName: string | null;
  moduleStatusCode: string | null;
  moduleStatusLabel: string | null;
  classification: string | null;
  sortOrder: number;
  issueTotal: number;
  handedOver: number;
  remaining: number;
  progress: number;
  detailCount: number;
};

export type ContractDetailItem = {
  id: string;
  parentId: string | null;
  contractItemId: string | null;
  code: string;
  content: string;
  nodeType: string | null;
  level: number;
  sortOrder: number;
  note: string | null;
  hasChildren: boolean;
};

export type ContractFilterOption = {
  value: string;
  label: string;
};

export type ContractData = {
  source: ContractSource;
  generatedAt: string;
  projectId: string;
  summary: {
    items: number;
    modules: number;
    subsystems: number;
    details: number;
    issues: number;
    handedOver: number;
    remaining: number;
    handoverProgress: number;
    unmappedDetails: number;
  };
  overview: ContractOverviewItem[];
  details: ContractDetailItem[];
  filters: {
    departments: ContractFilterOption[];
    moduleStatuses: ContractFilterOption[];
  };
};

export type ContractApiResponse =
  | { ok: true; data: ContractData }
  | { ok: false; code: string; message: string };
