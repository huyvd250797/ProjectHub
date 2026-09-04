import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createAutoPlanPreview } from "@/lib/planning/auto-generate";
import { isPlanningMigrationMissing, recalculateProjectPlan } from "@/lib/planning/server";
import type { AutoGeneratePlanResponse } from "@/lib/planning/types";
import { parseAutoGeneratePlanInput } from "@/lib/planning/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function uniqueCode(baseCode: string, usedCodes: Set<string>) {
  if (!usedCodes.has(baseCode)) {
    usedCodes.add(baseCode);
    return baseCode;
  }
  let suffix = 2;
  while (usedCodes.has(`${baseCode}-${suffix}`)) suffix += 1;
  const next = `${baseCode}-${suffix}`;
  usedCodes.add(next);
  return next;
}

export async function POST(request: NextRequest) {
  let raw: unknown = {};
  try { raw = await request.json(); } catch {}
  const parsed = parseAutoGeneratePlanInput(raw);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra lại ngày và kiểu gợi ý kế hoạch.", fieldErrors: parsed.errors } satisfies AutoGeneratePlanResponse, { status: 400 });

  const { input } = parsed;
  const basePreview = createAutoPlanPreview(input);
  const supabase = await createClient();
  if (!supabase) {
    if (input.dryRun) return NextResponse.json({ ok: true, message: "Đã tạo bản xem trước Auto Generate Plan.", applied: false, preview: basePreview } satisfies AutoGeneratePlanResponse);
    return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu. Hãy kết nối Supabase để tạo kế hoạch tự động." } satisfies AutoGeneratePlanResponse, { status: 409 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies AutoGeneratePlanResponse, { status: 401 });
  const role = await getEffectiveProjectRole(supabase, input.projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ MASTER, Admin hoặc PM được tạo kế hoạch tự động." } satisfies AutoGeneratePlanResponse, { status: 403 });
  if (input.dryRun) return NextResponse.json({ ok: true, message: "Đã tạo bản xem trước Auto Generate Plan.", applied: false, preview: basePreview } satisfies AutoGeneratePlanResponse);

  try {
    const [stageResult, milestoneResult, taskResult, checklistResult, reminderResult] = await Promise.all([
      supabase.from("project_stages").select("id,code,sort_order", { count: "exact" }).eq("project_id", input.projectId),
      supabase.from("project_milestones").select("id,sort_order", { count: "exact" }).eq("project_id", input.projectId),
      supabase.from("project_plan_tasks").select("id", { count: "exact", head: true }).eq("project_id", input.projectId),
      supabase.from("project_milestone_checklist_items").select("id", { count: "exact", head: true }).eq("project_id", input.projectId),
      supabase.from("project_plan_reminders").select("id", { count: "exact", head: true }).eq("project_id", input.projectId),
    ]);
    const loadError = [stageResult, milestoneResult, taskResult, checklistResult, reminderResult].find((result) => result.error)?.error;
    if (loadError) throw loadError;

    const dependencyCount = (taskResult.count ?? 0) + (checklistResult.count ?? 0) + (reminderResult.count ?? 0);
    if (input.applyMode === "replace_existing" && dependencyCount > 0) {
      return NextResponse.json({
        ok: false,
        code: "PLAN_HAS_EXECUTION_DATA",
        message: "Kế hoạch đã có task, checklist hoặc reminder. Hãy chọn tạo thêm vào kế hoạch hiện tại, hoặc xóa dữ liệu thực thi trước khi thay thế stage/milestone.",
        fieldErrors: { applyMode: "Không thể thay thế khi kế hoạch đã có dữ liệu thực thi phụ thuộc." },
      } satisfies AutoGeneratePlanResponse, { status: 409 });
    }
    const existingStageCodes = (stageResult.data ?? []).map((stage) => String(stage.code ?? "")).filter(Boolean);
    if (input.applyMode === "replace_existing" && existingStageCodes.length > 0) {
      const { count: issueCount, error: issueError } = await supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", input.projectId).in("stage_code", existingStageCodes);
      if (issueError) throw issueError;
      if ((issueCount ?? 0) > 0) {
        return NextResponse.json({
          ok: false,
          code: "PLAN_STAGE_IN_USE",
          message: `Không thể thay thế stage/milestone vì đang có ${issueCount} ISSUE tham chiếu stage hiện tại. Hãy chọn tạo thêm vào kế hoạch hiện tại hoặc chuyển ISSUE sang stage khác trước.`,
          fieldErrors: { applyMode: "Stage hiện tại đang được ISSUE sử dụng." },
        } satisfies AutoGeneratePlanResponse, { status: 409 });
      }
    }

    if (input.applyMode === "replace_existing") {
      const { error: deleteMilestonesError } = await supabase.from("project_milestones").delete().eq("project_id", input.projectId);
      if (deleteMilestonesError) throw deleteMilestonesError;
      const { error: deleteStagesError } = await supabase.from("project_stages").delete().eq("project_id", input.projectId);
      if (deleteStagesError) throw deleteStagesError;
    }

    const existingStages = input.applyMode === "replace_existing" ? [] : (stageResult.data ?? []);
    const existingMilestones = input.applyMode === "replace_existing" ? [] : (milestoneResult.data ?? []);
    const usedCodes = new Set(existingStages.map((stage) => String(stage.code ?? "")));
    const stageSortOffset = Math.max(0, ...existingStages.map((stage) => Number(stage.sort_order ?? 0)));
    const milestoneSortOffset = Math.max(0, ...existingMilestones.map((milestone) => Number(milestone.sort_order ?? 0)));
    const preview = {
      ...basePreview,
      stages: basePreview.stages.map((stage, index) => ({
        ...stage,
        code: uniqueCode(stage.code, usedCodes),
        sortOrder: stageSortOffset + (index + 1) * 10,
      })),
    };

    const { error: masterError } = await supabase.from("project_master_plans").upsert({
      project_id: input.projectId,
      title: input.title,
      objective: input.objective,
      start_date: input.startDate,
      target_end_date: input.targetEndDate,
      schedule_mode: input.scheduleMode,
      status: "active",
      notes: "Auto Generate Plan: stage và milestone được đề xuất từ ngày bắt đầu/kết thúc. Có thể chỉnh thủ công lại từng stage/milestone sau khi tạo.",
      updated_by: user.id,
    }, { onConflict: "project_id" });
    if (masterError) throw masterError;

    const { data: insertedStages, error: stageInsertError } = await supabase.from("project_stages").insert(preview.stages.map((stage) => ({
      project_id: input.projectId,
      code: stage.code,
      name: stage.name,
      description: stage.description,
      duration_days: stage.durationDays,
      date_mode: "manual",
      start_date: stage.startDate,
      end_date: stage.endDate,
      status: "not_started",
      progress: 0,
      color: stage.color,
      owner_person_id: null,
      sort_order: stage.sortOrder,
    }))).select("id,code");
    if (stageInsertError) throw stageInsertError;

    const stageIdByCode = new Map((insertedStages ?? []).map((stage) => [String(stage.code), String(stage.id)]));
    const { error: milestoneInsertError } = await supabase.from("project_milestones").insert(preview.stages.map((stage, index) => ({
      project_id: input.projectId,
      title: stage.milestoneTitle,
      description: stage.milestoneDescription,
      due_date: stage.endDate,
      status: "pending",
      stage_id: stageIdByCode.get(stage.code) ?? null,
      owner_person_id: null,
      sort_order: milestoneSortOffset + (index + 1) * 10,
      completed_at: null,
      created_by: user.id,
      updated_by: user.id,
    })));
    if (milestoneInsertError) throw milestoneInsertError;

    await recalculateProjectPlan(supabase, input.projectId);
    return NextResponse.json({
      ok: true,
      message: `Đã tạo ${preview.stageCount} stage và ${preview.milestoneCount} milestone từ Auto Generate Plan.`,
      applied: true,
      preview,
    } satisfies AutoGeneratePlanResponse, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tạo được kế hoạch tự động.";
    const missing = isPlanningMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "PLAN_MIGRATION_REQUIRED" : "AUTO_GENERATE_PLAN_FAILED",
      message: missing ? "Auto Generate Plan cần các bảng kế hoạch hiện có đến V1.8.0. Không cần migration mới cho V2.1.0 nếu database đã ở V2.0.0." : `Không tạo được kế hoạch tự động: ${message}`,
    } satisfies AutoGeneratePlanResponse, { status: missing ? 503 : 500 });
  }
}
