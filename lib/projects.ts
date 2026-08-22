export type WorkspaceProject = {
  id: string;
  code: string;
  slug: string;
  name: string;
  organizationName: string;
  status: "active" | "paused" | "completed" | "archived";
};

// EPU is the FIRST project, not the workspace identity.
// Future projects use the same screens/tables and are isolated by project_id.
export const demoProjects: WorkspaceProject[] = [
  {
    id: "00000000-0000-0000-0000-0000000000e1",
    code: "EPU",
    slug: "epu",
    name: "Triển khai PMT-EMS",
    organizationName: "Trường Đại học Điện lực",
    status: "active",
  },
];
