import { NextRequest, NextResponse } from "next/server";
import { getProjectRoleForResource } from "@/lib/resources/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const supabase = await createClient();
  if (!projectId || !supabase) return NextResponse.json({ ok: false, message: "Thiếu project hoặc Supabase." }, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, message: "Chỉ PM/Admin quản lý quyền." }, { status: 403 });
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, message: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  const [{ data: members, error: memberError }, { data: grants, error: grantError }] = await Promise.all([
    service.from("project_members").select("user_id,role").eq("project_id", projectId).order("role"),
    service.from("remote_resource_permissions").select("user_id,can_reveal,can_copy").eq("project_id", projectId).eq("resource_id", resourceId),
  ]);
  if (memberError || grantError) return NextResponse.json({ ok: false, message: memberError?.message ?? grantError?.message ?? "Không tải được quyền." }, { status: 500 });
  const userIds = (members ?? []).map((m: any) => String(m.user_id));
  const profileMap = new Map<string, { displayName: string | null; email: string | null }>();
  if (userIds.length) {
    const { data: profiles } = await service.from("profiles").select("id,display_name,email").in("id", userIds);
    for (const profile of profiles ?? []) profileMap.set(String(profile.id), { displayName: profile.display_name ? String(profile.display_name) : null, email: profile.email ? String(profile.email) : null });
  }
  const grantMap = new Map<string, { can_reveal?: boolean | null; can_copy?: boolean | null }>((grants ?? []).map((g: any) => [String(g.user_id), { can_reveal: g.can_reveal, can_copy: g.can_copy }]));
  return NextResponse.json({ ok: true, members: (members ?? []).map((m: any) => {
    const grant = grantMap.get(String(m.user_id));
    const profile = profileMap.get(String(m.user_id));
    return { userId: String(m.user_id), role: String(m.role), name: profile?.displayName ?? null, email: profile?.email ?? null, canReveal: Boolean(grant?.can_reveal), canCopy: Boolean(grant?.can_copy) };
  }) });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await context.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Demo Mode" }, { status: 409 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  let raw: Record<string, unknown> = {}; try { raw = await request.json(); } catch {}
  const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
  const targetUserId = typeof raw.userId === "string" ? raw.userId : "";
  if (!projectId || !targetUserId) return NextResponse.json({ ok: false, message: "Thiếu projectId/userId." }, { status: 400 });
  const role = await getProjectRoleForResource(supabase, projectId, user.id);
  if (role !== "admin" && role !== "pm") return NextResponse.json({ ok: false, message: "Chỉ PM/Admin quản lý quyền." }, { status: 403 });
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, message: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  const canReveal = Boolean(raw.canReveal);
  const canCopy = Boolean(raw.canCopy);
  if (!canReveal && !canCopy) {
    const { error } = await supabase.from("remote_resource_permissions").delete().eq("project_id", projectId).eq("resource_id", resourceId).eq("user_id", targetUserId);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("remote_resource_permissions").upsert({ project_id: projectId, resource_id: resourceId, user_id: targetUserId, can_reveal: canReveal, can_copy: canCopy, granted_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "resource_id,user_id" });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  const { data: resource } = await service.from("remote_resources").select("name").eq("id", resourceId).eq("project_id", projectId).maybeSingle();
  await service.from("remote_resource_access_logs").insert({ project_id: projectId, resource_id: resourceId, resource_name: resource?.name ?? "Resource", user_id: user.id, action: "permission_update", metadata: { target_user_id: targetUserId, can_reveal: canReveal, can_copy: canCopy } });
  return NextResponse.json({ ok: true });
}
