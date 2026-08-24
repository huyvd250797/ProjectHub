import { NextRequest, NextResponse } from "next/server";
import { encryptResourceSecret, secretHint } from "@/lib/resources/crypto";
import { getProjectRoleForResource, getResourceAccess, maskUsername, normalizeResource, securityEnvironmentReady } from "@/lib/resources/server";
import type { ResourceActivity, ResourceDetailResponse, ResourceMutationResponse } from "@/lib/resources/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function text(value: unknown, max = 2000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function audit(projectId: string, resourceId: string | null, resourceName: string, userId: string, action: string) {
  const service = createServiceClient();
  if (!service) return;
  await service.from("remote_resource_access_logs").insert({ project_id: projectId, resource_id: resourceId, resource_name: resourceName, user_id: userId, action, metadata: {} });
}

export async function GET(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies ResourceDetailResponse, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_DETAIL_UNAVAILABLE", message: "Demo Mode không có detail API." } satisfies ResourceDetailResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceDetailResponse, { status: 401 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Không có quyền truy cập project." } satisfies ResourceDetailResponse, { status: 403 });
  const { data: row, error } = await supabase.from("remote_resources").select("*").eq("id", resourceId).eq("project_id", projectId).maybeSingle();
  if (error || !row) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy tài nguyên." } satisfies ResourceDetailResponse, { status: 404 });
  const access = await getResourceAccess(supabase, projectId, resourceId, user.id, role);
  let hint: string | null = null;
  const service = createServiceClient();
  if (service && row.has_secret) {
    const { data: secretRow } = await service.from("remote_resource_secrets").select("secret_hint").eq("resource_id", resourceId).eq("project_id", projectId).maybeSingle();
    hint = secretRow?.secret_hint ? String(secretRow.secret_hint) : null;
  }
  let activity: ResourceActivity[] = [];
  if ((role === "admin" || role === "pm") && service) {
    const { data: logs } = await service
      .from("remote_resource_access_logs")
      .select("id,action,created_at,user_id")
      .eq("project_id", projectId)
      .eq("resource_id", resourceId)
      .order("created_at", { ascending: false })
      .limit(30);
    const userIds = Array.from(new Set((logs ?? []).map((log: any) => log.user_id).filter(Boolean).map(String)));
    const profiles = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: ps } = await service.from("profiles").select("id,display_name,email").in("id", userIds);
      for (const p of ps ?? []) profiles.set(String(p.id), { name: p.display_name ? String(p.display_name) : null, email: p.email ? String(p.email) : null });
    }
    activity = (logs ?? []).map((log: any) => ({ id: String(log.id), action: String(log.action), createdAt: String(log.created_at), actorName: log.user_id ? profiles.get(String(log.user_id))?.name ?? null : null, actorEmail: log.user_id ? profiles.get(String(log.user_id))?.email ?? null : null }));
  }
  const visibleHint = access.canReveal || access.canCopy ? hint : null;
  const normalized = normalizeResource(row as Record<string, unknown>, { ...access, secretHint: visibleHint });
  const resource = role === "viewer" && normalized.isSensitive ? { ...normalized, username: maskUsername(normalized.username) } : normalized;
  return NextResponse.json({ ok: true, resource, activity } satisfies ResourceDetailResponse, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies ResourceMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceMutationResponse, { status: 401 });
  let raw: Record<string, unknown> = {}; try { raw = await request.json(); } catch {}
  const projectId = text(raw.projectId, 100);
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies ResourceMutationResponse, { status: 400 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ PM/Admin được sửa tài nguyên." } satisfies ResourceMutationResponse, { status: 403 });
  const { data: current } = await supabase.from("remote_resources").select("*").eq("id", resourceId).eq("project_id", projectId).maybeSingle();
  if (!current) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy tài nguyên." } satisfies ResourceMutationResponse, { status: 404 });

  const secretPresent = Object.prototype.hasOwnProperty.call(raw, "secret");
  const secret = text(raw.secret, 5000);
  const clearSecret = raw.clearSecret === true;
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Cần cấu hình SUPABASE_SERVICE_ROLE_KEY để ghi audit bảo mật." } satisfies ResourceMutationResponse, { status: 503 });
  if ((secret || clearSecret) && !securityEnvironmentReady()) return NextResponse.json({ ok: false, code: "SECURITY_ENV_REQUIRED", message: "Cần SUPABASE_SERVICE_ROLE_KEY và APP_ENCRYPTION_KEY để thay đổi secret." } satisfies ResourceMutationResponse, { status: 503 });

  const payload = {
    name: text(raw.name, 180) ?? String(current.name),
    resource_type: text(raw.resourceType, 40) ?? String(current.resource_type ?? "other"),
    environment: text(raw.environment, 40),
    url_or_host: text(raw.urlOrHost, 1000),
    remote_address: text(raw.remoteAddress, 500),
    username: text(raw.username, 500),
    notes: text(raw.notes, 4000),
    is_sensitive: Boolean(raw.isSensitive || secret || (current.has_secret && !clearSecret)),
    has_secret: clearSecret ? false : secret ? true : Boolean(current.has_secret),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("remote_resources").update(payload).eq("id", resourceId).eq("project_id", projectId).select("*").single();
  if (error || !data) return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message: `Không cập nhật được tài nguyên: ${error?.message ?? "unknown"}` } satisfies ResourceMutationResponse, { status: 500 });

  let hint: string | null = null;
  if (clearSecret && service) {
    await service.from("remote_resource_secrets").delete().eq("resource_id", resourceId).eq("project_id", projectId);
    await audit(projectId, resourceId, String(data.name), user.id, "secret_clear");
  } else if (secretPresent && secret && service) {
    const cipher = encryptResourceSecret(secret, projectId, resourceId);
    hint = secretHint(secret);
    const { error: secretError } = await service.from("remote_resource_secrets").upsert({ resource_id: resourceId, project_id: projectId, secret_ciphertext: cipher, secret_hint: hint, updated_at: new Date().toISOString() });
    if (secretError) return NextResponse.json({ ok: false, code: "SECRET_SAVE_FAILED", message: "Metadata đã cập nhật nhưng secret mới chưa lưu được. Hãy thử lại." } satisfies ResourceMutationResponse, { status: 500 });
    await audit(projectId, resourceId, String(data.name), user.id, "secret_update");
  }
  await audit(projectId, resourceId, String(data.name), user.id, "update");
  return NextResponse.json({ ok: true, resource: normalizeResource(data as Record<string, unknown>, { canReveal: true, canCopy: true, secretHint: hint }) } satisfies ResourceMutationResponse);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId." } satisfies ResourceMutationResponse, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không ghi dữ liệu." } satisfies ResourceMutationResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceMutationResponse, { status: 401 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Chỉ PM/Admin được xóa tài nguyên." } satisfies ResourceMutationResponse, { status: 403 });
  if (!createServiceClient()) return NextResponse.json({ ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Cần cấu hình SUPABASE_SERVICE_ROLE_KEY để ghi audit bảo mật." } satisfies ResourceMutationResponse, { status: 503 });
  const { data: current } = await supabase.from("remote_resources").select("name").eq("id", resourceId).eq("project_id", projectId).maybeSingle();
  if (!current) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy tài nguyên." } satisfies ResourceMutationResponse, { status: 404 });
  await audit(projectId, resourceId, String(current.name), user.id, "delete");
  const { error } = await supabase.from("remote_resources").delete().eq("id", resourceId).eq("project_id", projectId);
  if (error) return NextResponse.json({ ok: false, code: "DELETE_FAILED", message: `Không xóa được tài nguyên: ${error.message}` } satisfies ResourceMutationResponse, { status: 500 });
  return NextResponse.json({ ok: true, resource: normalizeResource({ id: resourceId, project_id: projectId, name: current.name, resource_type: "other", has_secret: false, is_sensitive: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, {}) } satisfies ResourceMutationResponse);
}
