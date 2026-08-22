import type { IssueLookups, IssueRow, IssuesData } from "./types";

const lookups: IssueLookups = {
  statuses: [
    { value: "waiting_customer", label: "Chờ khách hàng" },
    { value: "waiting", label: "Chờ xử lý" },
    { value: "processing", label: "Đang xử lý" },
    { value: "resolved", label: "Đã xử lý" },
    { value: "released", label: "Đã Release" },
  ],
  customerStatuses: [
    { value: "not_handed_over", label: "Chưa bàn giao" },
    { value: "handed_over", label: "Đã bàn giao" },
  ],
  priorities: ["A", "B", "C", "D"].map((value) => ({ value, label: value })),
  stages: [
    { value: "STAGE-01", label: "Khởi động" },
    { value: "STAGE-02", label: "Khảo sát" },
    { value: "STAGE-03", label: "Cấu hình" },
    { value: "STAGE-04", label: "UAT / Training" },
    { value: "STAGE-05", label: "Nghiệm thu" },
  ],
  modules: [
    { value: "00000000-0000-0000-0000-000000000101", label: "Đăng ký học phần", description: "M01" },
    { value: "00000000-0000-0000-0000-000000000102", label: "Quản lý đào tạo", description: "M02" },
  ],
  departments: [
    { value: "00000000-0000-0000-0000-000000000201", label: "Phòng Đào tạo" },
    { value: "00000000-0000-0000-0000-000000000202", label: "Phòng CTSV" },
  ],
  assignees: [
    { value: "00000000-0000-0000-0000-000000000301", label: "ASC Consultant" },
    { value: "00000000-0000-0000-0000-000000000302", label: "ASC Developer" },
  ],
  requesters: [
    { value: "00000000-0000-0000-0000-000000000401", label: "Đầu mối Phòng Đào tạo" },
  ],
};

const today = new Date();
const addDays = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const demoRows: IssueRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000601",
    issueNo: 313,
    content: "Rà soát quy trình đăng ký học phần theo kế hoạch đào tạo và điều kiện tiên quyết.",
    statusCode: "processing",
    customerStatusCode: "not_handed_over",
    priorityCode: "A",
    stageCode: "STAGE-03",
    jiraUrl: "https://example.atlassian.net/browse/EPU-313",
    releaseDate: null,
    dueDate: addDays(3),
    moduleId: lookups.modules[0].value,
    moduleName: lookups.modules[0].label,
    departmentId: lookups.departments[0].value,
    departmentName: lookups.departments[0].label,
    requesterId: lookups.requesters[0].value,
    requesterName: lookups.requesters[0].label,
    assigneeId: lookups.assignees[0].value,
    assigneeName: lookups.assignees[0].label,
    response: "Đang đối chiếu rule với dữ liệu cấu hình.",
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000602",
    issueNo: 312,
    content: "Kiểm tra mapping phòng ban cho các ISSUE chưa xác định đầu mối phụ trách.",
    statusCode: "waiting",
    customerStatusCode: "not_handed_over",
    priorityCode: "B",
    stageCode: "STAGE-02",
    jiraUrl: null,
    releaseDate: null,
    dueDate: addDays(-2),
    moduleId: null,
    moduleName: null,
    departmentId: null,
    departmentName: null,
    requesterId: null,
    requesterName: null,
    assigneeId: null,
    assigneeName: null,
    response: null,
    notes: "Demo attention issue",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000603",
    issueNo: 311,
    content: "Xác nhận bàn giao chức năng tra cứu kết quả học tập sau bản release gần nhất.",
    statusCode: "released",
    customerStatusCode: "handed_over",
    priorityCode: "B",
    stageCode: "STAGE-04",
    jiraUrl: "https://example.atlassian.net/browse/EPU-311",
    releaseDate: addDays(-5),
    dueDate: addDays(-7),
    moduleId: lookups.modules[1].value,
    moduleName: lookups.modules[1].label,
    departmentId: lookups.departments[0].value,
    departmentName: lookups.departments[0].label,
    requesterId: lookups.requesters[0].value,
    requesterName: lookups.requesters[0].label,
    assigneeId: lookups.assignees[1].value,
    assigneeName: lookups.assignees[1].label,
    response: "Đã release và khách hàng xác nhận bàn giao.",
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function createDemoIssues(projectId: string): IssuesData {
  return {
    source: "demo",
    projectId,
    role: "pm",
    canEdit: true,
    canArchive: true,
    page: 1,
    pageSize: 50,
    total: demoRows.length,
    totalPages: 1,
    summary: {
      total: 313,
      notHandedOver: 87,
      mine: 42,
      overdue: 6,
      waiting: 28,
      missingAssignee: 11,
    },
    rows: demoRows,
    lookups,
  };
}
