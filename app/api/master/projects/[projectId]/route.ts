import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeMasterProject, requireMaster, slugify } from "@/lib/master/server";
import type { MasterProjectMutationResponse } from "@/lib/master/types";

export const dynamic = "force-dynamic";

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_MODE", message: "Demo Mode không cập nhật Project." } satisfies MasterProjectMutationResponse, { status: 409 });
  const access = await requireMaster(supabase);
  if (!access.user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies MasterProjectMutationResponse, { status: 401 });
  if (!access.isMaster) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: "Chỉ MASTER được quản trị Project." } satisfies MasterProjectMutationResponse, { status: 403 });

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const code = text(raw.code, 30)?.toUpperCase();
  const name = text(raw.name, 180);
  const organizationName = text(raw.organizationName, 180);
  const status = text(raw.status, 20);
  const requestedSlug = text(raw.slug, 80);
  if (code) payload.code = code;
  if (name) payload.name = name;
  if (Object.prototype.hasOwnProperty.call(raw, "organizationName")) payload.organization_name = organizationName;
  if (Object.prototype.hasOwnProperty.call(raw, "contractNo")) payload.contract_no = text(raw.contractNo, 120);
  if (Object.prototype.hasOwnProperty.call(raw, "startDate")) payload.start_date = text(raw.startDate, 10);
  if (Object.prototype.hasOwnProperty.call(raw, "dueDate")) payload.due_date = text(raw.dueDate, 10);
  if (requestedSlug) payload.slug = slugify(requestedSlug);
  if (status && ["active", "paused", "completed", "archived"].includes(status)) payload.status = status;

  const { data, error } = await supabase.from("projects").update(payload).eq("id", projectId)
    .select("id,code,slug,name,organization_name,status,contract_no,start_date,due_date,created_at").single();
  if (error || !data) return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message: error?.message ?? "Không cập nhật được Project." } satisfies MasterProjectMutationResponse, { status: 500 });

  const { count } = await supabase.from("project_members").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  return NextResponse.json({ ok: true, project: normalizeMasterProject(data as Record<string, unknown>, count ?? 0) } satisfies MasterProjectMutationResponse);
}
