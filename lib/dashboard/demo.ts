import type { DashboardData } from "@/lib/dashboard/types";
import type { WorkspaceProject } from "@/lib/projects";

export function createDemoDashboard(project: WorkspaceProject): DashboardData {
  return {
    source: "demo",
    generatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      code: project.code,
      slug: project.slug,
      name: project.name,
      organizationName: project.organizationName,
      contractNo: null,
      contractValue: null,
      contractDate: null,
      startDate: null,
      dueDate: null,
      status: project.status,
    },
    summary: {
      totalIssues: 313,
      modules: 90,
      subsystems: 12,
      departments: 9,
      contractDetails: 5677,
    },
    issueKpis: {
      waitingCustomer: 18,
      waiting: 36,
      processing: 54,
      resolved: 108,
      released: 72,
      handedOver: 198,
      notHandedOver: 115,
      overdue: 6,
    },
    attention: {
      overdue: 6,
      missingAssignee: 11,
      missingModule: 8,
      missingDepartment: 7,
      nearDue: 14,
    },
    contract: {
      handoverProgress: 63,
      handedOver: 198,
      remaining: 115,
    },
    schedule: {
      durationDays: null,
      elapsedDays: null,
      remainingDays: null,
      timeProgress: null,
      health: "not_scheduled",
    },
    stages: [
      { id: "demo-stage-1", code: "STAGE-01", name: "Khởi động", startDate: null, endDate: null, status: "Hoàn tất", progress: 100 },
      { id: "demo-stage-2", code: "STAGE-02", name: "Khảo sát", startDate: null, endDate: null, status: "Đang chạy", progress: 92 },
      { id: "demo-stage-3", code: "STAGE-03", name: "Cấu hình", startDate: null, endDate: null, status: "Đang chạy", progress: 74 },
      { id: "demo-stage-4", code: "STAGE-04", name: "UAT / Training", startDate: null, endDate: null, status: "Đang chạy", progress: 58 },
      { id: "demo-stage-5", code: "STAGE-05", name: "Nghiệm thu", startDate: null, endDate: null, status: "Chuẩn bị", progress: 22 },
    ],
    departments: [
      { id: "demo-dept-1", name: "Phòng/đơn vị 01", total: 54, done: 35, handedOver: 31, remaining: 23, progress: 57 },
      { id: "demo-dept-2", name: "Phòng/đơn vị 02", total: 47, done: 29, handedOver: 28, remaining: 19, progress: 60 },
      { id: "demo-dept-3", name: "Phòng/đơn vị 03", total: 39, done: 28, handedOver: 24, remaining: 15, progress: 62 },
      { id: "demo-dept-4", name: "Phòng/đơn vị 04", total: 36, done: 18, handedOver: 17, remaining: 19, progress: 47 },
      { id: "demo-dept-5", name: "Phòng/đơn vị 05", total: 31, done: 21, handedOver: 20, remaining: 11, progress: 65 },
    ],
    members: [
      { id: "demo-member-1", name: "ASC Member 01", assigned: 74, completed: 51, remaining: 23, progress: 69 },
      { id: "demo-member-2", name: "ASC Member 02", assigned: 62, completed: 47, remaining: 15, progress: 76 },
      { id: "demo-member-3", name: "ASC Member 03", assigned: 51, completed: 34, remaining: 17, progress: 67 },
      { id: "demo-member-4", name: "ASC Member 04", assigned: 43, completed: 26, remaining: 17, progress: 60 },
    ],
  };
}
