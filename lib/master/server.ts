import type { SupabaseClient } from "@supabase/supabase-js";
import { isMasterUser } from "@/lib/access";
import type { MasterProjectMember, MasterProjectRow } from "@/lib/master/types";
import type { ProjectRole } from "@/lib/issues/types";

export const MASTER_PROJECT_SELECT = "id,code,slug,name,description,organization_name,organization_code,organization_address,status,contract_no,contract_value,contract_date,start_date,due_date,contact_name,contact_title,contact_email,contact_phone,notes,created_at,updated_at" as const;

export async function requireMaster(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isMaster: false } as const;
  return { user, isMaster: await isMasterUser(supabase, user.id) } as const;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeMasterProject(
  value: unknown,
  memberCount = 0,
): MasterProjectRow {
  const row = asRecord(value);
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
  membershipValue: unknown,
  profileValue?: unknown,
  personValue?: unknown,
): MasterProjectMember {
  const membership = asRecord(membershipValue);
  const profile = asRecord(profileValue);
  const person = asRecord(personValue);
  const rawRole = String(membership?.role ?? person?.project_role ?? "member");
  const role: ProjectRole = rawRole === "admin" || rawRole === "pm" || rawRole === "viewer" ? rawRole : "member";
  const personId = person?.id ? String(person.id) : "";
  const userId = person?.user_id ? String(person.user_id) : membership?.user_id ? String(membership.user_id) : null;
  const email = profile?.email ? String(profile.email) : person?.email ? String(person.email) : null;
  const displayName = person?.full_name ? String(person.full_name) : profile?.display_name ? String(profile.display_name) : null;
  return {
    memberId: personId,
    userId,
    personId,
    email,
    displayName,
    role,
    isActive: person?.is_active !== false && profile?.is_active !== false,
    loginLinked: Boolean(userId && profile?.id),
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
