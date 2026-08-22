"use client";

import { useMemo, useState } from "react";

type ProjectStatus = "Đúng tiến độ" | "Có rủi ro" | "Trễ hạn";
type TaskStatus = "Chưa làm" | "Đang làm" | "Chờ khách hàng" | "Hoàn tất";

type Milestone = {
  name: string;
  phase: string;
  owner: string;
  planned: string;
  actual: string;
  status: ProjectStatus;
  progress: number;
};

type Task = {
  title: string;
  owner: string;
  due: string;
  status: TaskStatus;
  priority: "Cao" | "Vừa" | "Thấp";
};

type Project = {
  id: string;
  code: string;
  name: string;
  customer: string;
  pm: string;
  status: ProjectStatus;
  progress: number;
  start: string;
  end: string;
  nextMilestone: string;
  healthNote: string;
  milestones: Milestone[];
  tasks: Task[];
  tickets: {
    code: string;
    title: string;
    severity: "P1" | "P2" | "P3";
    sla: string;
    status: "Mở" | "Đang xử lý" | "Chờ xác nhận";
  }[];
};

const projects: Project[] = [
  {
    id: "epu",
    code: "ASC-UNI-001",
    name: "Triển khai OneUni EPU",
    customer: "Trường Đại học Điện lực",
    pm: "Huy Vo",
    status: "Có rủi ro",
    progress: 64,
    start: "05/08",
    end: "30/09",
    nextMilestone: "Hoàn tất UAT phân hệ tuyển sinh",
    healthNote: "Dữ liệu tuyển sinh cần đối soát thêm trước khi chốt UAT.",
    milestones: [
      { name: "Khảo sát hiện trạng", phase: "Khảo sát", owner: "PM", planned: "08/08", actual: "08/08", status: "Đúng tiến độ", progress: 100 },
      { name: "Cấu hình danh mục", phase: "Cấu hình", owner: "Triển khai", planned: "18/08", actual: "19/08", status: "Có rủi ro", progress: 85 },
      { name: "UAT tuyển sinh", phase: "UAT", owner: "Khách hàng", planned: "26/08", actual: "Chưa chốt", status: "Có rủi ro", progress: 45 },
      { name: "Go-live đợt 1", phase: "Go-live", owner: "PM", planned: "10/09", actual: "Chưa đến", status: "Đúng tiến độ", progress: 10 },
    ],
    tasks: [
      { title: "Đối soát dữ liệu thí sinh trúng tuyển", owner: "Data team", due: "22/08", status: "Đang làm", priority: "Cao" },
      { title: "Gửi form xác nhận lịch UAT", owner: "PM", due: "23/08", status: "Chờ khách hàng", priority: "Cao" },
      { title: "Bổ sung tài liệu hướng dẫn nhập học", owner: "Triển khai", due: "25/08", status: "Chưa làm", priority: "Vừa" },
      { title: "Chốt checklist nghiệm thu giai đoạn 1", owner: "PM", due: "29/08", status: "Chưa làm", priority: "Vừa" },
      { title: "Tổng hợp feedback tập huấn", owner: "CS", due: "20/08", status: "Hoàn tất", priority: "Thấp" },
    ],
    tickets: [
      { code: "SUP-104", title: "QR giấy báo trúng tuyển bị co ảnh trong mẫu Word", severity: "P2", sla: "24h", status: "Đang xử lý" },
      { code: "SUP-109", title: "Danh mục huyện/xã thiếu mapping khi import", severity: "P1", sla: "8h", status: "Mở" },
      { code: "SUP-112", title: "Khách hàng xác nhận lại quyền tài khoản UAT", severity: "P3", sla: "72h", status: "Chờ xác nhận" },
    ],
  },
  {
    id: "hcmue",
    code: "ASC-UNI-002",
    name: "Nâng cấp cổng sinh viên OneUni",
    customer: "Trường Đại học Sư phạm TP.HCM",
    pm: "Mai Anh",
    status: "Đúng tiến độ",
    progress: 78,
    start: "15/07",
    end: "05/09",
    nextMilestone: "Tập huấn cán bộ phòng đào tạo",
    healthNote: "Khách hàng phản hồi nhanh, phạm vi đang ổn định.",
    milestones: [
      { name: "Khảo sát nghiệp vụ", phase: "Khảo sát", owner: "PM", planned: "20/07", actual: "19/07", status: "Đúng tiến độ", progress: 100 },
      { name: "Demo flow tự đăng ký hoạt động", phase: "Demo", owner: "UX", planned: "04/08", actual: "04/08", status: "Đúng tiến độ", progress: 100 },
      { name: "Tập huấn phòng đào tạo", phase: "Tập huấn", owner: "PM", planned: "26/08", actual: "Chưa đến", status: "Đúng tiến độ", progress: 30 },
      { name: "Nghiệm thu UI", phase: "Nghiệm thu", owner: "Khách hàng", planned: "04/09", actual: "Chưa đến", status: "Đúng tiến độ", progress: 0 },
    ],
    tasks: [
      { title: "Rà lại flow đăng ký hoạt động trên app OneUni", owner: "UX", due: "22/08", status: "Đang làm", priority: "Cao" },
      { title: "Chuẩn bị slide tập huấn", owner: "PM", due: "24/08", status: "Chưa làm", priority: "Vừa" },
      { title: "Gửi link khảo sát sau demo", owner: "CS", due: "25/08", status: "Chưa làm", priority: "Thấp" },
      { title: "Chốt danh sách học viên tập huấn", owner: "Khách hàng", due: "23/08", status: "Chờ khách hàng", priority: "Vừa" },
    ],
    tickets: [
      { code: "SUP-087", title: "Cần bổ sung icon trạng thái đăng ký", severity: "P3", sla: "72h", status: "Mở" },
      { code: "SUP-091", title: "Chưa đồng bộ màu phân hệ giữa web và app", severity: "P2", sla: "24h", status: "Đang xử lý" },
    ],
  },
  {
    id: "demo",
    code: "ASC-UNI-003",
    name: "Pilot ProjectHub nội bộ",
    customer: "ASC Delivery Team",
    pm: "June",
    status: "Trễ hạn",
    progress: 42,
    start: "01/08",
    end: "31/08",
    nextMilestone: "Hoàn tất prototype V0.1.0",
    healthNote: "Cần chốt phạm vi MVP để không kéo quá nhiều module vào bản đầu.",
    milestones: [
      { name: "Kế hoạch sản phẩm", phase: "Planning", owner: "PM", planned: "21/08", actual: "21/08", status: "Đúng tiến độ", progress: 100 },
      { name: "Prototype dashboard", phase: "Prototype", owner: "Dev", planned: "22/08", actual: "Đang làm", status: "Có rủi ro", progress: 65 },
      { name: "Review với PM", phase: "Review", owner: "PM", planned: "24/08", actual: "Chưa đến", status: "Đúng tiến độ", progress: 0 },
      { name: "Chốt V0.5.0 backlog", phase: "Planning", owner: "PM", planned: "28/08", actual: "Chưa đến", status: "Trễ hạn", progress: 0 },
    ],
    tasks: [
      { title: "Tạo dashboard portfolio", owner: "Dev", due: "22/08", status: "Đang làm", priority: "Cao" },
      { title: "Tạo timeline milestone demo", owner: "Dev", due: "22/08", status: "Đang làm", priority: "Cao" },
      { title: "Ghi version history V0.1.0", owner: "PM", due: "22/08", status: "Chưa làm", priority: "Cao" },
      { title: "Chuẩn bị scope V0.5.0", owner: "PM", due: "24/08", status: "Chưa làm", priority: "Vừa" },
    ],
    tickets: [
      { code: "SUP-001", title: "Cần xác định module nào vào MVP thật", severity: "P2", sla: "48h", status: "Mở" },
      { code: "SUP-002", title: "Chưa có kết nối Supabase production", severity: "P3", sla: "Không áp dụng", status: "Chờ xác nhận" },
    ],
  },
];

const statusTone: Record<ProjectStatus, string> = {
  "Đúng tiến độ": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Có rủi ro": "border-amber-200 bg-amber-50 text-amber-800",
  "Trễ hạn": "border-rose-200 bg-rose-50 text-rose-800",
};

const taskColumns: TaskStatus[] = ["Chưa làm", "Đang làm", "Chờ khách hàng", "Hoàn tất"];

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "blue" | "risk" }) {
  const classes = {
    neutral: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    risk: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${classes[tone]}`}>{children}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(projects[0].id);
  const [activeTab, setActiveTab] = useState("Tổng quan");
  const [query, setQuery] = useState("");

  const filteredProjects = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return projects;
    return projects.filter((project) =>
      [project.code, project.name, project.customer, project.pm].join(" ").toLowerCase().includes(text),
    );
  }, [query]);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? projects[0];
  const totalTasks = projects.reduce((sum, project) => sum + project.tasks.length, 0);
  const overdueMilestones = projects.flatMap((project) => project.milestones).filter((item) => item.status !== "Đúng tiến độ").length;
  const openTickets = projects.reduce((sum, project) => sum + project.tickets.filter((ticket) => ticket.status !== "Chờ xác nhận").length, 0);
  const avgProgress = Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">ASC ProjectHub</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Điều phối triển khai dự án phần mềm giáo dục</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="blue">V0.1.0 Prototype</Pill>
              <Pill>Demo data</Pill>
              <Pill tone="risk">Next: V0.5.0 Core MVP</Pill>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {["Dashboard", "Projects", "Timeline", "Tasks", "Customer Work", "Acceptance"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700 hover:bg-white">
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section id="projects" className="rounded-lg border border-slate-200 bg-white p-4">
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
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  className={`w-full rounded-md border p-3 text-left transition ${selectedProject.id === project.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{project.code}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{project.name}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone[project.status]}`}>{project.progress}%</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{project.customer}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Version history</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="font-semibold text-blue-900">Đã xây dựng: V0.1.0</p>
                <p className="mt-1 text-blue-800">Prototype giao diện, demo data, dashboard, project detail, timeline, task và ticket.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">Tiếp theo: V0.5.0</p>
                <p className="mt-1 text-slate-700">Auth, Supabase, CRUD project, phase, milestone, task, attachment và audit log.</p>
              </div>
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <section id="dashboard" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Dự án đang theo dõi", projects.length.toString(), "1 có rủi ro, 1 trễ hạn"],
              ["Tiến độ trung bình", `${avgProgress}%`, "Tính theo dự án demo"],
              ["Milestone cần chú ý", overdueMilestones.toString(), "Có rủi ro hoặc trễ hạn"],
              ["Ticket đang mở", openTickets.toString(), `${totalTasks} task trong backlog`],
            ].map(([label, value, note]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
                <p className="mt-2 text-sm text-slate-500">{note}</p>
              </article>
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{selectedProject.code}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedProject.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{selectedProject.customer} | PM: {selectedProject.pm}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusTone[selectedProject.status]}`}>{selectedProject.status}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px]">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">Tiến độ tổng thể</span>
                    <span className="font-semibold text-slate-950">{selectedProject.progress}%</span>
                  </div>
                  <ProgressBar value={selectedProject.progress} />
                </div>
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Mốc tiếp theo: </span>
                  {selectedProject.nextMilestone}
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200 px-4">
              <div className="flex gap-2 overflow-x-auto py-3">
                {["Tổng quan", "Milestone", "Timeline", "Task", "Khách hàng", "Nghiệm thu"].map((tab) => (
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
              {activeTab === "Tổng quan" && <Overview project={selectedProject} />}
              {activeTab === "Milestone" && <Milestones project={selectedProject} />}
              {activeTab === "Timeline" && <Timeline project={selectedProject} />}
              {activeTab === "Task" && <Tasks project={selectedProject} />}
              {activeTab === "Khách hàng" && <CustomerWork project={selectedProject} />}
              {activeTab === "Nghiệm thu" && <Acceptance project={selectedProject} />}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Overview({ project }: { project: Project }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Tình trạng dự án</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">{project.healthNote}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Info label="Bắt đầu" value={project.start} />
          <Info label="Kết thúc dự kiến" value={project.end} />
          <Info label="Milestone" value={project.milestones.length.toString()} />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Việc cần PM xử lý</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="rounded-md bg-amber-50 p-3 text-amber-900">Chốt xác nhận khách hàng cho milestone gần nhất.</li>
          <li className="rounded-md bg-slate-50 p-3">Rà lại các task đang chờ khách hàng phản hồi.</li>
          <li className="rounded-md bg-slate-50 p-3">Chuẩn bị báo cáo tuần từ dữ liệu milestone và ticket.</li>
        </ul>
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

function Milestones({ project }: { project: Project }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {["Milestone", "Phase", "Owner", "Planned", "Actual", "Tiến độ", "Trạng thái"].map((head) => (
              <th key={head} className="border-b border-slate-200 px-3 py-3 font-semibold">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {project.milestones.map((milestone) => (
            <tr key={milestone.name} className="border-b border-slate-100">
              <td className="px-3 py-3 font-medium text-slate-950">{milestone.name}</td>
              <td className="px-3 py-3 text-slate-600">{milestone.phase}</td>
              <td className="px-3 py-3 text-slate-600">{milestone.owner}</td>
              <td className="px-3 py-3 text-slate-600">{milestone.planned}</td>
              <td className="px-3 py-3 text-slate-600">{milestone.actual}</td>
              <td className="px-3 py-3">
                <div className="w-28"><ProgressBar value={milestone.progress} /></div>
              </td>
              <td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusTone[milestone.status]}`}>{milestone.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Timeline({ project }: { project: Project }) {
  return (
    <div id="timeline" className="space-y-4">
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-slate-500">
        {["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"].map((week) => <div key={week}>{week}</div>)}
      </div>
      <div className="space-y-3">
        {project.milestones.map((milestone, index) => (
          <div key={milestone.name} className="grid grid-cols-[150px_1fr] items-center gap-3">
            <p className="text-sm font-medium text-slate-700">{milestone.phase}</p>
            <div className="h-10 rounded-md bg-slate-100 p-1">
              <div
                className={`flex h-full items-center rounded px-3 text-xs font-semibold ${milestone.status === "Đúng tiến độ" ? "bg-blue-600 text-white" : milestone.status === "Có rủi ro" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"}`}
                style={{ marginLeft: `${index * 10}%`, width: `${Math.max(28, milestone.progress / 1.4)}%` }}
              >
                {milestone.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tasks({ project }: { project: Project }) {
  return (
    <div id="tasks" className="grid gap-3 xl:grid-cols-4">
      {taskColumns.map((status) => (
        <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-900">{status}</h3>
          <div className="mt-3 space-y-2">
            {project.tasks.filter((task) => task.status === status).map((task) => (
              <article key={task.title} className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{task.owner}</Pill>
                  <Pill tone={task.priority === "Cao" ? "risk" : "neutral"}>{task.priority}</Pill>
                  <Pill>{task.due}</Pill>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerWork({ project }: { project: Project }) {
  return (
    <div id="customer-work" className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Khảo sát và tập huấn</h3>
        <div className="mt-3 space-y-3 text-sm">
          <Info label="Form khảo sát" value="Hiện trạng triển khai, dữ liệu, quy trình, báo cáo" />
          <Info label="Lịch tập huấn" value="2 phiên đang chờ xác nhận danh sách tham dự" />
          <Info label="Feedback" value="Điểm hài lòng demo: 4.3/5" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold">Ticket hỗ trợ vận hành</h3>
        <div className="mt-3 space-y-2">
          {project.tickets.map((ticket) => (
            <div key={ticket.code} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-950">{ticket.code}</p>
                <Pill tone={ticket.severity === "P1" ? "risk" : "neutral"}>{ticket.severity}</Pill>
              </div>
              <p className="mt-1 text-slate-700">{ticket.title}</p>
              <p className="mt-2 text-xs text-slate-500">SLA: {ticket.sla} | {ticket.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Acceptance({ project }: { project: Project }) {
  const checks = [
    ["Kế hoạch tổng thể đã xác nhận", "Đạt"],
    ["Cấu hình module trong scope", project.progress > 70 ? "Đạt" : "Đang kiểm tra"],
    ["Biên bản tập huấn", "Đang kiểm tra"],
    ["UAT bắt buộc", project.status === "Đúng tiến độ" ? "Đạt một phần" : "Chưa đạt"],
    ["Ticket nghiêm trọng", project.tickets.some((ticket) => ticket.severity === "P1") ? "Cần xử lý" : "Đạt"],
    ["Hồ sơ nghiệm thu", "Chưa đến"],
  ];

  return (
    <div id="acceptance" className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold">Checklist nghiệm thu sơ bộ</h3>
        <p className="mt-1 text-sm text-slate-600">V0.1.0 hiển thị checklist demo. V1.0.0 sẽ có xác nhận, file bằng chứng và khóa điều kiện blocking.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {checks.map(([label, status]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="font-medium text-slate-800">{label}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
