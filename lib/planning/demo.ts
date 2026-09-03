import { buildPlanSummary, calculateSequentialSchedule, formatDateOnly } from "@/lib/planning/schedule";
import type { MasterPlan, ProjectMilestone, ProjectPlanData, ProjectPlanStage } from "@/lib/planning/types";

function offsetDate(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

export function createDemoPlan(projectId: string, projectCode = "DEMO"): ProjectPlanData {
  const now = new Date().toISOString();
  const masterPlan: MasterPlan = {
    id: "demo-master-plan",
    title: `Master Plan triển khai ${projectCode}`,
    objective: "Điều phối xuyên suốt phạm vi triển khai, kiểm soát đầu ra từng giai đoạn và bảo đảm nghiệm thu đúng mục tiêu.",
    startDate: offsetDate(-35),
    targetEndDate: offsetDate(104),
    scheduleMode: "business_days",
    status: "active",
    notes: "Lịch demo dùng ngày làm việc từ thứ Hai đến thứ Sáu.",
    createdAt: now,
    updatedAt: now,
  };

  const baseStages: ProjectPlanStage[] = [
    { id: "demo-stage-1", code: "STAGE-01", name: "Khởi động", description: "Kick-off, thống nhất phạm vi và cơ chế phối hợp.", durationDays: 5, startDate: null, endDate: null, status: "completed", progress: 100, color: "#22D3EE", ownerId: "demo-person-1", ownerName: "Võ Đức Huy", sortOrder: 10, createdAt: now, updatedAt: now },
    { id: "demo-stage-2", code: "STAGE-02", name: "Khảo sát & Phân tích", description: "Khảo sát nghiệp vụ, gap analysis và xác nhận yêu cầu.", durationDays: 20, startDate: null, endDate: null, status: "completed", progress: 100, color: "#8B5CF6", ownerId: "demo-person-2", ownerName: "Nguyễn Đức Huy", sortOrder: 20, createdAt: now, updatedAt: now },
    { id: "demo-stage-3", code: "STAGE-03", name: "Cấu hình & Phát triển", description: "Cấu hình hệ thống, phát triển phần mở rộng và kiểm thử nội bộ.", durationDays: 35, startDate: null, endDate: null, status: "in_progress", progress: 46, color: "#F59E0B", ownerId: "demo-person-1", ownerName: "Võ Đức Huy", sortOrder: 30, createdAt: now, updatedAt: now },
    { id: "demo-stage-4", code: "STAGE-04", name: "UAT & Đào tạo", description: "UAT theo kịch bản, xử lý tồn đọng và đào tạo người dùng.", durationDays: 25, startDate: null, endDate: null, status: "not_started", progress: 0, color: "#10B981", ownerId: "demo-person-3", ownerName: "Lê Minh Anh", sortOrder: 40, createdAt: now, updatedAt: now },
    { id: "demo-stage-5", code: "STAGE-05", name: "Nghiệm thu & Go-live", description: "Chốt hồ sơ, nghiệm thu, chuyển đổi và hỗ trợ vận hành.", durationDays: 15, startDate: null, endDate: null, status: "not_started", progress: 0, color: "#F43F5E", ownerId: "demo-person-1", ownerName: "Võ Đức Huy", sortOrder: 50, createdAt: now, updatedAt: now },
  ];
  const stages = calculateSequentialSchedule(masterPlan.startDate, masterPlan.scheduleMode, baseStages);

  const milestones: ProjectMilestone[] = [
    { id: "demo-milestone-1", title: "Biên bản Kick-off", description: "Biên bản họp khởi động được hai bên xác nhận.", dueDate: stages[0].endDate as string, status: "completed", stageId: stages[0].id, stageName: stages[0].name, ownerId: "demo-person-1", ownerName: "Võ Đức Huy", sortOrder: 10, completedAt: stages[0].endDate, createdAt: now, updatedAt: now },
    { id: "demo-milestone-2", title: "Ký xác nhận tài liệu khảo sát", description: "Chốt phạm vi và các gap cần phát triển.", dueDate: stages[1].endDate as string, status: "completed", stageId: stages[1].id, stageName: stages[1].name, ownerId: "demo-person-2", ownerName: "Nguyễn Đức Huy", sortOrder: 20, completedAt: stages[1].endDate, createdAt: now, updatedAt: now },
    { id: "demo-milestone-3", title: "Sẵn sàng UAT", description: "Hoàn tất build UAT và dữ liệu kiểm thử.", dueDate: stages[2].endDate as string, status: "at_risk", stageId: stages[2].id, stageName: stages[2].name, ownerId: "demo-person-1", ownerName: "Võ Đức Huy", sortOrder: 30, completedAt: null, createdAt: now, updatedAt: now },
    { id: "demo-milestone-4", title: "Phê duyệt Go-live", description: "Biên bản đồng ý chuyển sang môi trường vận hành.", dueDate: stages[4].startDate as string, status: "pending", stageId: stages[4].id, stageName: stages[4].name, ownerId: "demo-person-3", ownerName: "Lê Minh Anh", sortOrder: 40, completedAt: null, createdAt: now, updatedAt: now },
    { id: "demo-milestone-5", title: "Nghiệm thu tổng thể", description: "Hoàn tất toàn bộ hồ sơ nghiệm thu dự án.", dueDate: stages[4].endDate as string, status: "pending", stageId: stages[4].id, stageName: stages[4].name, ownerId: "demo-person-1", ownerName: "Võ Đức Huy", sortOrder: 50, completedAt: null, createdAt: now, updatedAt: now },
  ];

  return {
    source: "demo",
    projectId,
    projectCode,
    role: "viewer",
    canEdit: false,
    masterPlan,
    stages,
    milestones,
    people: [
      { value: "demo-person-1", label: "Võ Đức Huy", description: "PM • ASC" },
      { value: "demo-person-2", label: "Nguyễn Đức Huy", description: "Business Analyst • ASC" },
      { value: "demo-person-3", label: "Lê Minh Anh", description: "Consultant • ASC" },
    ],
    summary: buildPlanSummary(masterPlan, stages, milestones),
    generatedAt: now,
  };
}
