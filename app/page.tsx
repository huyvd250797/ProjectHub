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
  auditLogs: AuditLog[];
};

const STORAGE_KEY = "asc-projecthub-v0.5.0";

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
      status: "At Risk",
      progress: 64,
      startDate: "2026-08-05",
      endDate: "2026-09-30",
      healthNote: "Dữ liệu tuyển sinh cần đối soát thêm trước khi chốt UAT.",
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
  auditLogs: [
    {
      id: "log-1",
      at: "2026-08-22 09:00",
      actor: "June",
      action: "Khởi tạo",
      entity: "Version",
      detail: "Tạo dữ liệu seed cho ASC ProjectHub V0.5.0 Core MVP.",
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
    return JSON.parse(raw) as ProjectHubState;
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
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">V0.5.0 Core MVP - quản lý dự án có dữ liệu thao tác thật</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Bản này đã có CRUD nội bộ bằng local storage, nền phân quyền, audit log và cấu trúc dữ liệu bám theo kế hoạch Supabase. Khi có Supabase URL/key, có thể thay lớp lưu trữ local bằng database thật.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill className="border-blue-200 bg-blue-50 text-blue-800">Đã xây: V0.5.0</Pill>
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
                  {["Tổng quan", "Kế hoạch", "Milestone", "Task", "Audit log", "Supabase"].map((tab) => (
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
