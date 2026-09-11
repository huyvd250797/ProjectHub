"use client";

import { useEffect } from "react";

type GridLayout = {
  order?: string[];
  widths?: Record<string, number>;
};

const STORAGE_PREFIX = "asc-working-global-grid-layout-v222";
const MIN_COLUMN_WIDTH = 72;
const MAX_COLUMN_WIDTH = 840;

function getHeaderRow(table: HTMLTableElement) {
  return table.tHead?.rows[0] ?? table.querySelector("thead tr");
}

function getColumnLabels(table: HTMLTableElement) {
  const headerRow = getHeaderRow(table);
  if (!headerRow) return [];

  return Array.from(headerRow.children).map((cell, index) => {
    const label = cell.textContent?.replace(/\s+/g, " ").trim();
    return label || `__blank_${index}`;
  });
}

function getStorageKey(table: HTMLTableElement) {
  const originalHeaders = table.dataset.ascOriginalGridHeaders || getColumnLabels(table).join("|");
  table.dataset.ascOriginalGridHeaders = originalHeaders;
  return `${STORAGE_PREFIX}:${window.location.pathname}:${originalHeaders}`;
}

function loadLayout(key: string): GridLayout {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as GridLayout;
  } catch {
    return {};
  }
}

function saveLayout(table: HTMLTableElement) {
  const labels = getColumnLabels(table);
  const widths: Record<string, number> = {};
  const headerRow = getHeaderRow(table);

  if (headerRow) {
    Array.from(headerRow.children).forEach((cell, index) => {
      widths[labels[index] || `__blank_${index}`] = Math.round((cell as HTMLElement).getBoundingClientRect().width);
    });
  }

  window.localStorage.setItem(getStorageKey(table), JSON.stringify({ order: labels, widths }));
}

function resetLayout(table: HTMLTableElement) {
  window.localStorage.removeItem(getStorageKey(table));
  const originalLabels = (table.dataset.ascOriginalGridHeaders || "").split("|").filter(Boolean);
  originalLabels.forEach((wantedLabel, targetIndex) => {
    const currentLabels = getColumnLabels(table);
    const currentIndex = currentLabels.indexOf(wantedLabel);
    if (currentIndex >= 0 && currentIndex !== targetIndex) moveColumn(table, currentIndex, targetIndex);
  });
  for (const row of Array.from(table.rows)) {
    for (const cell of Array.from(row.children)) {
      const element = cell as HTMLElement;
      element.style.width = "";
      element.style.minWidth = "";
      element.style.maxWidth = "";
    }
  }
}

function moveColumn(table: HTMLTableElement, from: number, to: number) {
  if (from === to || from < 0 || to < 0) return;

  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.children);
    const moving = cells[from];
    const target = cells[to];
    if (!moving || !target) continue;
    row.insertBefore(moving, from < to ? target.nextSibling : target);
  }
}

function setColumnWidth(table: HTMLTableElement, index: number, width: number) {
  const nextWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));

  for (const row of Array.from(table.rows)) {
    const cell = row.children[index] as HTMLElement | undefined;
    if (!cell) continue;
    cell.style.width = `${nextWidth}px`;
    cell.style.minWidth = `${nextWidth}px`;
    cell.style.maxWidth = `${nextWidth}px`;
  }
}

function applySavedLayout(table: HTMLTableElement) {
  const saved = loadLayout(getStorageKey(table));

  if (Array.isArray(saved.order)) {
    saved.order.forEach((wantedLabel, targetIndex) => {
      const currentLabels = getColumnLabels(table);
      const currentIndex = currentLabels.indexOf(wantedLabel);
      if (currentIndex >= 0 && currentIndex !== targetIndex) moveColumn(table, currentIndex, targetIndex);
    });
  }

  getColumnLabels(table).forEach((label, index) => {
    const width = Number(saved.widths?.[label]);
    if (Number.isFinite(width)) setColumnWidth(table, index, width);
  });
}

function enhanceTable(table: HTMLTableElement) {
  if (table.dataset.managedGrid === "true" || table.closest("[data-no-auto-grid]")) return;

  const headerRow = getHeaderRow(table);
  if (!headerRow || headerRow.children.length < 2) return;

  table.classList.add("asc-data-grid");
  applySavedLayout(table);

  if (table.dataset.ascGridEnhanced === "true") return;
  table.dataset.ascGridEnhanced = "true";

  if (table.parentElement && table.dataset.ascGridResetButton !== "true") {
    table.dataset.ascGridResetButton = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asc-grid-reset-button";
    button.textContent = "Reset layout cột";
    button.title = "Đưa thứ tự và độ rộng cột về mặc định";
    button.addEventListener("click", () => resetLayout(table));
    table.parentElement.insertBefore(button, table);
  }

  let draggedIndex = -1;

  Array.from(getHeaderRow(table)?.children ?? []).forEach((cell) => {
    const headerCell = cell as HTMLElement;
    headerCell.draggable = true;
    headerCell.dataset.ascGridColumnHandle = "true";
    headerCell.title = headerCell.title || "Kéo để đổi vị trí cột. Kéo mép phải để resize.";

    headerCell.addEventListener("dragstart", (event) => {
      draggedIndex = Array.from(headerCell.parentElement?.children ?? []).indexOf(headerCell);
      event.dataTransfer?.setData("text/plain", String(draggedIndex));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });

    headerCell.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    headerCell.addEventListener("drop", (event) => {
      event.preventDefault();
      const targetIndex = Array.from(headerCell.parentElement?.children ?? []).indexOf(headerCell);
      if (draggedIndex >= 0 && targetIndex >= 0 && draggedIndex !== targetIndex) {
        moveColumn(table, draggedIndex, targetIndex);
        saveLayout(table);
      }
      draggedIndex = -1;
    });

    headerCell.addEventListener("mousemove", (event) => {
      const rect = headerCell.getBoundingClientRect();
      headerCell.style.cursor = rect.right - event.clientX <= 8 ? "col-resize" : "grab";
    });

    headerCell.addEventListener("mouseleave", () => {
      headerCell.style.cursor = "grab";
    });

    headerCell.addEventListener("mousedown", (event) => {
      const rect = headerCell.getBoundingClientRect();
      if (rect.right - event.clientX > 8) return;

      event.preventDefault();
      event.stopPropagation();

      const columnIndex = Array.from(headerCell.parentElement?.children ?? []).indexOf(headerCell);
      const startX = event.clientX;
      const startWidth = rect.width;

      const onMove = (moveEvent: MouseEvent) => {
        setColumnWidth(table, columnIndex, startWidth + moveEvent.clientX - startX);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        saveLayout(table);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });
}

export function GlobalGridEnhancer() {
  useEffect(() => {
    let frame = 0;

    const enhanceAll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.querySelectorAll<HTMLTableElement>("table").forEach(enhanceTable);
      });
    };

    enhanceAll();

    const observer = new MutationObserver(enhanceAll);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("asc-working:navbar-reload", enhanceAll);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("asc-working:navbar-reload", enhanceAll);
    };
  }, []);

  return null;
}
