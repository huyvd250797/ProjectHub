import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectRole } from "@/lib/issues/types";

export type GlobalRole = "user" | "master";

export async function getGlobalRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<GlobalRole> {
  const { data } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", userId)
    .maybeSingle();

  return data?.global_role === "master" ? "master" : "user";
}

export async function isMasterUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  return (await getGlobalRole(supabase, userId)) === "master";
}

export async function getEffectiveProjectRole(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  if (await isMasterUser(supabase, userId)) return "admin";

  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const role = data?.role;
  return role === "admin" || role === "pm" || role === "member" || role === "viewer"
    ? role
    : null;
}
