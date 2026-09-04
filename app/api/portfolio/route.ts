import { NextResponse } from "next/server";
import { createDemoPortfolio } from "@/lib/portfolio/demo";
import type { PortfolioApiResponse, PortfolioData, PortfolioHealth, PortfolioProjectRow } from "@/lib/portfolio/types";
import { getWorkspaceProjects } from "@/lib/projects-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = String(row[key] ?? "");
    if (!id) continue;
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

function resolveHealth(row: PortfolioProjectRow): PortfolioHealth {
  if (row.status === "completed") return "completed";
  if (row.overdueIssues || row.overdueMilestones || row.overdueTasks || row.overdueReminders) return "late";
  if (row.blockedTasks || row.alertScore >= 5) return "at_risk";
  if (!row.startDate && !row.dueDate && !row.stages) return "not_scheduled";
  return "on_track";
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoPortfolio() } satisfies PortfolioApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies PortfolioApiResponse, { status: 401 });

  const projects = await getWorkspaceProjects(supabase);
  if (!projects.length) return NextResponse.json({ ok: true, data: { source: "database", generatedAt: new Date().toISOString(), projects: [], summary: { projectCount: 0, activeProjects: 0, atRiskProjects: 0, lateProjects: 0, totalIssues: 0, openIssues: 0, overdueIssues: 0, openReminders: 0, overdueReminders: 0, totalContractValue: 0 } } satisfies PortfolioData });

  const ids = projects.map((project) => project.id);
  const today = new Date().toISOString().slice(0, 10);
  const [projectRows, issueRows, moduleRows, stageRows, milestoneRows, taskRows, reminderRows] = await Promise.all([
    supabase.from("projects").select("id,contract_value,start_date,due_date,status").in("id", ids),
    supabase.from("issues").select("project_id,status_code,due_date,archived_at").in("project_id", ids),
    supabase.from("contract_items").select("project_id,item_type").in("project_id", ids).eq("item_type", "module"),
    supabase.from("project_stages").select("project_id,status,progress,end_date").in("project_id", ids),
    supabase.from("project_milestones").select("project_id,status,due_date").in("project_id", ids),
    supabase.from("project_plan_tasks").select("project_id,status,due_date").in("project_id", ids),
    supabase.from("project_plan_reminders").select("project_id,status,remind_at,snoozed_until").in("project_id", ids),
  ]);

  const firstError = projectRows.error ?? issueRows.error ?? moduleRows.error ?? stageRows.error ?? milestoneRows.error ?? taskRows.error ?? reminderRows.error;
  if (firstError) return NextResponse.json({ ok: false, code: "PORTFOLIO_QUERY_FAILED", message: `Không tải được Portfolio Dashboard: ${firstError.message}` } satisfies PortfolioApiResponse, { status: 500 });

  const projectMeta = new Map((projectRows.data ?? []).map((row) => [String(row.id), row]));
  const issuesByProject = countBy((issueRows.data ?? []) as Array<Record<string, unknown>>, "project_id");
  const modulesByProject = countBy((moduleRows.data ?? []) as Array<Record<string, unknown>>, "project_id");
  const stagesByProject = countBy((stageRows.data ?? []) as Array<Record<string, unknown>>, "project_id");
  const milestonesByProject = countBy((milestoneRows.data ?? []) as Array<Record<string, unknown>>, "project_id");
  const tasksByProject = countBy((taskRows.data ?? []) as Array<Record<string, unknown>>, "project_id");
  const remindersByProject = countBy((reminderRows.data ?? []) as Array<Record<string, unknown>>, "project_id");

  const rows = projects.map((project) => {
    const meta = projectMeta.get(project.id);
    const issues = (issuesByProject.get(project.id) ?? []).filter((issue) => !issue.archived_at);
    const milestones = milestonesByProject.get(project.id) ?? [];
    const tasks = tasksByProject.get(project.id) ?? [];
    const reminders = remindersByProject.get(project.id) ?? [];
    const stages = stagesByProject.get(project.id) ?? [];
    const openIssues = issues.filter((issue) => !["resolved", "released", "no_action", "not_feasible"].includes(String(issue.status_code ?? ""))).length;
    const overdueIssues = issues.filter((issue) => dateOnly(issue.due_date) && dateOnly(issue.due_date)! < today && !["resolved", "released", "no_action", "not_feasible"].includes(String(issue.status_code ?? ""))).length;
    const openMilestones = milestones.filter((milestone) => milestone.status !== "completed");
    const openTasks = tasks.filter((task) => task.status !== "done");
    const activeReminders = reminders.filter((reminder) => reminder.status === "open" || reminder.status === "snoozed");
    const stageProgress = stages.length ? Math.round(stages.reduce((total, stage) => total + numberValue(stage.progress), 0) / stages.length) : 0;
    const nextDates = [
      ...issues.map((issue) => dateOnly(issue.due_date)),
      ...openMilestones.map((milestone) => dateOnly(milestone.due_date)),
      ...openTasks.map((task) => dateOnly(task.due_date)),
      ...activeReminders.map((reminder) => dateOnly(reminder.snoozed_until ?? reminder.remind_at)),
    ].filter((value): value is string => typeof value === "string" && value >= today).sort();

    const row: PortfolioProjectRow = {
      id: project.id,
      code: project.code,
      name: project.name,
      organizationName: project.organizationName || null,
      status: project.status,
      contractValue: meta?.contract_value === null || meta?.contract_value === undefined ? null : numberValue(meta.contract_value),
      startDate: dateOnly(meta?.start_date),
      dueDate: dateOnly(meta?.due_date),
      health: "not_scheduled",
      totalIssues: issues.length,
      openIssues,
      overdueIssues,
      modules: modulesByProject.get(project.id)?.length ?? 0,
      stages: stages.length,
      stageProgress,
      milestones: milestones.length,
      overdueMilestones: openMilestones.filter((milestone) => dateOnly(milestone.due_date) && dateOnly(milestone.due_date)! < today).length,
      tasks: tasks.length,
      blockedTasks: openTasks.filter((task) => task.status === "blocked").length,
      overdueTasks: openTasks.filter((task) => dateOnly(task.due_date) && dateOnly(task.due_date)! < today).length,
      openReminders: activeReminders.length,
      overdueReminders: activeReminders.filter((reminder) => dateOnly(reminder.snoozed_until ?? reminder.remind_at) && dateOnly(reminder.snoozed_until ?? reminder.remind_at)! < today).length,
      alertScore: 0,
      nextDueDate: nextDates[0] ?? null,
    };
    row.alertScore = row.overdueIssues + row.overdueMilestones + row.overdueTasks + row.overdueReminders + row.blockedTasks * 2;
    row.health = resolveHealth(row);
    return row;
  }).sort((a, b) => b.alertScore - a.alertScore || a.code.localeCompare(b.code, "vi"));

  const data: PortfolioData = {
    source: "database",
    generatedAt: new Date().toISOString(),
    projects: rows,
    summary: {
      projectCount: rows.length,
      activeProjects: rows.filter((project) => project.status === "active").length,
      atRiskProjects: rows.filter((project) => project.health === "at_risk").length,
      lateProjects: rows.filter((project) => project.health === "late").length,
      totalIssues: rows.reduce((total, project) => total + project.totalIssues, 0),
      openIssues: rows.reduce((total, project) => total + project.openIssues, 0),
      overdueIssues: rows.reduce((total, project) => total + project.overdueIssues, 0),
      openReminders: rows.reduce((total, project) => total + project.openReminders, 0),
      overdueReminders: rows.reduce((total, project) => total + project.overdueReminders, 0),
      totalContractValue: rows.reduce((total, project) => total + (project.contractValue ?? 0), 0),
    },
  };

  return NextResponse.json({ ok: true, data } satisfies PortfolioApiResponse, { headers: { "Cache-Control": "no-store" } });
}
