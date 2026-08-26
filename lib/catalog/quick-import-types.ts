import type { ImportPreview } from "@/lib/import/types";

export type QuickCatalogImportSection = "departments" | "contractItems" | "contractDetails";

export type QuickCatalogSheetInfo = {
  key: QuickCatalogImportSection;
  label: string;
  sheetName: string | null;
  found: boolean;
  rows: number;
};

export type QuickCatalogImportSummary = {
  departments: number;
  contractItems: number;
  roots: number;
  subsystems: number;
  modules: number;
  contractDetails: number;
  mappedDetailRows: number;
  groupDetailRows: number;
  unmappedBusinessRows: number;
};

export type QuickCatalogImportSample = {
  departments: string[];
  contractItems: Array<{ type: string; code: string | null; name: string; parent: string | null }>;
  contractDetails: Array<{ code: string | null; content: string; level: number; module: string | null }>;
};

export type QuickCatalogImportPreviewResponse = {
  ok: true;
  projectId: string;
  fileName: string;
  sheets: QuickCatalogSheetInfo[];
  summary: QuickCatalogImportSummary;
  samples: QuickCatalogImportSample;
  warnings: string[];
  errors: string[];
  databasePreview: ImportPreview | null;
  canApply: boolean;
};

export type QuickCatalogImportApplyResponse =
  | {
      ok: true;
      batchId: string;
      message: string;
      summary: ImportPreview;
    }
  | { ok: false; error: string };
