import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { normalizeImportName } from "@/lib/import/canonical";
import type { CanonicalProjectPayload } from "@/lib/import/types";
import type {
  QuickCatalogImportSection,
  QuickCatalogImportSummary,
  QuickCatalogSheetInfo,
} from "@/lib/catalog/quick-import-types";

const SHEET_ALIASES = {
  departments: ["Phòng ban", "PHÒNG BAN", "Phong ban", "Departments", "Department"],
  contractItems: ["PLHĐ", "PLHD", "Phụ lục hợp đồng", "Phu luc hop dong"],
  contractDetails: ["PLHĐ chi tiết", "PLHĐ - Chi tiết", "PLHĐ CHI TIẾT", "PLHD chi tiet", "PLHD - Chi tiet"],
} as const;

const PAGE_SIZE = 1000;

type Matrix = unknown[][];
type ParsedDepartment = CanonicalProjectPayload["departments"][number];
type ParsedContractItem = CanonicalProjectPayload["contractItems"][number];
type ParsedContractDetail = CanonicalProjectPayload["contractDetails"][number];

export type QuickCatalogReference = {
  departments: Array<{
    importKey: string;
    code: string | null;
    name: string;
    normalizedName: string;
  }>;
  contractItems: Array<{
    importKey: string;
    code: string | null;
    name: string;
    normalizedName: string;
    itemType: ParsedContractItem["itemType"];
    sortOrder: number;
  }>;
  contractDetails: Array<{
    importKey: string;
    code: string | null;
    content: string;
    normalizedContent: string;
    level: number;
    sortOrder: number;
  }>;
};

type ParsedQuickWorkbook = {
  payload: CanonicalProjectPayload;
  sheets: QuickCatalogSheetInfo[];
  summary: QuickCatalogImportSummary;
  warnings: string[];
  errors: string[];
  samples: {
    departments: string[];
    contractItems: Array<{ type: string; code: string | null; name: string; parent: string | null }>;
    contractDetails: Array<{ code: string | null; content: string; level: number; module: string | null }>;
  };
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nullableText(value: unknown) {
  const valueText = text(value);
  return valueText || null;
}

function normalizedCode(value: unknown) {
  return normalizeImportName(text(value));
}

function stableKey(prefix: string, value: string) {
  return `quick:${prefix}:${createHash("sha1").update(value).digest("hex").slice(0, 24)}`;
}

async function fetchPagedProjectRows(
  supabase: SupabaseClient,
  table: "departments" | "contract_items" | "contract_detail_items",
  select: string,
  projectId: string,
  orderBy: "name" | "sort_order",
) {
  const rows: Array<Record<string, unknown>> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq("project_id", projectId)
      .order(orderBy, { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Không tải được dữ liệu hiện có để đối chiếu Import: ${error.message}`);
    const page = (data ?? []) as unknown as Array<Record<string, unknown>>;
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Load current Project keys before parsing. This makes the quick importer idempotent:
 * importing the same Department / PLHĐ / PLHĐ detail again reuses the existing import_key
 * instead of creating duplicate business rows.
 */
export async function loadQuickCatalogReference(
  supabase: SupabaseClient,
  projectId: string,
  selectedSections: QuickCatalogImportSection[],
): Promise<QuickCatalogReference> {
  const sections = new Set(selectedSections);
  const needDepartments = sections.has("departments") || sections.has("contractItems") || sections.has("contractDetails");
  const needContractItems = sections.has("contractItems") || sections.has("contractDetails");
  const needContractDetails = sections.has("contractDetails");

  const [departmentRows, contractItemRows, contractDetailRows] = await Promise.all([
    needDepartments
      ? fetchPagedProjectRows(supabase, "departments", "id,import_key,code,name,normalized_name", projectId, "name")
      : Promise.resolve([]),
    needContractItems
      ? fetchPagedProjectRows(supabase, "contract_items", "id,import_key,code,name,item_type,sort_order", projectId, "sort_order")
      : Promise.resolve([]),
    needContractDetails
      ? fetchPagedProjectRows(supabase, "contract_detail_items", "id,import_key,code,content,level,sort_order", projectId, "sort_order")
      : Promise.resolve([]),
  ]);

  const missingDepartmentKeys = departmentRows.filter((row) => !text(row.import_key)).length;
  const missingContractItemKeys = contractItemRows.filter((row) => !text(row.import_key)).length;
  const missingContractDetailKeys = contractDetailRows.filter((row) => !text(row.import_key)).length;
  const missingTotal = missingDepartmentKeys + missingContractItemKeys + missingContractDetailKeys;
  if (missingTotal > 0) {
    throw new Error(
      `Project còn ${missingTotal} bản ghi chưa có import_key `
      + `(Phòng ban ${missingDepartmentKeys}, PLHĐ ${missingContractItemKeys}, Chi tiết ${missingContractDetailKeys}). `
      + "Hãy chạy migration V1.3.2 trước khi dùng Import nhanh.",
    );
  }

  const itemTypes = new Set<ParsedContractItem["itemType"]>(["root", "subsystem", "module", "other"]);

  return {
    departments: departmentRows.map((row) => ({
      importKey: text(row.import_key),
      code: nullableText(row.code),
      name: text(row.name),
      normalizedName: text(row.normalized_name) || normalizeImportName(text(row.name)),
    })),
    contractItems: contractItemRows.map((row) => {
      const rawType = text(row.item_type) as ParsedContractItem["itemType"];
      return {
        importKey: text(row.import_key),
        code: nullableText(row.code),
        name: text(row.name),
        normalizedName: normalizeImportName(text(row.name)),
        itemType: itemTypes.has(rawType) ? rawType : "other",
        sortOrder: Number(row.sort_order ?? 0),
      };
    }),
    contractDetails: contractDetailRows.map((row) => ({
      importKey: text(row.import_key),
      code: nullableText(row.code),
      content: text(row.content),
      normalizedContent: normalizeImportName(text(row.content)),
      level: Number(row.level ?? 0),
      sortOrder: Number(row.sort_order ?? 0),
    })),
  };
}

function getSheet(workbook: XLSX.WorkBook, aliases: readonly string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeImportName));
  const actualName = workbook.SheetNames.find((name) => normalizedAliases.has(normalizeImportName(name)));
  return actualName ? { name: actualName, sheet: workbook.Sheets[actualName] } : null;
}

function matrix(sheet?: XLSX.WorkSheet): Matrix {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
}

function nonEmptyRows(rows: Matrix) {
  return rows
    .map((row, index) => ({ row, sourceRow: index + 1 }))
    .filter(({ row }) => row.some((value) => text(value)));
}

function looksLikeHeader(values: unknown[], kind: QuickCatalogImportSection) {
  const joined = normalizeImportName(values.slice(0, 8).map(text).join(" | "));
  if (kind === "departments") return /ten phong ban|phong ban name|department name|^phong ban(\s|\||$)/.test(joined);
  if (kind === "contractItems") return /ten module|ten plhd|item type|loai|phan he|module name/.test(joined);
  return /noi dung|content|ma chi tiet|module plhd/.test(joined);
}

function headerIndex(row: unknown[], aliases: string[]) {
  const normalized = row.map((value) => normalizeImportName(text(value)));
  for (const alias of aliases) {
    const target = normalizeImportName(alias);
    const index = normalized.findIndex((value) => value === target || value.includes(target));
    if (index >= 0) return index;
  }
  return -1;
}

function resolveColumns(rows: Array<{ row: unknown[]; sourceRow: number }>, kind: QuickCatalogImportSection) {
  const first = rows[0]?.row ?? [];
  const header = looksLikeHeader(first, kind);
  if (!header) {
    if (kind === "departments") return { start: 0, name: 0, code: 1 };
    if (kind === "contractItems") return { start: 0, name: 0, code: 1, type: 2, department: 3, status: 4, classification: 5 };
    return { start: 0, code: 0, content: 1, module: 2, note: 3 };
  }

  if (kind === "departments") {
    return {
      start: 1,
      name: Math.max(0, headerIndex(first, ["Tên phòng ban", "Department name", "Phòng ban"])),
      code: headerIndex(first, ["Mã phòng ban", "Mã", "Code"]),
    };
  }
  if (kind === "contractItems") {
    return {
      start: 1,
      name: Math.max(0, headerIndex(first, ["Tên Module", "Tên PLHĐ", "Tên", "Name"])),
      code: headerIndex(first, ["Mã Module", "Mã", "Code"]),
      type: headerIndex(first, ["Loại", "Item type", "Type"]),
      department: headerIndex(first, ["Phòng ban", "Department"]),
      status: headerIndex(first, ["Trạng thái", "Status"]),
      classification: headerIndex(first, ["Phân loại", "Classification"]),
    };
  }
  return {
    start: 1,
    code: headerIndex(first, ["Mã", "Code", "Mã chi tiết"]),
    content: Math.max(0, headerIndex(first, ["Nội dung", "Content", "Tên"])),
    module: headerIndex(first, ["Module", "Module PLHĐ", "PLHĐ"]),
    note: headerIndex(first, ["Ghi chú", "Note"]),
  };
}

function cellAt(row: unknown[], index: number | undefined) {
  return index === undefined || index < 0 ? "" : row[index];
}

function isFlatModuleList(rows: Array<{ row: unknown[]; sourceRow: number }>, columns: ReturnType<typeof resolveColumns>) {
  const first = rows[0]?.row ?? [];
  const headerText = normalizeImportName(first.slice(0, 8).map(text).join(" | "));
  const headerMentionsModule = /ten module|module name|^module(\s|\||$)/.test(headerText);
  const hasExplicitHierarchyType = rows.slice(columns.start).some((entry) => {
    const type = normalizeItemType(cellAt(entry.row, columns.type));
    return type === "root" || type === "subsystem";
  });
  return headerMentionsModule && !hasExplicitHierarchyType;
}

function takeFirstUnused<T extends { importKey: string }>(candidates: T[], used: Set<string>) {
  const match = candidates.find((candidate) => !used.has(candidate.importKey));
  if (match) used.add(match.importKey);
  return match ?? null;
}

function parseDepartments(
  rows: Array<{ row: unknown[]; sourceRow: number }>,
  warnings: string[],
  reference: QuickCatalogReference,
) {
  const columns = resolveColumns(rows, "departments");
  const seen = new Set<string>();
  const departments: ParsedDepartment[] = [];
  const existingByName = new Map(reference.departments.map((item) => [item.normalizedName, item]));
  const existingByCode = new Map<string, QuickCatalogReference["departments"]>();
  for (const item of reference.departments) {
    const code = normalizedCode(item.code);
    if (!code) continue;
    existingByCode.set(code, [...(existingByCode.get(code) ?? []), item]);
  }

  for (const entry of rows.slice(columns.start)) {
    const name = text(cellAt(entry.row, columns.name));
    if (!name) continue;
    const normalizedName = normalizeImportName(name);
    if (!normalizedName || seen.has(normalizedName)) {
      if (seen.has(normalizedName)) warnings.push(`Phòng ban dòng ${entry.sourceRow} bị trùng '${name}' và đã được bỏ qua.`);
      continue;
    }
    seen.add(normalizedName);

    const code = nullableText(cellAt(entry.row, columns.code));
    const byName = existingByName.get(normalizedName) ?? null;
    const codeMatches = code ? existingByCode.get(normalizedCode(code)) ?? [] : [];
    const byCode = codeMatches.length === 1 ? codeMatches[0] : null;
    if (!byName && codeMatches.length > 1) {
      warnings.push(`Phòng ban dòng ${entry.sourceRow}: mã '${code}' đang trùng nhiều bản ghi hiện có; hệ thống dùng tên để đối chiếu.`);
    }

    departments.push({
      importKey: byName?.importKey ?? byCode?.importKey ?? stableKey("department", normalizedName),
      code,
      name,
      normalizedName,
    });
  }
  return departments;
}

function normalizeItemType(value: unknown) {
  const normalized = normalizeImportName(text(value));
  if (["root", "nhom", "group", "he thong", "phan mem"].includes(normalized)) return "root" as const;
  if (["subsystem", "phan he", "phanhe"].includes(normalized)) return "subsystem" as const;
  if (["module", "modul"].includes(normalized)) return "module" as const;
  if (["other", "khac"].includes(normalized)) return "other" as const;
  return null;
}

function matchExistingContractItem(
  reference: QuickCatalogReference,
  used: Set<string>,
  itemType: ParsedContractItem["itemType"],
  code: string | null,
  normalizedName: string,
) {
  const sameType = reference.contractItems
    .filter((item) => item.itemType === itemType)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));

  if (code) {
    const byCode = sameType.filter((item) => normalizedCode(item.code) === normalizedCode(code));
    const match = takeFirstUnused(byCode, used);
    if (match) return match;
  }

  return takeFirstUnused(sameType.filter((item) => item.normalizedName === normalizedName), used);
}

function parseContractItems(
  rows: Array<{ row: unknown[]; sourceRow: number }>,
  departments: ParsedDepartment[],
  reference: QuickCatalogReference,
  includeIncomingDepartments: boolean,
  forceFlatModules: boolean,
  warnings: string[],
) {
  const columns = resolveColumns(rows, "contractItems");
  const dataRows = rows.slice(columns.start).filter(({ row }) => text(cellAt(row, columns.name)));
  const flatModuleList = forceFlatModules || isFlatModuleList(rows, columns);
  const departmentByName = new Map(reference.departments.map((item) => [item.normalizedName, item.importKey]));
  if (includeIncomingDepartments) {
    for (const item of departments) departmentByName.set(item.normalizedName, item.importKey);
  }

  const occurrence = new Map<string, number>();
  const usedExisting = new Set<string>();
  const items: ParsedContractItem[] = [];
  let currentRoot: string | null = null;
  let currentSubsystem: string | null = null;

  dataRows.forEach((entry, index) => {
    const name = text(cellAt(entry.row, columns.name));
    const normalizedName = normalizeImportName(name);
    const nextName = normalizeImportName(text(cellAt(dataRows[index + 1]?.row ?? [], columns.name)));
    const explicitType = normalizeItemType(cellAt(entry.row, columns.type));
    const inferredType: ParsedContractItem["itemType"] = explicitType
      ?? (flatModuleList
        ? "module"
        : null)
      ?? (index === 0
        ? "root"
        : normalizedName.startsWith("phan he ") || (nextName && nextName === normalizedName)
          ? "subsystem"
          : "module");

    const code = nullableText(cellAt(entry.row, columns.code));
    const existing = matchExistingContractItem(reference, usedExisting, inferredType, code, normalizedName);
    const occurrenceBase = `${inferredType}|${normalizedName}`;
    const occurrenceNo = (occurrence.get(occurrenceBase) ?? 0) + 1;
    occurrence.set(occurrenceBase, occurrenceNo);
    const importKey = existing?.importKey ?? stableKey("plhd", `${inferredType}|${normalizedName}|${occurrenceNo}`);

    let parentKey: string | null = null;
    if (inferredType === "root") {
      currentRoot = importKey;
      currentSubsystem = null;
    } else if (inferredType === "subsystem") {
      parentKey = currentRoot;
      currentSubsystem = importKey;
    } else {
      parentKey = currentSubsystem ?? currentRoot;
    }

    const departmentName = text(cellAt(entry.row, columns.department));
    const departmentKey = departmentName ? departmentByName.get(normalizeImportName(departmentName)) ?? null : null;
    if (departmentName && !departmentKey) {
      warnings.push(
        `PLHĐ dòng ${entry.sourceRow}: không tìm thấy Phòng ban '${departmentName}' `
        + "trong dữ liệu Project hoặc nhóm Phòng ban đang import.",
      );
    }

    items.push({
      importKey,
      parentKey,
      code,
      name,
      itemType: inferredType,
      departmentKey,
      moduleStatusCode: nullableText(cellAt(entry.row, columns.status)),
      classification: nullableText(cellAt(entry.row, columns.classification)),
      sortOrder: index + 1,
    });
  });

  if (items.length > 0 && !items.some((item) => item.itemType === "root")) {
    warnings.push(
      flatModuleList
        ? "Sheet PLHĐ đang được nhận diện là danh sách Module phẳng. Các Module sẽ được import ở cấp gốc và hiển thị lại trong Danh mục Module."
        : "Không nhận diện được Nhóm/Root trong sheet PLHĐ. Các Module sẽ được import ở cấp gốc.",
    );
  }
  return items;
}

const ROMAN_PATTERN = /^(?=[IVXLCDM]+$)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

function detailLevel(code: string, lastExplicitLevel: number | null) {
  const clean = code.trim();
  if (!clean) return { level: (lastExplicitLevel ?? -1) + 1, explicit: false };
  if (ROMAN_PATTERN.test(clean)) return { level: 1, explicit: true };
  if (/^[A-Z]$/i.test(clean)) return { level: 0, explicit: true };
  if (/^\d+$/.test(clean)) return { level: 2, explicit: true };
  if (/^\d+(?:[,.]\d+)+$/.test(clean)) {
    return { level: 2 + (clean.match(/[,.]/g)?.length ?? 0), explicit: true };
  }
  return { level: Math.max(0, (lastExplicitLevel ?? 1) + 1), explicit: true };
}

function matchExistingDetail(
  reference: QuickCatalogReference,
  used: Set<string>,
  code: string,
  content: string,
  level: number,
) {
  const normalizedContent = normalizeImportName(content);
  const candidates = reference.contractDetails
    .filter((item) => item.level === level && item.normalizedContent === normalizedContent)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (code) {
    const byCode = candidates.filter((item) => normalizedCode(item.code) === normalizedCode(code));
    const exact = takeFirstUnused(byCode, used);
    if (exact) return exact;
  }

  return takeFirstUnused(candidates, used);
}

function parseContractDetails(
  rows: Array<{ row: unknown[]; sourceRow: number }>,
  contractItems: ParsedContractItem[],
  reference: QuickCatalogReference,
  warnings: string[],
) {
  const columns = resolveColumns(rows, "contractDetails");
  const moduleByName = new Map<string, Array<{ importKey: string; name: string }>>();
  const addModule = (importKey: string, name: string) => {
    const key = normalizeImportName(name);
    if (!key) return;
    const current = moduleByName.get(key) ?? [];
    if (!current.some((item) => item.importKey === importKey)) moduleByName.set(key, [...current, { importKey, name }]);
  };
  for (const item of reference.contractItems.filter((item) => item.itemType === "module")) addModule(item.importKey, item.name);
  for (const item of contractItems.filter((item) => item.itemType === "module")) addModule(item.importKey, item.name);

  const details: ParsedContractDetail[] = [];
  const parentAtLevel = new Map<number, string>();
  const usedExisting = new Set<string>();
  let lastExplicitLevel: number | null = null;
  let activeModuleKey: string | null = null;
  let businessRows = 0;
  let mappedBusinessRows = 0;
  let groupRows = 0;

  for (const entry of rows.slice(columns.start)) {
    const content = text(cellAt(entry.row, columns.content));
    if (!content) continue;
    const code = text(cellAt(entry.row, columns.code));
    const levelInfo = detailLevel(code, lastExplicitLevel);
    const level = Math.min(12, Math.max(0, levelInfo.level));
    if (levelInfo.explicit) lastExplicitLevel = level;

    let parentKey: string | null = null;
    for (let parentLevel = level - 1; parentLevel >= 0; parentLevel -= 1) {
      const candidate = parentAtLevel.get(parentLevel);
      if (candidate) { parentKey = candidate; break; }
    }

    const explicitModuleName = text(cellAt(entry.row, columns.module));
    if (level <= 2) activeModuleKey = null;
    const moduleCandidates = moduleByName.get(normalizeImportName(explicitModuleName || content)) ?? [];
    if (explicitModuleName && moduleCandidates.length === 0) {
      warnings.push(`PLHĐ chi tiết dòng ${entry.sourceRow}: Module '${explicitModuleName}' không tồn tại trong Project hoặc sheet PLHĐ.`);
    }
    if ((explicitModuleName || level === 2) && moduleCandidates.length > 0) {
      activeModuleKey = moduleCandidates[0].importKey;
      if (moduleCandidates.length > 1) {
        warnings.push(`PLHĐ chi tiết dòng ${entry.sourceRow}: '${explicitModuleName || content}' khớp nhiều Module; hệ thống chọn Module đầu tiên.`);
      }
    }

    if (level <= 1) groupRows += 1;
    else {
      businessRows += 1;
      if (activeModuleKey) mappedBusinessRows += 1;
    }

    const existing = matchExistingDetail(reference, usedExisting, code, content, level);
    const pathSignature = [parentKey ?? "root", code || "blank", normalizeImportName(content)].join("|");
    const importKey = existing?.importKey ?? stableKey("plhd-detail", pathSignature);
    const nodeType = level === 0 ? "root" : level === 1 ? "subsystem" : level === 2 ? "module" : level === 3 ? "section" : "detail";

    details.push({
      importKey,
      parentKey,
      contractItemKey: activeModuleKey,
      code: code || null,
      content,
      nodeType,
      level,
      sortOrder: details.length + 1,
      note: nullableText(cellAt(entry.row, columns.note)),
    });

    parentAtLevel.set(level, importKey);
    for (const existingLevel of [...parentAtLevel.keys()]) {
      if (existingLevel > level) parentAtLevel.delete(existingLevel);
    }
  }

  return {
    details,
    mappedBusinessRows,
    groupRows,
    unmappedBusinessRows: Math.max(0, businessRows - mappedBusinessRows),
  };
}

function keepSections(payload: CanonicalProjectPayload, sections: Set<QuickCatalogImportSection>) {
  return {
    ...payload,
    departments: sections.has("departments") ? payload.departments : [],
    contractItems: sections.has("contractItems") ? payload.contractItems : [],
    contractDetails: sections.has("contractDetails") ? payload.contractDetails : [],
  } satisfies CanonicalProjectPayload;
}

export function parseQuickCatalogWorkbook(
  arrayBuffer: ArrayBuffer,
  project: { id: string; code: string },
  selectedSections: QuickCatalogImportSection[],
  reference: QuickCatalogReference = { departments: [], contractItems: [], contractDetails: [] },
): ParsedQuickWorkbook {
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true, cellFormula: true });
  const warnings: string[] = [];
  const errors: string[] = [];

  const departmentSheet = getSheet(workbook, SHEET_ALIASES.departments);
  const contractSheet = getSheet(workbook, SHEET_ALIASES.contractItems);
  const detailSheet = getSheet(workbook, SHEET_ALIASES.contractDetails);

  const departmentRows = nonEmptyRows(matrix(departmentSheet?.sheet));
  const contractRows = nonEmptyRows(matrix(contractSheet?.sheet));
  const detailRows = nonEmptyRows(matrix(detailSheet?.sheet));

  const sections = new Set(selectedSections);
  if (sections.has("departments") && !departmentSheet) errors.push("Không tìm thấy sheet 'Phòng ban'.");
  if (sections.has("contractItems") && !contractSheet) errors.push("Không tìm thấy sheet 'PLHĐ'.");
  if (sections.has("contractDetails") && !detailSheet) errors.push("Không tìm thấy sheet 'PLHĐ chi tiết' hoặc 'PLHĐ - Chi tiết'.");
  if (sections.has("contractDetails") && !sections.has("contractItems")) {
    warnings.push("Đang import PLHĐ chi tiết mà không import PLHĐ. Hệ thống sẽ mapping Module từ danh mục Project hiện có khi có thể.");
  }

  const departments = sections.has("departments")
    ? parseDepartments(departmentRows, warnings, reference)
    : [];
  const contractItems = sections.has("contractItems")
    ? parseContractItems(
      contractRows,
      departments,
      reference,
      sections.has("departments"),
      !sections.has("contractDetails"),
      warnings,
    )
    : [];
  const detailResult = sections.has("contractDetails")
    ? parseContractDetails(detailRows, contractItems, reference, warnings)
    : { details: [] as ParsedContractDetail[], mappedBusinessRows: 0, groupRows: 0, unmappedBusinessRows: 0 };

  if (sections.has("departments") && departments.length === 0) errors.push("Sheet Phòng ban không có dữ liệu hợp lệ để import.");
  if (sections.has("contractItems") && contractItems.length === 0) errors.push("Sheet PLHĐ không có dữ liệu hợp lệ để import.");
  if (sections.has("contractDetails") && detailResult.details.length === 0) errors.push("Sheet PLHĐ chi tiết không có dữ liệu hợp lệ để import.");
  if (sections.has("contractDetails") && detailResult.unmappedBusinessRows > 0) {
    warnings.push(`${detailResult.unmappedBusinessRows} dòng nghiệp vụ PLHĐ chi tiết chưa tự mapping được Module. Dữ liệu vẫn được import và có thể rà soát mapping sau.`);
  }

  const basePayload: CanonicalProjectPayload = {
    projectId: project.id,
    projectCode: project.code,
    templateVersion: "0.9.2",
    project: null,
    stages: [],
    departments,
    people: [],
    contractItems,
    contractDetails: detailResult.details,
    releaseVersions: [],
    issues: [],
    remoteResources: [],
  };
  const payload = keepSections(basePayload, sections);

  const summary: QuickCatalogImportSummary = {
    departments: payload.departments.length,
    contractItems: payload.contractItems.length,
    roots: payload.contractItems.filter((item) => item.itemType === "root").length,
    subsystems: payload.contractItems.filter((item) => item.itemType === "subsystem").length,
    modules: payload.contractItems.filter((item) => item.itemType === "module").length,
    contractDetails: payload.contractDetails.length,
    mappedDetailRows: sections.has("contractDetails") ? detailResult.mappedBusinessRows : 0,
    groupDetailRows: sections.has("contractDetails") ? detailResult.groupRows : 0,
    unmappedBusinessRows: sections.has("contractDetails") ? detailResult.unmappedBusinessRows : 0,
  };

  const itemNameByKey = new Map<string, string>();
  for (const item of reference.contractItems) itemNameByKey.set(item.importKey, item.name);
  for (const item of contractItems) itemNameByKey.set(item.importKey, item.name);

  return {
    payload,
    sheets: [
      { key: "departments", label: "Phòng ban", sheetName: departmentSheet?.name ?? null, found: Boolean(departmentSheet), rows: Math.max(0, departmentRows.length - (looksLikeHeader(departmentRows[0]?.row ?? [], "departments") ? 1 : 0)) },
      { key: "contractItems", label: "PLHĐ", sheetName: contractSheet?.name ?? null, found: Boolean(contractSheet), rows: Math.max(0, contractRows.length - (looksLikeHeader(contractRows[0]?.row ?? [], "contractItems") ? 1 : 0)) },
      { key: "contractDetails", label: "PLHĐ chi tiết", sheetName: detailSheet?.name ?? null, found: Boolean(detailSheet), rows: Math.max(0, detailRows.length - (looksLikeHeader(detailRows[0]?.row ?? [], "contractDetails") ? 1 : 0)) },
    ],
    summary,
    warnings: [...new Set(warnings)].slice(0, 80),
    errors: [...new Set(errors)].slice(0, 40),
    samples: {
      departments: payload.departments.slice(0, 5).map((item) => item.name),
      contractItems: payload.contractItems.slice(0, 8).map((item) => ({
        type: item.itemType,
        code: item.code,
        name: item.name,
        parent: item.parentKey ? itemNameByKey.get(item.parentKey) ?? null : null,
      })),
      contractDetails: payload.contractDetails.slice(0, 8).map((item) => ({
        code: item.code,
        content: item.content,
        level: item.level,
        module: item.contractItemKey ? itemNameByKey.get(item.contractItemKey) ?? null : null,
      })),
    },
  };
}
