import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceProjects } from "@/lib/projects-server";
import { NoProjectAccess } from "@/components/no-project-access";
import { isMasterUser } from "@/lib/access";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  if (!supabase) {
    const projects = await getWorkspaceProjects(null);
    return (
      <AppShell demoMode userEmail={null} projects={projects} isMaster={false}>
        {children}
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [projects, master] = await Promise.all([
    getWorkspaceProjects(supabase),
    isMasterUser(supabase, user.id),
  ]);

  if (!projects.length) {
    return <NoProjectAccess userEmail={user.email} isMaster={master} />;
  }

  return (
    <AppShell demoMode={false} userEmail={user.email} projects={projects} isMaster={master}>
      {children}
    </AppShell>
  );
}
