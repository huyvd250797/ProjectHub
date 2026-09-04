import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MASTER_PROJECT_SELECT,
  normalizeMasterProject,
  requireMaster,
  slugify,
} from "@/lib/master/server";
import type { MasterProjectDeleteResponse, MasterProjectMutationResponse } from "@/lib/master/types";

export const dynamic = "force-dynamic";

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[.,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function setNullable(payload: Record<string, unknown>, raw: Record<string, unknown>, sourceKey: string, targetKey: string, max: number) {
  if (Object.prototype.hasOwnProperty.call(raw, sourceKey)) payload[targetKey] = text(raw[sourceKey], max);
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
  const status = text(raw.status, 20);
  const requestedSlug = text(raw.slug, 80);

  if (Object.prototype.hasOwnProperty.call(raw, "code")) {
    if (!code) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Mã Project không được để trống." } satisfies MasterProjectMutationResponse, { status: 400 });
    payload.code = code;
  }
  if (Object.prototype.hasOwnProperty.call(raw, "name")) {
    if (!name) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Tên dự án không được để trống." } satisfies MasterProjectMutationResponse, { status: 400 });
    payload.name = name;
  }

  setNullable(payload, raw, "description", "description", 2000);
  setNullable(payload, raw, "organizationName", "organization_name", 180);
  setNullable(payload, raw, "organizationCode", "organization_code", 80);
  setNullable(payload, raw, "organizationAddress", "organization_address", 500);
  setNullable(payload, raw, "contractNo", "contract_no", 120);
  if (Object.prototype.hasOwnProperty.call(raw, "contractValue")) payload.contract_value = money(raw.contractValue);
  setNullable(payload, raw, "contractDate", "contract_date", 10);
  setNullable(payload, raw, "startDate", "start_date", 10);
  setNullable(payload, raw, "dueDate", "due_date", 10);
  setNullable(payload, raw, "contactName", "contact_name", 180);
  setNullable(payload, raw, "contactTitle", "contact_title", 180);
  setNullable(payload, raw, "contactEmail", "contact_email", 180);
  setNullable(payload, raw, "contactPhone", "contact_phone", 60);
  setNullable(payload, raw, "notes", "notes", 4000);
  if (Object.prototype.hasOwnProperty.call(raw, "slug")) payload.slug = requestedSlug ? slugify(requestedSlug) : undefined;
  if (status && ["active", "paused", "completed", "archived"].includes(status)) payload.status = status;

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  const { data, error } = await supabase.from("projects").update(payload).eq("id", projectId)
    .select(MASTER_PROJECT_SELECT).single();
  if (error || !data) return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message: error?.message ?? "Không cập nhật được Project." } satisfies MasterProjectMutationResponse, { status: 500 });

  const { count } = await supabase.from("people").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("person_type", "asc").eq("is_active", true);
  return NextResponse.json({ ok: true, project: normalizeMasterProject(data, count ?? 0) } satisfies MasterProjectMutationResponse);
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_MODE", message: "Demo Mode không xóa Project." } satisfies MasterProjectDeleteResponse, { status: 409 });
  const access = await requireMaster(supabase);
  if (!access.user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies MasterProjectDeleteResponse, { status: 401 });
  if (!access.isMaster) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: "Chỉ MASTER được xóa Project." } satisfies MasterProjectDeleteResponse, { status: 403 });

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Cần SUPABASE_SERVICE_ROLE_KEY để xóa Project và dữ liệu liên quan." } satisfies MasterProjectDeleteResponse, { status: 503 });
  }

  const { data: project, error: readError } = await service
    .from("projects")
    .select("id,code")
    .eq("id", projectId)
    .maybeSingle();
  if (readError) return NextResponse.json({ ok: false, code: "PROJECT_READ_FAILED", message: readError.message } satisfies MasterProjectDeleteResponse, { status: 500 });
  if (!project?.id) return NextResponse.json({ ok: false, code: "PROJECT_NOT_FOUND", message: "Không tìm thấy Project cần xóa." } satisfies MasterProjectDeleteResponse, { status: 404 });

  // V2.2.0 project hard delete: related project_id data is removed through existing FK cascade rules.
  const { error } = await service.from("projects").delete().eq("id", projectId);
  if (error) return NextResponse.json({ ok: false, code: "PROJECT_DELETE_FAILED", message: `Không xóa được Project: ${error.message}` } satisfies MasterProjectDeleteResponse, { status: 500 });

  return NextResponse.json({ ok: true, deletedProjectId: projectId, message: `Đã xóa Project ${String(project.code ?? "")} và dữ liệu liên quan.` } satisfies MasterProjectDeleteResponse);
}
