import type { SupabaseClient } from "@supabase/supabase-js";
import { demoProjects, type WorkspaceProject } from "@/lib/projects";

export async function getWorkspaceProjects(
  supabase: SupabaseClient | null,
): Promise<WorkspaceProject[]> {
  if (!supabase) return demoProjects;

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, code, slug, name, organization_name, status, created_at")
      .order("created_at", { ascending: true });

    // V0.2.0 stays deployable before the migration is applied.
    if (error || !data?.length) return demoProjects;

    return data.map((project) => ({
      id: String(project.id),
      code: String(project.code),
      slug: String(project.slug),
      name: String(project.name),
      organizationName: String(project.organization_name ?? ""),
      status: (project.status ?? "active") as WorkspaceProject["status"],
    }));
  } catch {
    return demoProjects;
  }
}
