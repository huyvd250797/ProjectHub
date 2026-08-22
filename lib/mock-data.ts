export const dashboardStats = [
  { label: "Tổng ISSUE", value: "313", delta: "Dữ liệu nguồn", tone: "cyan" },
  { label: "Module", value: "90", delta: "Trong PLHĐ", tone: "violet" },
  { label: "Phòng ban", value: "09", delta: "Đơn vị theo dõi", tone: "emerald" },
  { label: "Stage", value: "05", delta: "Master Plan", tone: "amber" },
];

export const stages = [
  { name: "Khởi động", progress: 100, status: "Hoàn tất" },
  { name: "Khảo sát", progress: 92, status: "Ổn định" },
  { name: "Cấu hình", progress: 74, status: "Đang chạy" },
  { name: "UAT / Training", progress: 58, status: "Đang chạy" },
  { name: "Nghiệm thu", progress: 22, status: "Chuẩn bị" },
];

export const issueSamples = [
  {
    code: "EPU-001",
    content: "Rà soát yêu cầu nghiệp vụ và mapping module triển khai",
    status: "Đang xử lý",
    priority: "A",
    department: "Đang cập nhật",
    assignee: "ASC Team",
    due: "—",
  },
  {
    code: "EPU-002",
    content: "Hoàn thiện phản hồi và kế hoạch release cho nhóm yêu cầu tồn",
    status: "Chờ xử lý",
    priority: "B",
    department: "Đang cập nhật",
    assignee: "ASC Team",
    due: "—",
  },
  {
    code: "EPU-003",
    content: "Kiểm tra trạng thái bàn giao theo phạm vi phụ lục hợp đồng",
    status: "Đã xử lý",
    priority: "B",
    department: "Đang cập nhật",
    assignee: "ASC Team",
    due: "—",
  },
];

export const contractRows = [
  { code: "I", name: "Phân hệ mẫu", type: "Phân hệ", issues: 42, handed: 30, status: "Đang triển khai" },
  { code: "1.1", name: "Module mẫu 01", type: "Module", issues: 18, handed: 13, status: "Sẵn sàng tập huấn" },
  { code: "1.2", name: "Module mẫu 02", type: "Module", issues: 24, handed: 17, status: "Đã khảo sát" },
];

export const resourceGroups = [
  { label: "Portal Production", count: 7, icon: "WWW", description: "Cổng nghiệp vụ và ứng dụng vận hành" },
  { label: "Server / Database", count: 5, icon: "SRV", description: "Host, remote và kết nối dữ liệu" },
  { label: "Project Links", count: 6, icon: "PRJ", description: "Tài liệu, folder và liên kết dự án" },
  { label: "Test Environment", count: 4, icon: "TST", description: "Portal test / dev và tài nguyên kiểm thử" },
];
