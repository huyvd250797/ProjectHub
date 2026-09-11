"use client";

type CacheEntry = {
  expiresAt: number;
  staleUntil: number;
  value: unknown;
};

const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL_MS = 8_000;
const DEFAULT_STALE_MS = 45_000;

type FetchJsonCachedOptions = {
  ttlMs?: number;
  staleMs?: number;
  force?: boolean;
  staleWhileRevalidate?: boolean;
};

function fetchAndCache<T>(url: string, options?: FetchJsonCachedOptions): Promise<T> {
  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      const body = await response.json() as T;
      if (!response.ok) throw new Error((body as { message?: string })?.message ?? "Không tải được dữ liệu.");
      const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
      responseCache.set(url, {
        value: body,
        expiresAt: Date.now() + ttlMs,
        staleUntil: Date.now() + ttlMs + (options?.staleMs ?? DEFAULT_STALE_MS),
      });
      return body;
    })
    .finally(() => inFlight.delete(url));

  inFlight.set(url, request);
  return request;
}

export async function fetchJsonCached<T>(url: string, options?: FetchJsonCachedOptions): Promise<T> {
  const now = Date.now();
  const cached = responseCache.get(url);
  if (!options?.force && cached && cached.expiresAt > now) return cached.value as T;
  if (!options?.force && options?.staleWhileRevalidate !== false && cached && cached.staleUntil > now) {
    if (!inFlight.has(url)) void fetchAndCache<T>(url, options).catch(() => undefined);
    return cached.value as T;
  }
  if (!options?.force) {
    const pending = inFlight.get(url);
    if (pending) return pending as Promise<T>;
  }

  return fetchAndCache<T>(url, options);
}

export function invalidateClientCache(prefix = "") {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) if (key.startsWith(prefix)) responseCache.delete(key);
}

export function prefetchJson(url: string, options?: FetchJsonCachedOptions) {
  if (responseCache.has(url) || inFlight.has(url)) return;
  void fetchJsonCached(url, options).catch(() => undefined);
}

export function getClientCacheStats() {
  return {
    entries: responseCache.size,
    inFlight: inFlight.size,
  };
}
