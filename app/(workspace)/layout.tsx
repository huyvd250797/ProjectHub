import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceProjects } from "@/lib/projects-server";
import { NoProjectAccess } from "@/components/no-project-access";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const projects = await getWorkspaceProjects(supabase);

  if (!supabase) {
    return (
      <AppShell demoMode userEmail={null} projects={projects}>
        {children}
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!projects.length) {
    return <NoProjectAccess userEmail={user.email} />;
  }

  return (
    <AppShell demoMode={false} userEmail={user.email} projects={projects}>
      {children}
    </AppShell>
  );
}
