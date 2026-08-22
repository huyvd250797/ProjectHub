"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { WorkspaceProject } from "@/lib/projects";

type ProjectContextValue = {
  projects: WorkspaceProject[];
  selectedProject: WorkspaceProject;
  selectProject: (projectId: string) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  projects,
  children,
}: {
  projects: WorkspaceProject[];
  children: React.ReactNode;
}) {
  const firstProject = projects[0];
  const [selectedId, setSelectedId] = useState(firstProject?.id ?? "");

  useEffect(() => {
    const stored = window.localStorage.getItem("project-hub:selected-project-id");
    if (stored && projects.some((project) => project.id === stored)) {
      setSelectedId(stored);
      return;
    }
    if (firstProject) setSelectedId(firstProject.id);
  }, [projects, firstProject]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? firstProject,
    [projects, selectedId, firstProject],
  );

  if (!selectedProject) {
    throw new Error("Project Workspace requires at least one accessible project.");
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectProject(projectId: string) {
          if (!projects.some((project) => project.id === projectId)) return;
          setSelectedId(projectId);
          window.localStorage.setItem("project-hub:selected-project-id", projectId);
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
