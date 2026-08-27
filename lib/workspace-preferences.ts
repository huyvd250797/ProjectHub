export const DEFAULT_NAV_ORDER = [
  "/dashboard",
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
  for (const href of DEFAULT_NAV_ORDER) if (!unique.includes(href)) unique.push(href);
  return unique;
}
