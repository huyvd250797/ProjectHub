import type { SupabaseClient } from "@supabase/supabase-js";
import { isMasterUser } from "@/lib/access";
import type { MasterProjectMember, MasterProjectRow } from "@/lib/master/types";
import type { ProjectRole } from "@/lib/issues/types";

export async function requireMaster(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isMaster: false } as const;
  return { user, isMaster: await isMasterUser(supabase, user.id) } as const;
}

export function normalizeMasterProject(
  row: Record<string, unknown>,
  memberCount = 0,
): MasterProjectRow {
  const status = String(row.status ?? "active");
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    organizationName: row.organization_name ? String(row.organization_name) : null,
    status: status === "paused" || status === "completed" || status === "archived" ? status : "active",
    contractNo: row.contract_no ? String(row.contract_no) : null,
    startDate: row.start_date ? String(row.start_date) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    memberCount,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function normalizeMasterMember(
  membership: Record<string, unknown>,
  profile?: Record<string, unknown>,
): MasterProjectMember {
  const role = String(membership.role ?? "viewer") as ProjectRole;
  return {
    userId: String(membership.user_id),
    email: profile?.email ? String(profile.email) : null,
    displayName: profile?.display_name ? String(profile.display_name) : null,
    role: role === "admin" || role === "pm" || role === "member" ? role : "viewer",
    isActive: profile?.is_active !== false,
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
