import type { ProjectAnalyticsData } from "@/lib/analytics-types";

export function createDemoAnalytics(projectId: string, projectCode = "DEMO"): ProjectAnalyticsData {
  const trend = [
    ["2026-07-06", "06/07", 18, 12], ["2026-07-13", "13/07", 14, 16],
    ["2026-07-20", "20/07", 21, 17], ["2026-07-27", "27/07", 11, 18],
    ["2026-08-03", "03/08", 16, 15], ["2026-08-10", "10/08", 12, 19],
    ["2026-08-17", "17/08", 9, 14], ["2026-08-24", "24/08", 7, 11],
  ].map(([period, label, created, resolved]) => ({ period: String(period), label: String(label), created: Number(created), resolved: Number(resolved) }));
  return {
    source: "demo", generatedAt: new Date().toISOString(), projectId, projectCode,
    range: { from: "2026-06-01", to: "2026-08-26", days: 90 },
    health: { score: 78, status: "watch", issueScore: 82, deliveryScore: 74, overdueScore: 88, dataQualityScore: 93, scheduleScore: 61 },
    summary: { total: 314, open: 86, resolved: 181, released: 47, handedOver: 232, overdue: 11, highPriorityOpen: 19, createdInRange: 108, resolvedInRange: 122, avgAgeDays: 18, avgResolutionDays: 24 },
    backlogAging: [
      { code: "lt7", label: "< 7 ngày", value: 21, percent: 24 }, { code: "7_14", label: "7–14 ngày", value: 18, percent: 21 },
      { code: "15_30", label: "15–30 ngày", value: 23, percent: 27 }, { code: "gt30", label: "> 30 ngày", value: 24, percent: 28 },
    ],
    statusDistribution: [
      { code: "resolved", label: "Đã xử lý", value: 181, percent: 58 }, { code: "released", label: "Đã Release", value: 47, percent: 15 },
      { code: "processing", label: "Đang xử lý", value: 34, percent: 11 }, { code: "waiting", label: "Chờ xử lý", value: 52, percent: 16 },
    ],
    priorityDistribution: [
      { code: "A", label: "A", value: 54, percent: 17 }, { code: "B", label: "B", value: 121, percent: 39 },
      { code: "C", label: "C", value: 103, percent: 33 }, { code: "D", label: "D", value: 36, percent: 11 },
    ],
    trend,
    topModules: [
      { id: "m1", name: "Quản lý đăng ký học phần", total: 42, open: 18, overdue: 5, highPriority: 7, progress: 57, riskScore: 63 },
      { id: "m2", name: "Quản lý điểm số", total: 36, open: 12, overdue: 3, highPriority: 4, progress: 67, riskScore: 44 },
      { id: "m3", name: "Quản trị hệ thống và phân quyền", total: 28, open: 11, overdue: 2, highPriority: 5, progress: 61, riskScore: 41 },
    ],
    topDepartments: [
      { id: "d1", name: "Phòng quản lý đào tạo", total: 112, open: 34, overdue: 6, highPriority: 9, progress: 70, riskScore: 47 },
      { id: "d2", name: "Phòng công tác sinh viên", total: 49, open: 16, overdue: 3, highPriority: 5, progress: 67, riskScore: 43 },
    ],
    members: [
      { id: "p1", name: "Võ Đức Huy", email: null, total: 151, open: 38, overdue: 5, highPriority: 10, progress: 75, riskScore: 39 },
      { id: "p2", name: "Nguyễn Đức Huy", email: null, total: 83, open: 31, overdue: 4, highPriority: 7, progress: 63, riskScore: 48 },
    ],
    attention: { missingModule: 12, missingDepartment: 9, missingAssignee: 8, nearDue: 14 },
  };
}
