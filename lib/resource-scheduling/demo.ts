import type { ResourceScheduleData, ResourceScheduleItem, ResourceScheduleLevel, ResourceScheduleMember, ResourceScheduleMemberWeek, ResourceScheduleWeek } from "@/lib/resource-scheduling/types";

function addDays(base: string, days: number) {
  const date = new Date(`${base}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayOnly() {
  return new Date().toISOString().slice(0, 10);
}

function weeks(startDate?: string | null) {
  const today = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : todayOnly();
  return Array.from({ length: 6 }).map((_, index) => {
    const startDate = addDays(today, index * 7);
    const endDate = addDays(startDate, 6);
    return { id: `${startDate}_${endDate}`, label: index === 0 ? "Tuần này" : `Tuần +${index}`, startDate, endDate } satisfies ResourceScheduleWeek;
  });
}

function issue(id: string, code: string, title: string, dueDate: string, hours: number, ownerId: string | null, ownerName: string | null): ResourceScheduleItem {
  return {
    id,
    type: "issue",
    code,
    title,
    status: "waiting",
    priority: hours >= 8 ? "A" : "B",
    dueDate,
    estimatedHours: hours,
    ownerId,
    ownerName,
    moduleName: "Quản lý hoạt động ngoại khóa",
    departmentName: "Phòng công tác sinh viên",
    stageName: null,
    jiraUrl: "https://task.ascvn.com.vn/browse/DEMO-101",
  };
}

function task(id: string, title: string, dueDate: string, hours: number, ownerId: string | null, ownerName: string | null): ResourceScheduleItem {
  return {
    id,
    type: "task",
    code: "TASK",
    title,
    status: "doing",
    priority: hours >= 8 ? "high" : "medium",
    dueDate,
    estimatedHours: hours,
    ownerId,
    ownerName,
    moduleName: null,
    departmentName: null,
    stageName: "UAT & Release",
    jiraUrl: null,
  };
}

function member(id: string, name: string, role: string, capacity: number, itemsByWeek: ResourceScheduleItem[][], allWeeks: ResourceScheduleWeek[]): ResourceScheduleMember {
  const weeks = allWeeks.map((week, index) => {
    const items = itemsByWeek[index] ?? [];
    const plannedHours = Math.round(items.reduce((sum, item) => sum + item.estimatedHours, 0) * 100) / 100;
    const allocationPercent = capacity > 0 ? Math.round(plannedHours / capacity * 100) : plannedHours > 0 ? 100 : 0;
    const overloadHours = Math.round(Math.max(0, plannedHours - capacity) * 100) / 100;
    const level: ResourceScheduleLevel = overloadHours > 0 || allocationPercent >= 100 ? "overloaded" : allocationPercent >= 85 ? "tight" : allocationPercent >= 50 ? "balanced" : "available";
    const row: ResourceScheduleMemberWeek = {
      weekId: week.id,
      plannedHours,
      allocationPercent,
      availableHours: Math.round(Math.max(0, capacity - plannedHours) * 100) / 100,
      overloadHours,
      level,
      items,
    };
    return row;
  });
  return {
    id,
    name,
    title: role,
    role: "Member",
    departmentName: "ASC Delivery",
    capacityHoursPerWeek: capacity,
    allocationTargetPercent: 100,
    effectiveCapacityHours: capacity,
    totalPlannedHours: Math.round(weeks.reduce((sum, week) => sum + week.plannedHours, 0) * 100) / 100,
    totalAvailableHours: Math.round(weeks.reduce((sum, week) => sum + week.availableHours, 0) * 100) / 100,
    totalOverloadHours: Math.round(weeks.reduce((sum, week) => sum + week.overloadHours, 0) * 100) / 100,
    averageAllocationPercent: Math.round(weeks.reduce((sum, week) => sum + week.allocationPercent, 0) / weeks.length),
    weeks: weeks.map((week) => ({ ...week, items: [...week.items] })),
  };
}

export function createDemoResourceSchedule(projectId: string, startDate?: string | null): ResourceScheduleData {
  const allWeeks = weeks(startDate);
  const huy1 = issue("demo-issue-1", "#121", "Đưa văn bản nội bộ lên mobile", allWeeks[0].endDate, 10, "demo-huy", "Nguyễn Đức Huy");
  const huy2 = issue("demo-issue-2", "#127", "Xử lý phân quyền theo vai trò", allWeeks[0].endDate, 14, "demo-huy", "Nguyễn Đức Huy");
  const truong1 = issue("demo-issue-3", "#153", "Đổ dữ liệu chấm công lịch dạy", allWeeks[1].endDate, 8, "demo-truong", "Lê Đăng Trường");
  const vinh1 = task("demo-task-1", "Chuẩn bị checklist UAT", allWeeks[2].endDate, 6, "demo-vinh", "Nguyễn Phúc Vĩnh Nguyên");
  const unassigned = [
    issue("demo-issue-4", "#213", "Điều chỉnh thứ tự cột và trạng thái bàn giao", allWeeks[0].endDate, 5, null, null),
    task("demo-task-2", "Tổng hợp tài liệu release", allWeeks[1].endDate, 4, null, null),
  ];
  const members = [
    member("demo-huy", "Nguyễn Đức Huy", "Developer", 24, [[huy1, huy2], [], [], [], [], []], allWeeks),
    member("demo-truong", "Lê Đăng Trường", "Developer", 40, [[], [truong1], [], [], [], []], allWeeks),
    member("demo-vinh", "Nguyễn Phúc Vĩnh Nguyên", "Tester", 32, [[], [], [vinh1], [], [], []], allWeeks),
  ];
  return {
    source: "demo",
    projectId,
    projectCode: "DEMO",
    generatedAt: new Date().toISOString(),
    weeks: allWeeks,
    members,
    unassignedItems: unassigned,
    summary: {
      memberCount: members.length,
      assignableItems: 4,
      unassignedItems: unassigned.length,
      overloadedSlots: members.reduce((sum, item) => sum + item.weeks.filter((week) => week.level === "overloaded").length, 0),
      totalPlannedHours: members.reduce((sum, item) => sum + item.totalPlannedHours, 0),
      totalAvailableHours: members.reduce((sum, item) => sum + item.totalAvailableHours, 0),
      totalOverloadHours: members.reduce((sum, item) => sum + item.totalOverloadHours, 0),
    },
  };
}
