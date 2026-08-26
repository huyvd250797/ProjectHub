import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MASTER_PROJECT_SELECT,
  normalizeMasterProject,
  requireMaster,
  slugify,
} from "@/lib/master/server";
import type { MasterProjectMutationResponse, MasterProjectsResponse } from "@/lib/master/types";

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

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_MODE", message: "Demo Mode không có Master Console." } satisfies MasterProjectsResponse, { status: 409 });
  const access = await requireMaster(supabase);
  if (!access.user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies MasterProjectsResponse, { status: 401 });
  if (!access.isMaster) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: "Chỉ tài khoản MASTER được quản trị toàn bộ Project." } satisfies MasterProjectsResponse, { status: 403 });

  const [projectsResult, membersResult] = await Promise.all([
    supabase.from("projects").select(MASTER_PROJECT_SELECT).order("created_at", { ascending: true }),
    supabase.from("people").select("project_id").eq("person_type", "asc").eq("is_active", true),
  ]);
  if (projectsResult.error) return NextResponse.json({ ok: false, code: "PROJECTS_READ_FAILED", message: projectsResult.error.message } satisfies MasterProjectsResponse, { status: 500 });

  const counts = new Map<string, number>();
  for (const row of (membersResult.data ?? []) as Array<{ project_id: unknown }>) {
    const id = String(row.project_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const projects = (projectsResult.data ?? []).map((row) =>
    normalizeMasterProject(row, counts.get(String(row.id)) ?? 0),
  );
  return NextResponse.json({ ok: true, projects } satisfies MasterProjectsResponse, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_MODE", message: "Demo Mode không tạo Project." } satisfies MasterProjectMutationResponse, { status: 409 });
  const access = await requireMaster(supabase);
  if (!access.user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies MasterProjectMutationResponse, { status: 401 });
  if (!access.isMaster) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: "Chỉ MASTER được tạo Project." } satisfies MasterProjectMutationResponse, { status: 403 });

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const code = text(raw.code, 30)?.toUpperCase();
  const name = text(raw.name, 180);
  const organizationName = text(raw.organizationName, 180);
  const requestedSlug = text(raw.slug, 80);
  if (!code || !name) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Mã Project và tên dự án là bắt buộc." } satisfies MasterProjectMutationResponse, { status: 400 });
  const slug = slugify(requestedSlug || `${code}-${organizationName || name}`) || slugify(code);

  const { data, error } = await supabase.from("projects").insert({
    code,
    slug,
    name,
    description: text(raw.description, 2000),
    organization_name: organizationName,
    organization_code: text(raw.organizationCode, 80),
    organization_address: text(raw.organizationAddress, 500),
    contract_no: text(raw.contractNo, 120),
    contract_value: money(raw.contractValue),
    contract_date: text(raw.contractDate, 10),
    start_date: text(raw.startDate, 10),
    due_date: text(raw.dueDate, 10),
    contact_name: text(raw.contactName, 180),
    contact_title: text(raw.contactTitle, 180),
    contact_email: text(raw.contactEmail, 180),
    contact_phone: text(raw.contactPhone, 60),
    notes: text(raw.notes, 4000),
    status: "active",
  }).select(MASTER_PROJECT_SELECT).single();

  if (error || !data) return NextResponse.json({ ok: false, code: "CREATE_FAILED", message: error?.message ?? "Không tạo được Project." } satisfies MasterProjectMutationResponse, { status: 500 });
  return NextResponse.json({ ok: true, project: normalizeMasterProject(data, 0) } satisfies MasterProjectMutationResponse);
}
