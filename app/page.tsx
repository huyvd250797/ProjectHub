"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "Admin" | "PM" | "Member" | "Viewer";
type ProjectStatus = "Planning" | "In Progress" | "At Risk" | "Blocked" | "Acceptance" | "Closed";
type TaskStatus = "Todo" | "Doing" | "Waiting" | "Done";
type Priority = "High" | "Medium" | "Low";

type Customer = {
  id: string;
  name: string;
  type: string;
  province: string;
  contact: string;
};

type Project = {
  id: string;
  code: string;
  name: string;
  customerId: string;
  pm: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  healthNote: string;
};

type Milestone = {
  id: string;
  projectId: string;
  name: string;
  phase: string;
  owner: string;
  plannedDate: string;
  actualDate: string;
  status: "On Track" | "Risk" | "Late" | "Done";
  progress: number;
  evidence: string;
};

type Task = {
  id: string;
  projectId: string;
  milestoneId: string;
  title: string;
  owner: string;
  dueDate: string;
  status: TaskStatus;
  priority: Priority;
  blockedReason: string;
};

type IssueStatus = "Chờ khách hàng" | "Không xử lý" | "Chờ xử lý" | "Đang xử lý" | "Đã xử lý" | "Đã Release" | "Không khả thi";
type CustomerIssueStatus = "Chưa bàn giao" | "Đã bàn giao";
type ModuleDeliveryStatus = "Đã khảo sát" | "Sẵn sàng tập huấn" | "Đã tập huấn" | "Sẵn sàng nghiệm thu" | "Đã nghiệm thu";
type AcceptanceStep = "Khảo sát" | "Đào tạo/Tập huấn" | "Xác nhận hoàn thành";

type ProjectModule = {
  id: string;
  projectId: string;
  department: string;
  subsystem: string;
  moduleName: string;
  totalIssues: number;
  deliveredIssues: number;
  owner: string;
  status: ModuleDeliveryStatus;
  surveyDone: boolean;
  trainingDone: boolean;
  acceptanceDone: boolean;
};

type ProjectIssue = {
  id: string;
  projectId: string;
  moduleName: string;
  department: string;
  content: string;
  status: IssueStatus;
  customerStatus: CustomerIssueStatus;
  priority: "A" | "B" | "C" | "D";
  phase: "Giai đoạn 1" | "Giai đoạn 2" | "Giai đoạn 3";
  releaseDate: string;
  dueDate: string;
  assignee: string;
};

type ProjectIssueSummary = {
  projectId: string;
  status: string;
  quantity: number;
  emphasized?: boolean;
};

type AcceptanceRecord = {
  id: string;
  projectId: string;
  department: string;
  moduleName: string;
  step: AcceptanceStep;
  status: "Chưa bắt đầu" | "Đang thực hiện" | "Hoàn tất";
  owner: string;
  evidence: string;
};

type ContractInfo = {
  projectId: string;
  number: string;
  valuation: number;
  contractDate: string;
  status: "Running" | "Paused" | "Closed";
  beginDate: string;
  dueDate: string;
  masterPlanDays: number;
  passedDays: number;
  remainDays: number;
};

type ProjectStage = {
  id: string;
  projectId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  networkDays: number;
};

type ProjectMember = {
  id: string;
  projectId: string;
  name: string;
  position: string;
  issueTotal: number;
  doneTotal: number;
};

type ProjectPortal = {
  id: string;
  projectId: string;
  name: string;
  link: string;
  username: string;
  passwordHint: string;
  environment: "Production" | "Test";
};

type ProjectServer = {
  id: string;
  projectId: string;
  name: string;
  remote: string;
  username: string;
  passwordHint: string;
  environment: "Main" | "Test";
};

type AuditLog = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};

type ProjectHubState = {
  customers: Customer[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  modules: ProjectModule[];
  issues: ProjectIssue[];
  issueSummaries: ProjectIssueSummary[];
  acceptanceRecords: AcceptanceRecord[];
  contracts: ContractInfo[];
  stages: ProjectStage[];
  members: ProjectMember[];
  portals: ProjectPortal[];
  servers: ProjectServer[];
  auditLogs: AuditLog[];
};

const STORAGE_KEY = "asc-projecthub-v0.5.2";

const statusLabel: Record<ProjectStatus, string> = {
  Planning: "Lập kế hoạch",
  "In Progress": "Đang triển khai",
  "At Risk": "Có rủi ro",
  Blocked: "Bị chặn",
  Acceptance: "Nghiệm thu",
  Closed: "Đã đóng",
};

const statusTone: Record<ProjectStatus, string> = {
  Planning: "border-sky-200 bg-sky-50 text-sky-800",
  "In Progress": "border-blue-200 bg-blue-50 text-blue-800",
  "At Risk": "border-amber-200 bg-amber-50 text-amber-800",
  Blocked: "border-rose-200 bg-rose-50 text-rose-800",
  Acceptance: "border-violet-200 bg-violet-50 text-violet-800",
  Closed: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const milestoneTone: Record<Milestone["status"], string> = {
  "On Track": "border-blue-200 bg-blue-50 text-blue-800",
  Risk: "border-amber-200 bg-amber-50 text-amber-800",
  Late: "border-rose-200 bg-rose-50 text-rose-800",
  Done: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const taskColumns: { key: TaskStatus; label: string }[] = [
  { key: "Todo", label: "Chưa làm" },
  { key: "Doing", label: "Đang làm" },
  { key: "Waiting", label: "Chờ khách hàng" },
  { key: "Done", label: "Hoàn tất" },
];

const seedState: ProjectHubState = {
  customers: [
    {
      id: "customer-epu",
      name: "Trường Đại học Điện lực",
      type: "Đại học công lập",
      province: "Hà Nội",
      contact: "Phòng Đào tạo",
    },
    {
      id: "customer-hcmue",
      name: "Trường Đại học Sư phạm TP.HCM",
      type: "Đại học công lập",
      province: "TP.HCM",
      contact: "Trung tâm CNTT",
    },
  ],
  projects: [
    {
      id: "project-epu",
      code: "ASC-UNI-001",
      name: "Triển khai OneUni EPU",
      customerId: "customer-epu",
      pm: "Huy Vo",
      status: "In Progress",
      progress: 75,
      startDate: "2025-07-23",
      endDate: "2026-04-30",
      healthNote: "Đang theo dõi triển khai tổng thể: hợp đồng, giai đoạn, issue, module, thành viên và cổng vận hành.",
    },
    {
      id: "project-hcmue",
      code: "ASC-UNI-002",
      name: "Nâng cấp cổng sinh viên OneUni",
      customerId: "customer-hcmue",
      pm: "Mai Anh",
      status: "In Progress",
      progress: 78,
      startDate: "2026-07-15",
      endDate: "2026-09-05",
      healthNote: "Khách hàng phản hồi nhanh, phạm vi đang ổn định.",
    },
  ],
  milestones: [
    {
      id: "ms-1",
      projectId: "project-epu",
      name: "Khảo sát hiện trạng",
      phase: "Khảo sát",
      owner: "PM",
      plannedDate: "2026-08-08",
      actualDate: "2026-08-08",
      status: "Done",
      progress: 100,
      evidence: "Biên bản khảo sát đã xác nhận",
    },
    {
      id: "ms-2",
      projectId: "project-epu",
      name: "UAT tuyển sinh",
      phase: "UAT",
      owner: "Khách hàng",
      plannedDate: "2026-08-26",
      actualDate: "",
      status: "Risk",
      progress: 45,
      evidence: "Cần chốt bộ test case",
    },
    {
      id: "ms-3",
      projectId: "project-hcmue",
      name: "Tập huấn phòng đào tạo",
      phase: "Tập huấn",
      owner: "PM",
      plannedDate: "2026-08-26",
      actualDate: "",
      status: "On Track",
      progress: 30,
      evidence: "Danh sách tham dự đang xác nhận",
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "project-epu",
      milestoneId: "ms-2",
      title: "Đối soát dữ liệu thí sinh trúng tuyển",
      owner: "Data team",
      dueDate: "2026-08-22",
      status: "Doing",
      priority: "High",
      blockedReason: "",
    },
    {
      id: "task-2",
      projectId: "project-epu",
      milestoneId: "ms-2",
      title: "Gửi form xác nhận lịch UAT",
      owner: "PM",
      dueDate: "2026-08-23",
      status: "Waiting",
      priority: "High",
      blockedReason: "Chờ đầu mối khách hàng phản hồi",
    },
    {
      id: "task-3",
      projectId: "project-hcmue",
      milestoneId: "ms-3",
      title: "Chuẩn bị slide tập huấn",
      owner: "PM",
      dueDate: "2026-08-24",
      status: "Todo",
      priority: "Medium",
      blockedReason: "",
    },
  ],
  modules: [
    {
      id: "module-epu-1",
      projectId: "project-epu",
      department: "Trung tâm CNTT",
      subsystem: "Quản trị hệ thống",
      moduleName: "Quản trị hệ thống và phân quyền người dùng",
      totalIssues: 1,
      deliveredIssues: 0,
      owner: "Đầu mối Phòng đào tạo",
      status: "Sẵn sàng nghiệm thu",
      surveyDone: true,
      trainingDone: true,
      acceptanceDone: false,
    },
    {
      id: "module-epu-2",
      projectId: "project-epu",
      department: "Phòng quản lý đào tạo",
      subsystem: "Đào tạo",
      moduleName: "Phân hệ quản lý đào tạo các hệ và các bậc đào tạo",
      totalIssues: 33,
      deliveredIssues: 0,
      owner: "Đầu mối Phòng khảo thí",
      status: "Đã tập huấn",
      surveyDone: true,
      trainingDone: true,
      acceptanceDone: false,
    },
    {
      id: "module-epu-3",
      projectId: "project-epu",
      department: "Phòng tổ chức - hành chính",
      subsystem: "Nhân sự",
      moduleName: "Phân hệ quản lý nhân sự, quản lý đánh giá nhân sự và thù lao giảng dạy",
      totalIssues: 14,
      deliveredIssues: 0,
      owner: "Đầu mối Phòng công tác sinh viên",
      status: "Sẵn sàng tập huấn",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-4",
      projectId: "project-epu",
      department: "Phòng tổ chức - hành chính",
      subsystem: "Hành chính",
      moduleName: "Phân hệ hành chính điện tử",
      totalIssues: 8,
      deliveredIssues: 0,
      owner: "Đầu mối Phòng tổ chức",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-5",
      projectId: "project-epu",
      department: "Phòng Nghiên cứu khoa học - Hợp tác quốc tế",
      subsystem: "Nghiên cứu khoa học",
      moduleName: "Phân hệ quản lý khoa học và tạp chí điện tử",
      totalIssues: 5,
      deliveredIssues: 0,
      owner: "Đầu mối NCKH",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-6",
      projectId: "project-epu",
      department: "Phòng Nghiên cứu khoa học - Hợp tác quốc tế",
      subsystem: "Hợp tác quốc tế",
      moduleName: "Phân hệ quản lý Hợp tác quốc tế",
      totalIssues: 4,
      deliveredIssues: 0,
      owner: "Đầu mối HTQT",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-7",
      projectId: "project-epu",
      department: "Quản trị - Dịch vụ",
      subsystem: "Tài sản",
      moduleName: "Phân hệ quản lý tài sản và cơ sở vật chất",
      totalIssues: 11,
      deliveredIssues: 0,
      owner: "Đầu mối quản trị",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-8",
      projectId: "project-epu",
      department: "Quản trị - Dịch vụ",
      subsystem: "Ký túc xá",
      moduleName: "Phân hệ quản lý ký túc xá",
      totalIssues: 6,
      deliveredIssues: 0,
      owner: "Đầu mối ký túc xá",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-9",
      projectId: "project-epu",
      department: "Ban giám hiệu",
      subsystem: "Điều hành",
      moduleName: "Hệ thống thông tin hỗ trợ chỉ đạo điều hành",
      totalIssues: 9,
      deliveredIssues: 0,
      owner: "Đầu mối điều hành",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-10",
      projectId: "project-epu",
      department: "Trung tâm thư viện",
      subsystem: "Thư viện",
      moduleName: "Tích hợp phần mềm quản lý thư viện Libol",
      totalIssues: 5,
      deliveredIssues: 0,
      owner: "Đầu mối thư viện",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-11",
      projectId: "project-epu",
      department: "Thanh tra - Pháp chế",
      subsystem: "Thanh tra",
      moduleName: "Phân hệ quản lý công tác thanh tra, pháp chế",
      totalIssues: 9,
      deliveredIssues: 0,
      owner: "Đầu mối pháp chế",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-epu-12",
      projectId: "project-epu",
      department: "Phòng kế hoạch tài chính",
      subsystem: "Tài chính",
      moduleName: "Tích hợp dữ liệu thu học phí với phần mềm tài chính kế toán",
      totalIssues: 1,
      deliveredIssues: 0,
      owner: "Đầu mối tài chính",
      status: "Đã khảo sát",
      surveyDone: true,
      trainingDone: false,
      acceptanceDone: false,
    },
    {
      id: "module-hcmue-1",
      projectId: "project-hcmue",
      department: "Trung tâm CNTT",
      subsystem: "Cổng sinh viên",
      moduleName: "Cổng thông tin sinh viên",
      totalIssues: 9,
      deliveredIssues: 7,
      owner: "Trung tâm CNTT",
      status: "Đã tập huấn",
      surveyDone: true,
      trainingDone: true,
      acceptanceDone: false,
    },
  ],
  issues: [
    {
      id: "issue-epu-1",
      projectId: "project-epu",
      moduleName: "Quản lý chứng chỉ, chuẩn đầu ra, xét tốt nghiệp",
      department: "Phòng quản lý đào tạo",
      content: "Chứng chỉ sinh viên quá hạn cần hiển thị đúng trạng thái trên trang sinh viên.",
      status: "Đã xử lý",
      customerStatus: "Đã bàn giao",
      priority: "A",
      phase: "Giai đoạn 1",
      releaseDate: "2026-08-12",
      dueDate: "2026-08-20",
      assignee: "Data team",
    },
    {
      id: "issue-epu-2",
      projectId: "project-epu",
      moduleName: "Tổ chức thi tập trung",
      department: "Phòng khảo thí & Bảo đảm chất lượng",
      content: "Bổ sung bộ lọc theo số báo danh trong danh sách trộn lịch thi.",
      status: "Đã Release",
      customerStatus: "Đã bàn giao",
      priority: "B",
      phase: "Giai đoạn 1",
      releaseDate: "2026-08-19",
      dueDate: "2026-08-21",
      assignee: "Dev team",
    },
    {
      id: "issue-epu-3",
      projectId: "project-epu",
      moduleName: "Quản lý lớp học và hồ sơ người học",
      department: "Phòng công tác sinh viên",
      content: "Đối soát dữ liệu lớp, trạng thái sinh viên và hồ sơ nhập học trực tuyến.",
      status: "Đang xử lý",
      customerStatus: "Chưa bàn giao",
      priority: "A",
      phase: "Giai đoạn 2",
      releaseDate: "",
      dueDate: "2026-08-28",
      assignee: "PM",
    },
    {
      id: "issue-epu-4",
      projectId: "project-epu",
      moduleName: "Quản lý Hồ sơ nhân sự",
      department: "Phòng tổ chức - hành chính",
      content: "Chuẩn hóa dữ liệu nhân sự trước khi chuyển sang môi trường vận hành.",
      status: "Chờ khách hàng",
      customerStatus: "Chưa bàn giao",
      priority: "C",
      phase: "Giai đoạn 2",
      releaseDate: "",
      dueDate: "2026-08-30",
      assignee: "Khách hàng",
    },
    {
      id: "issue-hcmue-1",
      projectId: "project-hcmue",
      moduleName: "Cổng thông tin sinh viên",
      department: "Trung tâm CNTT",
      content: "Tối ưu màn hình thông báo và lịch học trên mobile.",
      status: "Đã Release",
      customerStatus: "Đã bàn giao",
      priority: "B",
      phase: "Giai đoạn 1",
      releaseDate: "2026-08-15",
      dueDate: "2026-08-18",
      assignee: "Frontend",
    },
  ],
  issueSummaries: [
    { projectId: "project-epu", status: "Chờ khách hàng", quantity: 0 },
    { projectId: "project-epu", status: "Không xử lý", quantity: 0 },
    { projectId: "project-epu", status: "Chờ xử lý", quantity: 0 },
    { projectId: "project-epu", status: "Đang xử lý", quantity: 0 },
    { projectId: "project-epu", status: "Đã xử lý", quantity: 0 },
    { projectId: "project-epu", status: "Đã Release", quantity: 0 },
    { projectId: "project-epu", status: "Đã bàn giao", quantity: 234, emphasized: true },
    { projectId: "project-epu", status: "Hoàn thành (%)", quantity: 75, emphasized: true },
    { projectId: "project-hcmue", status: "Chờ khách hàng", quantity: 1 },
    { projectId: "project-hcmue", status: "Đã Release", quantity: 7, emphasized: true },
    { projectId: "project-hcmue", status: "Đã bàn giao", quantity: 7, emphasized: true },
  ],
  acceptanceRecords: [
    {
      id: "accept-epu-1",
      projectId: "project-epu",
      department: "Phòng quản lý đào tạo",
      moduleName: "Quản lý chứng chỉ, chuẩn đầu ra, xét tốt nghiệp",
      step: "Khảo sát",
      status: "Hoàn tất",
      owner: "PM",
      evidence: "Biên bản khảo sát đã xác nhận",
    },
    {
      id: "accept-epu-2",
      projectId: "project-epu",
      department: "Phòng quản lý đào tạo",
      moduleName: "Quản lý chứng chỉ, chuẩn đầu ra, xét tốt nghiệp",
      step: "Đào tạo/Tập huấn",
      status: "Hoàn tất",
      owner: "PM",
      evidence: "Danh sách tập huấn đã chốt",
    },
    {
      id: "accept-epu-3",
      projectId: "project-epu",
      department: "Phòng quản lý đào tạo",
      moduleName: "Quản lý chứng chỉ, chuẩn đầu ra, xét tốt nghiệp",
      step: "Xác nhận hoàn thành",
      status: "Đang thực hiện",
      owner: "Khách hàng",
      evidence: "Chờ xác nhận nghiệm thu",
    },
    {
      id: "accept-hcmue-1",
      projectId: "project-hcmue",
      department: "Trung tâm CNTT",
      moduleName: "Cổng thông tin sinh viên",
      step: "Đào tạo/Tập huấn",
      status: "Hoàn tất",
      owner: "PM",
      evidence: "Hoàn tất đào tạo nhóm admin",
    },
  ],
  contracts: [
    {
      projectId: "project-epu",
      number: "272/2025/HĐ-ASC-PVCOMBANK-EPU",
      valuation: 13848000000,
      contractDate: "2025-07-23",
      status: "Running",
      beginDate: "2025-07-23",
      dueDate: "2026-04-30",
      masterPlanDays: 202,
      passedDays: 283,
      remainDays: -81,
    },
    {
      projectId: "project-hcmue",
      number: "ASC/HCMUE/2026",
      valuation: 0,
      contractDate: "2026-07-15",
      status: "Running",
      beginDate: "2026-07-15",
      dueDate: "2026-09-05",
      masterPlanDays: 38,
      passedDays: 25,
      remainDays: 13,
    },
  ],
  stages: [
    {
      id: "stage-epu-1",
      projectId: "project-epu",
      code: "Stage 1",
      name: "Khởi động dự án",
      startDate: "2026-04-28",
      endDate: "2026-05-11",
      networkDays: 2,
    },
    {
      id: "stage-epu-2",
      projectId: "project-epu",
      code: "Stage 2",
      name: "Khảo sát / tư vấn nghiệp vụ và Chốt tài liệu đặc tả nghiệp vụ",
      startDate: "2026-05-13",
      endDate: "2026-06-22",
      networkDays: 30,
    },
    {
      id: "stage-epu-3",
      projectId: "project-epu",
      code: "Stage 3",
      name: "Thực hiện hiệu chỉnh, cài đặt và tập huấn",
      startDate: "2026-06-27",
      endDate: "2026-07-13",
      networkDays: 15,
    },
    {
      id: "stage-epu-4",
      projectId: "project-epu",
      code: "Stage 4",
      name: "Hỗ trợ vận hành (Golive)",
      startDate: "2026-07-13",
      endDate: "2026-07-27",
      networkDays: 10,
    },
    {
      id: "stage-epu-5",
      projectId: "project-epu",
      code: "Stage 5",
      name: "Đánh giá và nghiệm thu hệ thống phần mềm",
      startDate: "2026-07-27",
      endDate: "2026-08-11",
      networkDays: 3,
    },
    {
      id: "stage-hcmue-1",
      projectId: "project-hcmue",
      code: "Stage 1",
      name: "Khởi động và rà soát phạm vi",
      startDate: "2026-07-15",
      endDate: "2026-07-20",
      networkDays: 4,
    },
    {
      id: "stage-hcmue-2",
      projectId: "project-hcmue",
      code: "Stage 2",
      name: "Hiệu chỉnh và UAT",
      startDate: "2026-07-21",
      endDate: "2026-08-25",
      networkDays: 26,
    },
  ],
  members: [
    { id: "member-epu-1", projectId: "project-epu", name: "Võ Đức Huy", position: "PM", issueTotal: 178, doneTotal: 165 },
    { id: "member-epu-2", projectId: "project-epu", name: "Nguyễn Đức Huy", position: "BA/Dev", issueTotal: 55, doneTotal: 35 },
    { id: "member-epu-3", projectId: "project-epu", name: "Nguyễn Phi Long", position: "Dev", issueTotal: 42, doneTotal: 7 },
    { id: "member-epu-4", projectId: "project-epu", name: "Lê Đăng Trường", position: "Support", issueTotal: 7, doneTotal: 7 },
    { id: "member-epu-5", projectId: "project-epu", name: "Nguyễn Phúc Vĩnh Nguyên", position: "Support", issueTotal: 9, doneTotal: 9 },
    { id: "member-hcmue-1", projectId: "project-hcmue", name: "Mai Anh", position: "PM", issueTotal: 9, doneTotal: 7 },
  ],
  portals: [
    {
      id: "portal-epu-1",
      projectId: "project-epu",
      name: "Trang giảng viên",
      link: "https://eoffice.epu.edu.vn/HeThong",
      username: "admin",
      passwordHint: "Đã che - lưu trong vault/env, không ghi vào source",
      environment: "Production",
    },
    {
      id: "portal-epu-2",
      projectId: "project-epu",
      name: "Trang sinh viên",
      link: "https://sv.epu.edu.vn",
      username: "",
      passwordHint: "Chưa cập nhật",
      environment: "Production",
    },
    {
      id: "portal-epu-3",
      projectId: "project-epu",
      name: "Đăng ký học phần",
      link: "https://dkhp.epu.edu.vn/",
      username: "",
      passwordHint: "Chưa cập nhật",
      environment: "Production",
    },
    {
      id: "portal-epu-4",
      projectId: "project-epu",
      name: "Giảng viên test",
      link: "https://gv-epu.ascvn.vn/",
      username: "",
      passwordHint: "Đã che",
      environment: "Test",
    },
    {
      id: "portal-epu-5",
      projectId: "project-epu",
      name: "Sinh viên test",
      link: "https://sv-epu.ascvn.vn/",
      username: "",
      passwordHint: "Đã che",
      environment: "Test",
    },
  ],
  servers: [
    {
      id: "server-epu-1",
      projectId: "project-epu",
      name: "Database",
      remote: "Đã che thông tin kết nối",
      username: "epusql_asc_***",
      passwordHint: "Đã che - không lưu mật khẩu trong source",
      environment: "Main",
    },
    {
      id: "server-epu-2",
      projectId: "project-epu",
      name: "WEB",
      remote: "Chưa cập nhật",
      username: "",
      passwordHint: "Chưa cập nhật",
      environment: "Main",
    },
  ],
  auditLogs: [
    {
      id: "log-1",
      at: "2026-08-22 09:00",
      actor: "June",
      action: "Khởi tạo",
      entity: "Version",
      detail: "Tạo dữ liệu seed cho ASC ProjectHub V0.5.2 Project Dashboard Screens.",
    },
  ],
};

const emptyProject = {
  code: "",
  name: "",
  customerName: "",
  pm: "Huy Vo",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};

const emptyMilestone = {
  name: "",
  phase: "Khảo sát",
  owner: "PM",
  plannedDate: "",
};

const emptyTask = {
  title: "",
  owner: "PM",
  dueDate: "",
  priority: "Medium" as Priority,
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function todayStamp() {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function readState(): ProjectHubState {
  if (typeof window === "undefined") return seedState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedState;
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectHubState>;
    return {
      ...seedState,
      ...parsed,
      customers: parsed.customers ?? seedState.customers,
      projects: parsed.projects ?? seedState.projects,
      milestones: parsed.milestones ?? seedState.milestones,
      tasks: parsed.tasks ?? seedState.tasks,
      modules: parsed.modules ?? seedState.modules,
      issues: parsed.issues ?? seedState.issues,
      issueSummaries: parsed.issueSummaries ?? seedState.issueSummaries,
      acceptanceRecords: parsed.acceptanceRecords ?? seedState.acceptanceRecords,
      contracts: parsed.contracts ?? seedState.contracts,
      stages: parsed.stages ?? seedState.stages,
      members: parsed.members ?? seedState.members,
      portals: parsed.portals ?? seedState.portals,
      servers: parsed.servers ?? seedState.servers,
      auditLogs: parsed.auditLogs ?? seedState.auditLogs,
    };
  } catch {
    return seedState;
  }
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<ProjectHubState>(seedState);
  const [selectedProjectId, setSelectedProjectId] = useState(seedState.projects[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState("Tổng quan");
  const [role, setRole] = useState<Role>("PM");
  const [query, setQuery] = useState("");
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestone);
  const [taskForm, setTaskForm] = useState(emptyTask);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = readState();
      setState(loaded);
      setSelectedProjectId(loaded.projects[0]?.id ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId) ?? state.projects[0];
  const selectedCustomer = state.customers.find((customer) => customer.id === selectedProject?.customerId);
  const projectMilestones = state.milestones.filter((milestone) => milestone.projectId === selectedProject?.id);
  const projectTasks = state.tasks.filter((task) => task.projectId === selectedProject?.id);
  const projectModules = state.modules.filter((module) => module.projectId === selectedProject?.id);
  const projectIssues = state.issues.filter((issue) => issue.projectId === selectedProject?.id);
  const projectIssueSummaries = state.issueSummaries.filter((issue) => issue.projectId === selectedProject?.id);
  const projectContract = state.contracts.find((contract) => contract.projectId === selectedProject?.id);
  const projectStages = state.stages.filter((stage) => stage.projectId === selectedProject?.id);
  const projectMembers = state.members.filter((member) => member.projectId === selectedProject?.id);
  const projectPortals = state.portals.filter((portal) => portal.projectId === selectedProject?.id);
  const projectServers = state.servers.filter((server) => server.projectId === selectedProject?.id);

  const filteredProjects = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return state.projects;
    return state.projects.filter((project) => {
      const customer = state.customers.find((item) => item.id === project.customerId);
      return [project.code, project.name, project.pm, customer?.name].join(" ").toLowerCase().includes(text);
    });
  }, [query, state.customers, state.projects]);

  const dashboard = useMemo(() => {
    const avgProgress = state.projects.length
      ? Math.round(state.projects.reduce((sum, project) => sum + project.progress, 0) / state.projects.length)
      : 0;
    return {
      totalProjects: state.projects.length,
      avgProgress,
      riskProjects: state.projects.filter((project) => project.status === "At Risk" || project.status === "Blocked").length,
      openTasks: state.tasks.filter((task) => task.status !== "Done").length,
      waitingTasks: state.tasks.filter((task) => task.status === "Waiting").length,
      dueMilestones: state.milestones.filter((milestone) => milestone.status === "Risk" || milestone.status === "Late").length,
    };
  }, [state]);

  function writeAudit(action: string, entity: string, detail: string) {
    setState((current) => ({
      ...current,
      auditLogs: [
        {
          id: createId("log"),
          at: todayStamp(),
          actor: role,
          action,
          entity,
          detail,
        },
        ...current.auditLogs,
      ].slice(0, 80),
    }));
  }

  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectForm.code.trim() || !projectForm.name.trim() || !projectForm.customerName.trim()) return;

    const customerId = createId("customer");
    const projectId = createId("project");
    const newCustomer: Customer = {
      id: customerId,
      name: projectForm.customerName.trim(),
      type: "Khách hàng triển khai",
      province: "Chưa cập nhật",
      contact: "Chưa cập nhật",
    };
    const newProject: Project = {
      id: projectId,
      code: projectForm.code.trim(),
      name: projectForm.name.trim(),
      customerId,
      pm: projectForm.pm.trim() || "PM",
      status: "Planning",
      progress: 0,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      healthNote: "Dự án mới tạo, cần hoàn thiện kế hoạch tổng thể và milestone.",
    };

    setState((current) => ({
      ...current,
      customers: [newCustomer, ...current.customers],
      projects: [newProject, ...current.projects],
      auditLogs: [
        {
          id: createId("log"),
          at: todayStamp(),
          actor: role,
          action: "Tạo mới",
          entity: "Project",
          detail: `Tạo dự án ${newProject.code} - ${newProject.name}.`,
        },
        ...current.auditLogs,
      ],
    }));
    setSelectedProjectId(projectId);
    setProjectForm(emptyProject);
  }

  function updateProject(patch: Partial<Project>) {
    if (!selectedProject) return;
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === selectedProject.id ? { ...project, ...patch } : project)),
    }));
    writeAudit("Cập nhật", "Project", `Cập nhật ${selectedProject.code}.`);
  }

  function createMilestone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !milestoneForm.name.trim()) return;
    const milestone: Milestone = {
      id: createId("ms"),
      projectId: selectedProject.id,
      name: milestoneForm.name.trim(),
      phase: milestoneForm.phase,
      owner: milestoneForm.owner.trim() || "PM",
      plannedDate: milestoneForm.plannedDate,
      actualDate: "",
      status: "On Track",
      progress: 0,
      evidence: "Chưa có bằng chứng.",
    };
    setState((current) => ({ ...current, milestones: [milestone, ...current.milestones] }));
    setMilestoneForm(emptyMilestone);
    writeAudit("Tạo mới", "Milestone", `Thêm milestone ${milestone.name} cho ${selectedProject.code}.`);
  }

  function updateMilestone(id: string, patch: Partial<Milestone>) {
    setState((current) => ({
      ...current,
      milestones: current.milestones.map((milestone) => (milestone.id === id ? { ...milestone, ...patch } : milestone)),
    }));
    writeAudit("Cập nhật", "Milestone", "Cập nhật milestone trong dự án.");
  }

  function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !taskForm.title.trim()) return;
    const task: Task = {
      id: createId("task"),
      projectId: selectedProject.id,
      milestoneId: projectMilestones[0]?.id ?? "",
      title: taskForm.title.trim(),
      owner: taskForm.owner.trim() || "PM",
      dueDate: taskForm.dueDate,
      status: "Todo",
      priority: taskForm.priority,
      blockedReason: "",
    };
    setState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setTaskForm(emptyTask);
    writeAudit("Tạo mới", "Task", `Thêm task ${task.title}.`);
  }

  function moveTask(id: string, status: TaskStatus) {
    const task = state.tasks.find((item) => item.id === id);
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
    writeAudit("Chuyển trạng thái", "Task", `${task?.title ?? "Task"} sang ${status}.`);
  }

  function resetDemoData() {
    setState(seedState);
    setSelectedProjectId(seedState.projects[0].id);
    setActiveTab("Tổng quan");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">ASC ProjectHub</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">V0.5.2 Project Dashboard Screens - theo dõi trọn trạng thái từng dự án</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Bản này tách ý tưởng ASC-Working thành màn hình nghiệp vụ: dashboard dự án, hợp đồng, kế hoạch thời gian, timeline, milestone, issue, module, member, portal và server có kiểm soát bảo mật.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill className="border-blue-200 bg-blue-50 text-blue-800">Đã xây: V0.5.2</Pill>
              <Pill className="border-slate-200 bg-white text-slate-700">Portable Next.js</Pill>
              <Pill className="border-amber-200 bg-amber-50 text-amber-800">Next: V0.8.0 Customer Collaboration</Pill>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[310px_1fr] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Phiên làm việc</h2>
              <button onClick={resetDemoData} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Reset demo
              </button>
            </div>
            <label htmlFor="role" className="mt-3 block text-xs font-medium text-slate-500">
              Vai trò hiện tại
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {["Admin", "PM", "Member", "Viewer"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Chế độ hiện tại: Local-first. Dữ liệu lưu trên trình duyệt để test MVP nhanh. Supabase schema đã chuẩn bị trong source.
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="text-sm font-semibold text-slate-800" htmlFor="project-search">
              Tìm dự án
            </label>
            <input
              id="project-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mã, tên trường, PM..."
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-4 space-y-2">
              {filteredProjects.map((project) => {
                const customer = state.customers.find((item) => item.id === project.customerId);
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${selectedProject?.id === project.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">{project.code}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{project.name}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone[project.status]}`}>{project.progress}%</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{customer?.name ?? "Chưa có khách hàng"}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Tạo dự án mới</h2>
            <form onSubmit={createProject} className="mt-3 space-y-3">
              <TextInput label="Mã dự án" value={projectForm.code} onChange={(value) => setProjectForm((current) => ({ ...current, code: value }))} placeholder="ASC-UNI-004" />
              <TextInput label="Tên dự án" value={projectForm.name} onChange={(value) => setProjectForm((current) => ({ ...current, name: value }))} placeholder="Triển khai OneUni..." />
              <TextInput label="Khách hàng" value={projectForm.customerName} onChange={(value) => setProjectForm((current) => ({ ...current, customerName: value }))} placeholder="Tên trường/đơn vị" />
              <TextInput label="PM" value={projectForm.pm} onChange={(value) => setProjectForm((current) => ({ ...current, pm: value }))} />
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="Bắt đầu" type="date" value={projectForm.startDate} onChange={(value) => setProjectForm((current) => ({ ...current, startDate: value }))} />
                <TextInput label="Kết thúc" type="date" value={projectForm.endDate} onChange={(value) => setProjectForm((current) => ({ ...current, endDate: value }))} />
              </div>
              <button className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Thêm dự án
              </button>
            </form>
          </section>
        </aside>

        <section className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Kpi label="Dự án" value={dashboard.totalProjects.toString()} note="Đang theo dõi" />
            <Kpi label="Tiến độ TB" value={`${dashboard.avgProgress}%`} note="Theo portfolio" />
            <Kpi label="Rủi ro" value={dashboard.riskProjects.toString()} note="At Risk/Blocked" />
            <Kpi label="Task mở" value={dashboard.openTasks.toString()} note="Chưa hoàn tất" />
            <Kpi label="Chờ KH" value={dashboard.waitingTasks.toString()} note="Cần follow-up" />
            <Kpi label="Milestone" value={dashboard.dueMilestones.toString()} note="Cần chú ý" />
          </section>

          {selectedProject ? (
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{selectedProject.code}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedProject.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedCustomer?.name ?? "Chưa có khách hàng"} | PM: {selectedProject.pm}
                    </p>
                  </div>
                  <Pill className={statusTone[selectedProject.status]}>{statusLabel[selectedProject.status]}</Pill>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_320px]">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Tiến độ tổng thể</span>
                      <span className="font-semibold text-slate-950">{selectedProject.progress}%</span>
                    </div>
                    <ProgressBar value={selectedProject.progress} />
                  </div>
                  <div className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-950">Health note: </span>
                    {selectedProject.healthNote}
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 px-4">
                <div className="flex gap-2 overflow-x-auto py-3">
                  {["Tổng quan", "Dashboard dự án", "Kế hoạch", "Milestone", "Task", "Audit log", "Supabase"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${activeTab === tab ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {activeTab === "Tổng quan" && (
                  <Overview project={selectedProject} customer={selectedCustomer} milestones={projectMilestones} tasks={projectTasks} onUpdateProject={updateProject} />
                )}
                {activeTab === "Dashboard dự án" && (
                  <ProjectDashboardView
                    project={selectedProject}
                    customer={selectedCustomer}
                    contract={projectContract}
                    stages={projectStages}
                    modules={projectModules}
                    issues={projectIssues}
                    issueSummaries={projectIssueSummaries}
                    members={projectMembers}
                    portals={projectPortals}
                    servers={projectServers}
                  />
                )}
                {activeTab === "Kế hoạch" && <PlanView milestones={projectMilestones} tasks={projectTasks} />}
                {activeTab === "Milestone" && (
                  <MilestoneView
                    milestones={projectMilestones}
                    form={milestoneForm}
                    setForm={setMilestoneForm}
                    onCreate={createMilestone}
                    onUpdate={updateMilestone}
                  />
                )}
                {activeTab === "Task" && (
                  <TaskView tasks={projectTasks} form={taskForm} setForm={setTaskForm} onCreate={createTask} onMove={moveTask} />
                )}
                {activeTab === "Audit log" && <AuditLogView logs={state.auditLogs} />}
                {activeTab === "Supabase" && <SupabaseReadiness />}
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
              Chưa có dự án. Hãy tạo dự án đầu tiên ở thanh bên trái.
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function daysBetween(from: string, to: string) {
  if (!from || !to) return 0;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - start) / 86400000));
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatCurrency(value: number) {
  if (!value) return "Chưa cập nhật";
  return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function formatDate(value: string) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function ProjectDashboardView({
  project,
  customer,
  contract,
  stages,
  modules,
  issues,
  issueSummaries,
  members,
  portals,
  servers,
}: {
  project: Project;
  customer?: Customer;
  contract?: ContractInfo;
  stages: ProjectStage[];
  modules: ProjectModule[];
  issues: ProjectIssue[];
  issueSummaries: ProjectIssueSummary[];
  members: ProjectMember[];
  portals: ProjectPortal[];
  servers: ProjectServer[];
}) {
  const moduleIssueTotal = modules.reduce((sum, item) => sum + item.totalIssues, 0);
  const totalIssues = project.id === "project-epu" ? 313 : Math.max(issues.length, moduleIssueTotal);
  const deliveredIssues = issueSummaries.find((item) => item.status === "Đã bàn giao")?.quantity ?? issues.filter((issue) => issue.customerStatus === "Đã bàn giao").length;
  const issueCompletion = percent(deliveredIssues, totalIssues || issues.length);
  const totalModuleItems = moduleIssueTotal;
  const doneModuleItems = modules.reduce((sum, item) => sum + item.deliveredIssues, 0);
  const masterPlanDays = contract?.masterPlanDays ?? daysBetween(project.startDate, project.endDate);
  const passedDays = contract?.passedDays ?? daysBetween(project.startDate, new Date().toISOString().slice(0, 10));
  const remainDays = contract?.remainDays ?? masterPlanDays - passedDays;
  const progress = masterPlanDays ? Math.round((passedDays / masterPlanDays) * 1000) / 10 : project.progress;
  const stageMax = Math.max(1, stages.reduce((sum, stage) => sum + stage.networkDays, 0));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-amber-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Dashboard từng dự án</p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">{customer?.name ?? project.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{project.code} | PM: {project.pm} | {statusLabel[project.status]}</p>
            </div>
            <Pill className="border-amber-200 bg-white text-amber-800">Nguồn: dashboard nghiệp vụ theo dự án</Pill>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-slate-200">
            <SectionTitle index="1" title="Về hợp đồng" />
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Info label="Number" value={contract?.number ?? "Chưa cập nhật"} />
              <Info label="Valuation" value={formatCurrency(contract?.valuation ?? 0)} />
              <Info label="Contract date" value={formatDate(contract?.contractDate ?? "")} />
              <Info label="Status" value={contract?.status ?? statusLabel[project.status]} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <SectionTitle index="2" title="Kế hoạch thời gian tổng thể" />
            <div className="grid gap-3 p-4 sm:grid-cols-4">
              <Info label="Begin date" value={formatDate(contract?.beginDate ?? project.startDate)} />
              <Info label="Due date" value={formatDate(contract?.dueDate ?? project.endDate)} />
              <Info label="Master Plan" value={`${masterPlanDays} ngày`} />
              <Info label="Progress" value={`${progress}%`} />
              <Info label="Passed" value={`${passedDays} ngày`} />
              <Info label="Remain" value={`${remainDays} ngày`} />
              <Info label="Issue" value={`${deliveredIssues}/${totalIssues}`} />
              <Info label="Module" value={`${doneModuleItems}/${totalModuleItems}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <SectionTitle index="3" title="Chi tiết từng giai đoạn" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {["Stage", "Stage name", "Start date", "End date", "Networkdays"].map((head) => (
                    <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.map((stage) => (
                  <tr key={stage.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-950">{stage.code}</td>
                    <td className="min-w-64 px-3 py-3 text-slate-700">{stage.name}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(stage.startDate)}</td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(stage.endDate)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-950">{stage.networkDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <SectionTitle index="4" title="Timeline (day)" />
          <div className="p-4">
            <div className="rounded-md border border-blue-300 bg-white p-4">
              <p className="text-lg font-semibold italic text-slate-500">Timeline (day)</p>
              <TimelineBar label="Passed" value={Math.max(0, passedDays)} max={Math.max(stageMax, passedDays)} color="bg-emerald-400" note={`${passedDays}`} />
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-slate-600">Stage</p>
                <div className="flex h-12 overflow-hidden rounded-md border border-slate-200">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className={`${["bg-blue-800", "bg-blue-600", "bg-sky-500", "bg-sky-600", "bg-blue-700"][index % 5]} flex items-center justify-center text-xs font-semibold text-white`}
                      style={{ width: `${Math.max(8, (stage.networkDays / stageMax) * 100)}%` }}
                    >
                      {stage.networkDays}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>0</span>
                  <span>Net Working Day</span>
                  <span>{stageMax}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <SectionTitle index="5" title="Milestone" />
        <div className="overflow-x-auto p-4">
          <div className="relative min-w-[850px] rounded-md border border-blue-300 bg-white px-6 py-12">
            <div className="absolute left-0 right-0 top-28 h-8 bg-violet-50" />
            <div className="relative h-72">
              <div className="absolute left-6 right-6 top-24 h-2 rounded bg-slate-500" />
              {stages.map((stage, index) => {
                const left = `${8 + index * (84 / Math.max(1, stages.length - 1))}%`;
                const top = index % 2 === 0 ? "top-4" : "top-44";
                return (
                  <div key={stage.id} className={`absolute ${top} w-44 -translate-x-1/2 text-center`} style={{ left }}>
                    <p className="text-sm font-semibold text-slate-950">{formatDate(stage.endDate)}</p>
                    <div className="mx-auto mt-2 h-4 w-4 rotate-45 bg-slate-900" />
                    <div className="mx-auto h-24 border-l border-dashed border-slate-500" />
                    <div className="mx-auto h-4 w-4 rotate-45 bg-blue-300" />
                    <div className="mx-auto h-4 rounded bg-blue-600" style={{ width: `${Math.max(36, stage.networkDays * 4)}px` }} />
                    <p className="mt-3 text-xs font-semibold text-slate-700">
                      {index + 1}. {stage.name} ({stage.networkDays} ngày)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <SectionTitle index="6" title="Số lượng issue theo trạng thái" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {["N.o", "Status", "Quantity"].map((head) => (
                    <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issueSummaries.map((item, index) => (
                  <tr key={`${item.status}-${index}`} className={item.emphasized ? "border-b border-slate-100 bg-slate-50 font-semibold" : "border-b border-slate-100"}>
                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3">{item.status}</td>
                    <td className="px-3 py-3">{item.status.includes("%") ? `${issueCompletion}%` : item.quantity}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-semibold">
                  <td className="px-3 py-3">Total</td>
                  <td className="px-3 py-3">{totalIssues}</td>
                  <td className="px-3 py-3">{deliveredIssues}/{totalIssues}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <SectionTitle index="7" title="Danh sách các module" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {["N.o", "Subsystem Name", "Module", "Done", "Remain"].map((head) => (
                    <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-950">{toRoman(index + 1)}</td>
                    <td className="min-w-80 px-3 py-3 text-slate-700">{item.moduleName}</td>
                    <td className="px-3 py-3 text-slate-600">{item.totalIssues}</td>
                    <td className="px-3 py-3 text-slate-600">{item.deliveredIssues}</td>
                    <td className="px-3 py-3 font-semibold text-slate-950">{Math.max(0, item.totalIssues - item.deliveredIssues)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardTable
          index="8"
          title="Member tham gia dự án"
          heads={["N.o", "Member", "Position", "Issue", "Done", "(%)"]}
          rows={members.map((member, index) => [
            `${index + 1}`,
            member.name,
            member.position || "Chưa cập nhật",
            `${member.issueTotal} / ${totalIssues}`,
            `${member.doneTotal} / ${member.issueTotal}`,
            `${percent(member.doneTotal, member.issueTotal)}%`,
          ])}
        />
        <DashboardTable
          index="9"
          title="Các cổng thông tin"
          heads={["N.o", "Portal", "Link", "Username", "Password", "Env"]}
          rows={portals.map((portal, index) => [
            `${index + 1}`,
            portal.name,
            portal.link,
            portal.username || "-",
            portal.passwordHint,
            portal.environment,
          ])}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardTable
          index="10"
          title="Thông tin server main và test"
          heads={["N.o", "Server", "Remote", "Username", "Password", "Env"]}
          rows={servers.map((server, index) => [
            `${index + 1}`,
            server.name,
            server.remote,
            server.username || "-",
            server.passwordHint,
            server.environment,
          ])}
        />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <h3 className="font-semibold text-amber-950">Ghi chú bảo mật</h3>
          <p className="mt-2">
            Portal/server được thiết kế thành màn hình quản lý riêng, nhưng mật khẩu thật không nên lưu trong source hoặc localStorage. Khi lên bản có database, phần này nên dùng vault, mã hóa hoặc chỉ lưu người phụ trách và link truy cập.
          </p>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      <h3 className="text-base font-semibold text-slate-950">
        {index}. {title}
      </h3>
    </div>
  );
}

function TimelineBar({ label, value, max, color, note }: { label: string; value: number; max: number; color: string; note: string }) {
  return (
    <div className="mt-4 grid grid-cols-[70px_1fr] items-center gap-3">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="h-11 rounded bg-slate-100">
        <div className={`flex h-full items-center justify-end rounded pr-3 text-sm font-semibold text-slate-900 ${color}`} style={{ width: `${Math.min(100, Math.max(4, (value / max) * 100))}%` }}>
          {note}
        </div>
      </div>
    </div>
  );
}

function DashboardTable({ index, title, heads, rows }: { index: string; title: string; heads: string[]; rows: string[][] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <SectionTitle index={index} title={title} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {heads.map((head) => (
                <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="border-b border-slate-100 align-top">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${rowIndex}-${cellIndex}`} className={`px-3 py-3 ${cellIndex === 1 ? "min-w-48 font-medium text-slate-950" : "text-slate-600"}`}>
                    {cell.startsWith("http") ? (
                      <a href={cell} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">
                        {cell}
                      </a>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toRoman(value: number) {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
  return romans[value - 1] ?? value.toString();
}

function Overview({
  project,
  customer,
  milestones,
  tasks,
  onUpdateProject,
}: {
  project: Project;
  customer?: Customer;
  milestones: Milestone[];
  tasks: Task[];
  onUpdateProject: (patch: Partial<Project>) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Thông tin điều hành</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Khách hàng" value={customer?.name ?? "Chưa cập nhật"} />
          <Info label="Đầu mối" value={customer?.contact ?? "Chưa cập nhật"} />
          <Info label="Ngày bắt đầu" value={project.startDate || "Chưa cập nhật"} />
          <Info label="Ngày kết thúc" value={project.endDate || "Chưa cập nhật"} />
          <Info label="Milestone" value={milestones.length.toString()} />
          <Info label="Task" value={tasks.length.toString()} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Cập nhật nhanh</h3>
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Trạng thái
            <select
              value={project.status}
              onChange={(event) => onUpdateProject({ status: event.target.value as ProjectStatus })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {Object.keys(statusLabel).map((status) => (
                <option key={status} value={status}>{statusLabel[status as ProjectStatus]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Tiến độ: {project.progress}%
            <input
              type="range"
              min="0"
              max="100"
              value={project.progress}
              onChange={(event) => onUpdateProject({ progress: Number(event.target.value) })}
              className="mt-2 w-full accent-blue-600"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Health note
            <textarea
              value={project.healthNote}
              onChange={(event) => onUpdateProject({ healthNote: event.target.value })}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function PlanView({ milestones, tasks }: { milestones: Milestone[]; tasks: Task[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Timeline theo milestone</h3>
        <div className="mt-4 space-y-3">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
              <p className="text-sm font-medium text-slate-700">{milestone.phase}</p>
              <div className="h-11 rounded-md bg-slate-100 p-1">
                <div
                  className={`flex h-full items-center rounded px-3 text-xs font-semibold ${milestone.status === "Done" ? "bg-emerald-600 text-white" : milestone.status === "Risk" ? "bg-amber-500 text-white" : milestone.status === "Late" ? "bg-rose-500 text-white" : "bg-blue-600 text-white"}`}
                  style={{ marginLeft: `${Math.min(index * 8, 32)}%`, width: `${Math.max(26, milestone.progress / 1.4)}%` }}
                >
                  {milestone.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Liên kết task</h3>
        <p className="mt-2 text-sm text-slate-600">
          {tasks.length} task đang gắn với dự án. V0.5.0 ưu tiên quản lý task cơ bản; V0.8.0 sẽ mở rộng khảo sát, tập huấn và UAT khách hàng.
        </p>
      </div>
    </div>
  );
}

function MilestoneView({
  milestones,
  form,
  setForm,
  onCreate,
  onUpdate,
}: {
  milestones: Milestone[];
  form: typeof emptyMilestone;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyMilestone>>;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: (id: string, patch: Partial<Milestone>) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <form onSubmit={onCreate} className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Thêm milestone</h3>
        <div className="mt-3 space-y-3">
          <TextInput label="Tên milestone" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="UAT tuyển sinh" />
          <TextInput label="Phase" value={form.phase} onChange={(value) => setForm((current) => ({ ...current, phase: value }))} placeholder="Khảo sát/UAT/Go-live" />
          <TextInput label="Owner" value={form.owner} onChange={(value) => setForm((current) => ({ ...current, owner: value }))} />
          <TextInput label="Ngày dự kiến" type="date" value={form.plannedDate} onChange={(value) => setForm((current) => ({ ...current, plannedDate: value }))} />
          <button className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Thêm milestone</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {["Milestone", "Phase", "Owner", "Planned", "Progress", "Status", "Evidence"].map((head) => (
                <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => (
              <tr key={milestone.id} className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium text-slate-950">{milestone.name}</td>
                <td className="px-3 py-3 text-slate-600">{milestone.phase}</td>
                <td className="px-3 py-3 text-slate-600">{milestone.owner}</td>
                <td className="px-3 py-3 text-slate-600">{milestone.plannedDate || "Chưa cập nhật"}</td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={milestone.progress}
                    onChange={(event) => onUpdate(milestone.id, { progress: Number(event.target.value) })}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    value={milestone.status}
                    onChange={(event) => onUpdate(milestone.id, { status: event.target.value as Milestone["status"] })}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${milestoneTone[milestone.status]}`}
                  >
                    {["On Track", "Risk", "Late", "Done"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
                <td className="px-3 py-3 text-slate-600">{milestone.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskView({
  tasks,
  form,
  setForm,
  onCreate,
  onMove,
}: {
  tasks: Task[];
  form: typeof emptyTask;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyTask>>;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onMove: (id: string, status: TaskStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Thêm task</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_160px_140px] md:items-end">
          <TextInput label="Tên task" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="Kiểm tra dữ liệu..." />
          <TextInput label="Owner" value={form.owner} onChange={(value) => setForm((current) => ({ ...current, owner: value }))} />
          <TextInput label="Due date" type="date" value={form.dueDate} onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))} />
          <label className="block text-xs font-medium text-slate-600">
            Ưu tiên
            <select
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {["High", "Medium", "Low"].map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
        </div>
        <button className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Thêm task</button>
      </form>

      <div className="grid gap-3 xl:grid-cols-4">
        {taskColumns.map((column) => (
          <div key={column.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">{column.label}</h3>
            <div className="mt-3 space-y-2">
              {tasks.filter((task) => task.status === column.key).map((task) => (
                <article key={task.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill className="border-slate-200 bg-white text-slate-700">{task.owner}</Pill>
                    <Pill className={task.priority === "High" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700"}>{task.priority}</Pill>
                    <Pill className="border-slate-200 bg-white text-slate-700">{task.dueDate || "No due"}</Pill>
                  </div>
                  <select
                    value={task.status}
                    onChange={(event) => onMove(task.id, event.target.value as TaskStatus)}
                    className="mt-3 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold"
                  >
                    {taskColumns.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogView({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold">Audit log</h3>
        <p className="mt-1 text-sm text-slate-600">Ghi nhận thao tác tạo/cập nhật chính trong MVP. V0.5.0 lưu local; khi bật Supabase sẽ chuyển sang bảng activity_logs.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {logs.map((log) => (
          <div key={log.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[150px_110px_120px_1fr]">
            <span className="text-slate-500">{log.at}</span>
            <span className="font-semibold text-slate-900">{log.actor}</span>
            <span className="text-slate-700">{log.action}</span>
            <span className="text-slate-600">{log.entity}: {log.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupabaseReadiness() {
  const rows = [
    ["Auth", "Chuẩn bị role Admin/PM/Member/Viewer", "Cần NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    ["Database", "Có schema SQL trong source", "Chạy file supabase/schema.sql trên Supabase SQL Editor"],
    ["Storage", "Thiết kế bảng attachments", "V0.5.0 chưa upload file thật"],
    ["RLS", "Định hướng theo organization/project membership", "Bật trong V0.5.x khi có tài khoản thật"],
    ["Audit", "Có audit log local trong UI", "Chuyển sang activity_logs khi bật Supabase"],
  ];
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold">Supabase readiness</h3>
        <p className="mt-1 text-sm text-slate-600">V0.5.0 bám kế hoạch Core MVP: cấu trúc dữ liệu đã sẵn sàng, nhưng chưa gắn khóa Supabase thật để tránh lộ cấu hình.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {["Mảng", "Đã chuẩn bị", "Việc cần làm khi cấu hình thật"].map((head) => (
                <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([area, ready, next]) => (
              <tr key={area} className="border-b border-slate-100">
                <td className="px-3 py-3 font-semibold text-slate-950">{area}</td>
                <td className="px-3 py-3 text-slate-700">{ready}</td>
                <td className="px-3 py-3 text-slate-600">{next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
