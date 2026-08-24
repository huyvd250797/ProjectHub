"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ProjectProvider } from "@/components/project-context";
import type { WorkspaceProject } from "@/lib/projects";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  demoMode,
  userEmail,
  projects,
  isMaster = false,
}: {
  children: React.ReactNode;
  demoMode: boolean;
  userEmail?: string | null;
  projects: WorkspaceProject[];
  isMaster?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProjectProvider projects={projects} isMaster={isMaster}>
      <div className="min-h-screen">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed((value) => !value)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "min-h-screen transition-[padding] duration-200",
            collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
          )}
        >
          <Topbar
            demoMode={demoMode}
            userEmail={userEmail}
            isMaster={isMaster}
            onOpenMobile={() => setMobileOpen(true)}
          />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-7">
            {children}
          </main>
          <footer className="mx-auto flex w-full max-w-[1600px] flex-col gap-1 border-t border-white/[0.05] px-4 py-5 text-[10px] uppercase tracking-[0.14em] text-slate-700 md:flex-row md:items-center md:justify-between md:px-6">
            <span>© 2026 HuyVo. All rights reserved.</span>
            <span>ASC WORKING • V0.9.5 • Project Team & Assignee Sync</span>
          </footer>
        </div>
      </div>
    </ProjectProvider>
  );
}
