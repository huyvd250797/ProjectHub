"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { WorkspaceProject } from "@/lib/projects";

type ProjectContextValue = {
  projects: WorkspaceProject[];
  selectedProject: WorkspaceProject;
  selectProject: (projectId: string) => void;
  isMaster: boolean;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);
const STORAGE_KEY = "asc-working:selected-project-id";
const LEGACY_STORAGE_KEY = "project-hub:selected-project-id";

export function ProjectProvider({
  projects,
  isMaster = false,
  children,
}: {
  projects: WorkspaceProject[];
  isMaster?: boolean;
  children: React.ReactNode;
}) {
  const firstProject = projects[0];
  const [selectedId, setSelectedId] = useState(firstProject?.id ?? "");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored && projects.some((project) => project.id === stored)) {
      setSelectedId(stored);
      window.localStorage.setItem(STORAGE_KEY, stored);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    if (firstProject) {
      setSelectedId(firstProject.id);
      window.localStorage.setItem(STORAGE_KEY, firstProject.id);
    }
  }, [projects, firstProject]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? firstProject,
    [projects, selectedId, firstProject],
  );

  if (!selectedProject) {
    throw new Error("ASC WORKING requires at least one accessible project.");
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isMaster,
        selectProject(projectId: string) {
          if (!projects.some((project) => project.id === projectId)) return;
          setSelectedId(projectId);
          window.localStorage.setItem(STORAGE_KEY, projectId);
        },
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useProject must be used inside ProjectProvider.");
  return value;
}
