export const DEFAULT_NAV_ORDER = [
  "/dashboard",
  "/plan",
  "/analytics",
  "/reports",
  "/contract",
  "/departments",
  "/issues",
  "/documents",
  "/activity",
  "/resources",
] as const;

export type NavigationHref = (typeof DEFAULT_NAV_ORDER)[number];

export type WorkspacePreferences = {
  navigationOrder: NavigationHref[];
};

export type WorkspacePreferencesApiResponse =
  | { ok: true; preferences: WorkspacePreferences; source: "database" | "demo" }
  | { ok: false; code: string; message: string };

export function normalizeNavigationOrder(value: unknown): NavigationHref[] {
  const allowed = new Set<string>(DEFAULT_NAV_ORDER);
  const submitted = Array.isArray(value)
    ? value.filter((item): item is NavigationHref => typeof item === "string" && allowed.has(item))
    : [];
  const unique = [...new Set(submitted)];
  for (const href of DEFAULT_NAV_ORDER) {
    if (unique.includes(href)) continue;
    const defaultIndex = DEFAULT_NAV_ORDER.indexOf(href);
    const previous = [...DEFAULT_NAV_ORDER.slice(0, defaultIndex)].reverse().find((candidate) => unique.includes(candidate));
    if (!previous) unique.unshift(href);
    else unique.splice(unique.indexOf(previous) + 1, 0, href);
  }
  return unique;
}
