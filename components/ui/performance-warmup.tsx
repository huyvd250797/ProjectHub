"use client";

import { useEffect } from "react";
import { useProject } from "@/components/project-context";
import { prefetchJson } from "@/lib/performance/client-cache";

const WARMUP_PATHS = [
  "/api/issues/preferences",
  "/api/issues/views",
  "/api/workload",
  "/api/resource-scheduling",
  "/api/finance",
  "/api/notifications",
];

function scheduleIdle(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const idle = window as Window & { requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number; cancelIdleCallback?: (id: number) => void };
  if (idle.requestIdleCallback) {
    const id = idle.requestIdleCallback(callback, { timeout: 1800 });
    return () => idle.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 700);
  return () => window.clearTimeout(id);
}

export function PerformanceWarmup() {
  const { selectedProject } = useProject();

  useEffect(() => {
    const cancel = scheduleIdle(() => {
      for (const path of WARMUP_PATHS) {
        const separator = path.includes("?") ? "&" : "?";
        prefetchJson(`${path}${separator}projectId=${encodeURIComponent(selectedProject.id)}`, { ttlMs: 20_000, staleMs: 120_000 });
      }
    });
    return cancel;
  }, [selectedProject.id]);

  return null;
}
