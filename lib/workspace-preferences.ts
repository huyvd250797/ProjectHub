export const DEFAULT_NAV_ORDER = [
  "/command-center",
  "/dashboard",
  "/portfolio",
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

export type NavigationDisplayLabels = Partial<Record<NavigationHref, string>>;

export type WorkspacePreferences = {
  navigationOrder: NavigationHref[];
  navigationDisplayLabels: NavigationDisplayLabels;
};

export type WorkspacePreferencesApiResponse =
  | { ok: true; preferences: WorkspacePreferences; source: "database" | "demo" }
  | { ok: false; code: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeNavigationOrder(value: unknown): NavigationHref[] {
  const allowed = new Set<string>(DEFAULT_NAV_ORDER);
  const rawOrder = isRecord(value) ? value.order : value;
  const submitted = Array.isArray(rawOrder)
    ? rawOrder.filter((item): item is NavigationHref => typeof item === "string" && allowed.has(item))
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

export function normalizeNavigationDisplayLabels(value: unknown): NavigationDisplayLabels {
  const allowed = new Set<string>(DEFAULT_NAV_ORDER);
  const rawLabels = isRecord(value) && isRecord(value.displayLabels) ? value.displayLabels : value;
  if (!isRecord(rawLabels)) return {};
  return Object.fromEntries(
    Object.entries(rawLabels)
      .filter(([href, label]) => allowed.has(href) && typeof label === "string")
      .map(([href, label]) => [href, String(label).trim()])
      .filter(([, label]) => label.length > 0 && label.length <= 40),
  ) as NavigationDisplayLabels;
}

export function normalizeWorkspacePreferences(value: unknown): WorkspacePreferences {
  return {
    navigationOrder: normalizeNavigationOrder(value),
    navigationDisplayLabels: normalizeNavigationDisplayLabels(value),
  };
}
