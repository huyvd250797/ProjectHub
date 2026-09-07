import type { WorkloadData, WorkloadLevel, WorkloadMember } from "@/lib/workload/types";

function addDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function recommendation(level: WorkloadLevel) {
  if (level === "overloaded") return "Cần giảm tải ngay: chuyển bớt ISSUE/task quá hạn hoặc blocked.";
  if (level === "high") return "Theo dõi sát trong tuần này, chỉ nhận thêm việc nhỏ.";
  if (level === "normal") return "Có thể nhận thêm việc vừa phải nếu cùng chuyên môn.";
  return "Còn capacity tốt, nên ưu tiên giao việc mới hoặc hỗ trợ người quá tải.";
}

function member(input: Partial<WorkloadMember> & Pick<WorkloadMember, "id" | "name" | "capacityScore" | "level">): WorkloadMember {
  return {
    title: "ASC Delivery",
    email: null,
    role: "member",
    departmentName: "Project Team",
    issueCount: 0,
    openIssues: 0,
    overdueIssues: 0,
    dueSoonIssues: 0,
    taskCount: 0,
    openTasks: 0,
    blockedTasks: 0,
    overdueTasks: 0,
    dueSoonTasks: 0,
    milestoneCount: 0,
    openMilestones: 0,
    overdueMilestones: 0,
    reminderCount: 0,
    openReminders: 0,
    overdueReminders: 0,
    dueSoonWork: 0,
    totalOpenWork: 0,
    focusScore: input.capacityScore,
    recommendation: recommendation(input.level),
    nextDueDate: addDays(2),
    items: [],
    ...input,
  };
}

export function createDemoWorkload(projectId: string): WorkloadData {
  const members = [
    member({
      id: "demo-1",
      name: "Võ Đức Huy",
      capacityScore: 92,
      focusScore: 88,
      level: "overloaded",
      issueCount: 7,
      openIssues: 5,
      overdueIssues: 2,
      dueSoonIssues: 3,
      taskCount: 4,
      openTasks: 3,
      blockedTasks: 1,
      overdueTasks: 1,
      dueSoonTasks: 2,
      totalOpenWork: 10,
      dueSoonWork: 5,
      nextDueDate: addDays(-1),
      items: [
        { id: "demo-issue-1", type: "issue", title: "ISSUE cần xử lý trước nghiệm thu", status: "pending", priority: "A", dueDate: addDays(-1), href: "/issues?overdue=1" },
        { id: "demo-task-1", type: "task", title: "Task blocked cần PM tháo gỡ", status: "blocked", priority: "critical", dueDate: addDays(1), href: "/plan" },
      ],
    }),
    member({
      id: "demo-2",
      name: "Nguyễn Minh Anh",
      capacityScore: 48,
      focusScore: 35,
      level: "normal",
      issueCount: 3,
      openIssues: 2,
      dueSoonIssues: 1,
      taskCount: 2,
      openTasks: 2,
      dueSoonTasks: 1,
      totalOpenWork: 4,
      dueSoonWork: 2,
      nextDueDate: addDays(4),
    }),
    member({
      id: "demo-3",
      name: "Trần Quốc Bảo",
      capacityScore: 18,
      focusScore: 12,
      level: "low",
      issueCount: 1,
      openIssues: 1,
      totalOpenWork: 1,
      nextDueDate: addDays(9),
    }),
  ];

  return {
    source: "demo",
    projectId,
    projectCode: "DEMO",
    generatedAt: new Date().toISOString(),
    summary: {
      memberCount: members.length,
      overloadedMembers: 1,
      availableMembers: 2,
      totalOpenWork: 15,
      overdueWork: 3,
      blockedTasks: 1,
      dueSoonWork: 7,
      averageCapacity: 53,
    },
    members,
    suggestions: [
      { memberId: "demo-3", name: "Trần Quốc Bảo", departmentName: "Project Team", level: "low", capacityScore: 18, reason: "Capacity thấp, chưa có việc quá hạn và có thể nhận thêm đầu việc mới." },
      { memberId: "demo-2", name: "Nguyễn Minh Anh", departmentName: "Project Team", level: "normal", capacityScore: 48, reason: "Tải việc ổn định, phù hợp nhận task hỗ trợ ngắn hạn." },
    ],
    risks: [
      { id: "demo-risk-1", title: "Nhân sự quá tải", summary: "Võ Đức Huy đang vượt ngưỡng 85% capacity với ISSUE quá hạn và task blocked.", severity: "critical", ownerName: "Võ Đức Huy", href: "/issues?overdue=1" },
      { id: "demo-risk-2", title: "Việc đến hạn dồn trong 7 ngày", summary: "7 đầu việc cần xử lý sớm, nên điều phối lại trước cuộc họp tuần.", severity: "warning", ownerName: null, href: "/plan" },
    ],
    calendar: [
      { label: "Tuần này", startDate: addDays(0), endDate: addDays(6), dueItems: 7, overloadedDueItems: 4 },
      { label: "Tuần +1", startDate: addDays(7), endDate: addDays(13), dueItems: 5, overloadedDueItems: 1 },
      { label: "Tuần +2", startDate: addDays(14), endDate: addDays(20), dueItems: 2, overloadedDueItems: 0 },
      { label: "Tuần +3", startDate: addDays(21), endDate: addDays(27), dueItems: 1, overloadedDueItems: 0 },
    ],
  };
}
