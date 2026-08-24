import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveProjectRole } from "@/lib/access";
import type { ProjectRole } from "@/lib/issues/types";
import type { ResourceRow } from "@/lib/resources/types";

export async function getProjectRoleForResource(supabase: SupabaseClient, projectId: string, userId: string): Promise<ProjectRole | null> {
  return getEffectiveProjectRole(supabase, projectId, userId);
}

export function normalizeResource(row: Record<string, unknown>, access?: { canReveal?: boolean; canCopy?: boolean; secretHint?: string | null }): ResourceRow {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name ?? ""),
    resourceType: String(row.resource_type ?? "other"),
    environment: row.environment ? String(row.environment) : null,
    urlOrHost: row.url_or_host ? String(row.url_or_host) : null,
    remoteAddress: row.remote_address ? String(row.remote_address) : null,
    username: row.username ? String(row.username) : null,
    hasSecret: Boolean(row.has_secret),
    secretHint: access?.secretHint ?? null,
    notes: row.notes ? String(row.notes) : null,
    isSensitive: Boolean(row.is_sensitive),
    canReveal: Boolean(access?.canReveal),
    canCopy: Boolean(access?.canCopy),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function securityEnvironmentReady() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.trim().length >= 24);
}

export async function getResourceAccess(
  supabase: SupabaseClient,
  projectId: string,
  resourceId: string,
  userId: string,
  role: ProjectRole,
) {
  if (role === "admin" || role === "pm") return { canReveal: true, canCopy: true };
  if (role === "viewer") return { canReveal: false, canCopy: false };
  const { data } = await supabase
    .from("remote_resource_permissions")
    .select("can_reveal, can_copy")
    .eq("project_id", projectId)
    .eq("resource_id", resourceId)
    .eq("user_id", userId)
    .maybeSingle();
  return { canReveal: Boolean(data?.can_reveal), canCopy: Boolean(data?.can_copy) };
}


export async function getResourceAccessMap(
  supabase: SupabaseClient,
  projectId: string,
  resourceIds: string[],
  userId: string,
  role: ProjectRole,
) {
  const result = new Map<string, { canReveal: boolean; canCopy: boolean }>();
  if (!resourceIds.length) return result;

  if (role === "admin" || role === "pm") {
    resourceIds.forEach((id) => result.set(id, { canReveal: true, canCopy: true }));
    return result;
  }

  if (role === "viewer") {
    resourceIds.forEach((id) => result.set(id, { canReveal: false, canCopy: false }));
    return result;
  }

  const { data } = await supabase
    .from("remote_resource_permissions")
    .select("resource_id, can_reveal, can_copy")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .in("resource_id", resourceIds);

  resourceIds.forEach((id) => result.set(id, { canReveal: false, canCopy: false }));
  for (const row of data ?? []) {
    result.set(String(row.resource_id), {
      canReveal: Boolean(row.can_reveal),
      canCopy: Boolean(row.can_copy),
    });
  }
  return result;
}

export function maskUsername(value: string | null) {
  if (!value) return null;
  if (value.length <= 2) return "••";
  if (value.length <= 5) return `${value[0]}•••`;
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}
