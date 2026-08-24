import { NextRequest, NextResponse } from "next/server";
import { decryptResourceSecret } from "@/lib/resources/crypto";
import { getProjectRoleForResource, getResourceAccess, securityEnvironmentReady } from "@/lib/resources/server";
import type { ResourceAccessResponse } from "@/lib/resources/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, code: "DEMO_READONLY", message: "Demo Mode không reveal credential." } satisfies ResourceAccessResponse, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies ResourceAccessResponse, { status: 401 });
  let raw: Record<string, unknown> = {}; try { raw = await request.json(); } catch {}
  const projectId = typeof raw.projectId === "string" ? raw.projectId.trim() : "";
  const action = raw.action === "copy" || raw.action === "open_link" ? raw.action : raw.action === "reveal" ? "reveal" : null;
  if (!projectId || !action) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Thiếu projectId hoặc action." } satisfies ResourceAccessResponse, { status: 400 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Không có quyền truy cập project." } satisfies ResourceAccessResponse, { status: 403 });
  const { data: resource } = await supabase.from("remote_resources").select("id,name,has_secret,url_or_host").eq("id", resourceId).eq("project_id", projectId).maybeSingle();
  if (!resource) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Không tìm thấy tài nguyên." } satisfies ResourceAccessResponse, { status: 404 });

  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." } satisfies ResourceAccessResponse, { status: 503 });
  if (action === "open_link") {
    await service.from("remote_resource_access_logs").insert({ project_id: projectId, resource_id: resourceId, resource_name: resource.name, user_id: user.id, action: "open_link", metadata: {} });
    return NextResponse.json({ ok: true, action: "open_link" } satisfies ResourceAccessResponse, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  }
  if (!securityEnvironmentReady()) return NextResponse.json({ ok: false, code: "ENCRYPTION_KEY_REQUIRED", message: "Chưa cấu hình APP_ENCRYPTION_KEY." } satisfies ResourceAccessResponse, { status: 503 });
  if (!resource.has_secret) return NextResponse.json({ ok: false, code: "NO_SECRET", message: "Tài nguyên này không có secret." } satisfies ResourceAccessResponse, { status: 404 });
  const access = await getResourceAccess(supabase, projectId, resourceId, user.id, role);
  const allowed = action === "reveal" ? access.canReveal : access.canCopy;
  if (!allowed) return NextResponse.json({ ok: false, code: "SECRET_FORBIDDEN", message: "Bạn chưa được cấp quyền Reveal/Copy credential này." } satisfies ResourceAccessResponse, { status: 403 });
  const { data: secretRow } = await service.from("remote_resource_secrets").select("secret_ciphertext").eq("resource_id", resourceId).eq("project_id", projectId).maybeSingle();
  if (!secretRow?.secret_ciphertext) return NextResponse.json({ ok: false, code: "SECRET_NOT_FOUND", message: "Không tìm thấy secret mã hóa." } satisfies ResourceAccessResponse, { status: 404 });
  let secret: string;
  try { secret = decryptResourceSecret(String(secretRow.secret_ciphertext), projectId, resourceId); }
  catch { return NextResponse.json({ ok: false, code: "SECRET_DECRYPT_FAILED", message: "Không giải mã được secret. Kiểm tra APP_ENCRYPTION_KEY." } satisfies ResourceAccessResponse, { status: 500 }); }
  await service.from("remote_resource_access_logs").insert({ project_id: projectId, resource_id: resourceId, resource_name: resource.name, user_id: user.id, action, metadata: {} });
  return NextResponse.json({ ok: true, action, secret, hideAfterSeconds: action === "reveal" ? 10 : undefined } satisfies ResourceAccessResponse, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
}
