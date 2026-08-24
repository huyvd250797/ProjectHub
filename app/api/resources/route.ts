import { NextRequest, NextResponse } from "next/server";
import { createDemoResources } from "@/lib/resources/demo";
import { encryptResourceSecret, secretHint } from "@/lib/resources/crypto";
import { getProjectRoleForResource, getResourceAccess, maskUsername, normalizeResource, securityEnvironmentReady } from "@/lib/resources/server";
import type { ResourceApiResponse, ResourceMutationResponse } from "@/lib/resources/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function text(value: unknown, max = 2000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function logAction(projectId: string, resourceId: string | null, resourceName: string, userId: string, action: string) {
  const service = createServiceClient();
  if (!service) return;
  await service.from("remote_resource_access_logs").insert({ project_id: projectId, resource_id: resourceId, resource_name: resourceName, user_id: userId, action, metadata: {} });
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies ResourceApiResponse, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoResources(projectId) } satisfies ResourceApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceApiResponse, { status: 401 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập project này." } satisfies ResourceApiResponse, { status: 403 });

  const { data: rows, error } = await supabase
    .from("remote_resources")
    .select("id,project_id,name,resource_type,environment,url_or_host,remote_address,username,has_secret,notes,is_sensitive,created_at,updated_at")
    .eq("project_id", projectId)
    .order("environment", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    const missing = /remote_resource_permissions|remote_resource_access_logs|column .* does not exist/i.test(error.message);
    return NextResponse.json({ ok: false, code: missing ? "V080_MIGRATION_REQUIRED" : "RESOURCE_QUERY_FAILED", message: missing ? "Remote Server Security cần chạy migration V0.8.0." : `Không tải được tài nguyên: ${error.message}` } satisfies ResourceApiResponse, { status: missing ? 503 : 500 });
  }

  const service = createServiceClient();
  const hints = new Map<string, string | null>();
  if (service && rows?.some((row: any) => row.has_secret)) {
    const ids = (rows ?? []).filter((row: any) => row.has_secret).map((row: any) => String(row.id));
    const { data: secrets } = await service.from("remote_resource_secrets").select("resource_id,secret_hint").eq("project_id", projectId).in("resource_id", ids);
    for (const row of secrets ?? []) hints.set(String(row.resource_id), row.secret_hint ? String(row.secret_hint) : null);
  }

  const normalized = await Promise.all((rows ?? []).map(async (row: any) => {
    const access = await getResourceAccess(supabase, projectId, String(row.id), user.id, role);
    const visibleHint = access.canReveal || access.canCopy ? (hints.get(String(row.id)) ?? null) : null;
    const normalizedRow = normalizeResource(row as Record<string, unknown>, { ...access, secretHint: visibleHint });
    return role === "viewer" && normalizedRow.isSensitive ? { ...normalizedRow, username: maskUsername(normalizedRow.username) } : normalizedRow;
  }));
  const body: ResourceApiResponse = {
    ok: true,
    data: {
      source: "database",
      projectId,
      role,
      canManage: role === "admin" || role === "pm",
      canAudit: role === "admin" || role === "pm",
      securityReady: securityEnvironmentReady(),
      summary: {
        total: normalized.length,
        production: normalized.filter((row) => row.environment === "production").length,
        sensitive: normalized.filter((row) => row.isSensitive).length,
        withSecret: normalized.filter((row) => row.hasSecret).length,
      },
      rows: normalized,
    },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies ResourceMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceMutationResponse, { status: 401 });
  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const projectId = text(raw.projectId, 100);
  const name = text(raw.name, 180);
  if (!projectId || !name) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Project và tên tài nguyên là bắt buộc." } satisfies ResourceMutationResponse, { status: 400 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ PM/Admin được tạo tài nguyên." } satisfies ResourceMutationResponse, { status: 403 });

  const secret = text(raw.secret, 5000);
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Cần cấu hình SUPABASE_SERVICE_ROLE_KEY để ghi audit bảo mật." } satisfies ResourceMutationResponse, { status: 503 });
  if (secret && !securityEnvironmentReady()) return NextResponse.json({ ok: false, code: "SECURITY_ENV_REQUIRED", message: "Cần cấu hình SUPABASE_SERVICE_ROLE_KEY và APP_ENCRYPTION_KEY trước khi lưu secret." } satisfies ResourceMutationResponse, { status: 503 });

  const payload = {
    project_id: projectId,
    name,
    resource_type: text(raw.resourceType, 40) ?? "other",
    environment: text(raw.environment, 40),
    url_or_host: text(raw.urlOrHost, 1000),
    remote_address: text(raw.remoteAddress, 500),
    username: text(raw.username, 500),
    has_secret: Boolean(secret),
    notes: text(raw.notes, 4000),
    is_sensitive: Boolean(raw.isSensitive || secret),
    created_by: user.id,
    updated_by: user.id,
  };
  const { data, error } = await supabase.from("remote_resources").insert(payload).select("*").single();
  if (error || !data) return NextResponse.json({ ok: false, code: "CREATE_FAILED", message: `Không tạo được tài nguyên: ${error?.message ?? "unknown"}` } satisfies ResourceMutationResponse, { status: 500 });

  if (secret && service) {
    const cipher = encryptResourceSecret(secret, projectId, String(data.id));
    const { error: secretError } = await service.from("remote_resource_secrets").upsert({ resource_id: data.id, project_id: projectId, secret_ciphertext: cipher, secret_hint: secretHint(secret), updated_at: new Date().toISOString() });
    if (secretError) {
      await supabase.from("remote_resources").delete().eq("id", data.id).eq("project_id", projectId);
      return NextResponse.json({ ok: false, code: "SECRET_SAVE_FAILED", message: "Không lưu được secret mã hóa; tài nguyên đã được rollback." } satisfies ResourceMutationResponse, { status: 500 });
    }
  }
  await logAction(projectId, String(data.id), name, user.id, "create");
  const access = { canReveal: true, canCopy: true, secretHint: secret ? secretHint(secret) : null };
  return NextResponse.json({ ok: true, resource: normalizeResource(data as Record<string, unknown>, access) } satisfies ResourceMutationResponse, { status: 201 });
}
