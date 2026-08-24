import type { SupabaseClient } from "@supabase/supabase-js";
import { isMasterUser } from "@/lib/access";
import type { MasterProjectMember, MasterProjectRow } from "@/lib/master/types";
import type { ProjectRole } from "@/lib/issues/types";

export const MASTER_PROJECT_SELECT = [
  "id",
  "code",
  "slug",
  "name",
  "description",
  "organization_name",
  "organization_code",
  "organization_address",
  "status",
  "contract_no",
  "contract_value",
  "contract_date",
  "start_date",
  "due_date",
  "contact_name",
  "contact_title",
  "contact_email",
  "contact_phone",
  "notes",
  "created_at",
  "updated_at",
].join(",");

export async function requireMaster(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isMaster: false } as const;
  return { user, isMaster: await isMasterUser(supabase, user.id) } as const;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
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
    description: row.description ? String(row.description) : null,
    organizationName: row.organization_name ? String(row.organization_name) : null,
    organizationCode: row.organization_code ? String(row.organization_code) : null,
    organizationAddress: row.organization_address ? String(row.organization_address) : null,
    status: status === "paused" || status === "completed" || status === "archived" ? status : "active",
    contractNo: row.contract_no ? String(row.contract_no) : null,
    contractValue: nullableNumber(row.contract_value),
    contractDate: row.contract_date ? String(row.contract_date) : null,
    startDate: row.start_date ? String(row.start_date) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    contactName: row.contact_name ? String(row.contact_name) : null,
    contactTitle: row.contact_title ? String(row.contact_title) : null,
    contactEmail: row.contact_email ? String(row.contact_email) : null,
    contactPhone: row.contact_phone ? String(row.contact_phone) : null,
    notes: row.notes ? String(row.notes) : null,
    memberCount,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
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
