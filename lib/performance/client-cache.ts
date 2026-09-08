"use client";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL_MS = 8_000;

export async function fetchJsonCached<T>(url: string, options?: { ttlMs?: number; force?: boolean }): Promise<T> {
  const now = Date.now();
  const cached = responseCache.get(url);
  if (!options?.force && cached && cached.expiresAt > now) return cached.value as T;
  if (!options?.force) {
    const pending = inFlight.get(url);
    if (pending) return pending as Promise<T>;
  }

  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      const body = await response.json() as T;
      if (!response.ok) throw new Error((body as { message?: string })?.message ?? "Không tải được dữ liệu.");
      responseCache.set(url, { value: body, expiresAt: Date.now() + (options?.ttlMs ?? DEFAULT_TTL_MS) });
      return body;
    })
    .finally(() => inFlight.delete(url));

  inFlight.set(url, request);
  return request;
}

export function invalidateClientCache(prefix = "") {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) if (key.startsWith(prefix)) responseCache.delete(key);
}

