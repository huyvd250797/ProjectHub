import { buildProjectCopilotData } from "@/lib/copilot/server";
import type { CopilotData } from "@/lib/copilot/types";
import { createDemoFinancialData } from "@/lib/finance/demo";
import { createDemoPlan } from "@/lib/planning/demo";
import { demoProjects } from "@/lib/projects";
import { createDemoWorkload } from "@/lib/workload/demo";

export function createDemoProjectCopilot(projectId: string): CopilotData {
  const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
  const plan = createDemoPlan(project.id, project.code);
  const workload = createDemoWorkload(project.id);
  const finance = createDemoFinancialData(project.id);
  const nearDueIssues = workload.members.flatMap((member) => member.issueItems.map((issue) => ({
    id: issue.id,
    issueNo: issue.issueNo,
    content: issue.content,
    statusCode: issue.statusCode,
    customerStatusCode: null,
    priorityCode: issue.priorityCode,
    stageCode: null,
    jiraUrl: issue.jiraUrl,
    releaseDate: null,
    dueDate: issue.dueDate,
    estimatedHours: issue.estimatedHours,
    actualHours: 0,
    moduleId: null,
    moduleName: issue.moduleName,
    departmentId: null,
    departmentName: issue.departmentName,
    requesterId: null,
    requesterName: null,
    assigneeId: member.id,
    assigneeName: member.name,
    response: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })));

  return buildProjectCopilotData({
    source: "demo",
    role: "admin",
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      organizationName: project.organizationName,
      status: project.status,
      startDate: null,
      dueDate: null,
    },
    plan,
    workload,
    finance,
    totalIssues: 24,
    openIssues: 12,
    overdueIssues: 3,
    nearDueIssues,
  });
}
