"use client";

export type CsvValue = string | number | boolean | null | undefined | Date;

export type CsvRow = Record<string, CsvValue>;

function csvCell(value: CsvValue) {
  if (value instanceof Date) return `"${value.toISOString().replaceAll('"', '""')}"`;
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "export";
}

export function exportCsv(filename: string, headers: string[], rows: CsvRow[]) {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(filename)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsvSections(filename: string, sections: Array<{ title: string; headers: string[]; rows: CsvRow[] }>) {
  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length) lines.push("");
    lines.push(csvCell(section.title));
    lines.push(section.headers.map(csvCell).join(","));
    lines.push(...section.rows.map((row) => section.headers.map((header) => csvCell(row[header])).join(",")));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(filename)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportJsonSnapshot(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(filename)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
