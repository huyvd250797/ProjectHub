import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeMasterMember, requireMaster } from "@/lib/master/server";
import type { MasterMemberMutationResponse, MasterMembersResponse } from "@/lib/master/types";
import type { ProjectRole } from "@/lib/issues/types";

export const dynamic = "force-dynamic";

function validRole(value: unknown): ProjectRole | null {
  return value === "admin" || value === "pm" || value === "member" || value === "viewer" ? value : null;
}

async function authorize() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, status: 409, message: "Demo Mode không có Master Console." } as const;
  const access = await requireMaster(supabase);
  if (!access.user) return { supabase, status: 401, message: "Phiên đăng nhập đã hết hạn." } as const;
  if (!access.isMaster) return { supabase, status: 403, message: "Chỉ MASTER được quản lý thành viên toàn hệ thống." } as const;
  return { supabase, status: 200, message: null } as const;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const auth = await authorize();
  if (!auth.supabase || auth.status !== 200) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: auth.message ?? "Không có quyền." } satisfies MasterMembersResponse, { status: auth.status });

  const { data: memberships, error } = await auth.supabase.from("project_members").select("user_id,role").eq("project_id", projectId).order("role");
  if (error) return NextResponse.json({ ok: false, code: "MEMBERS_READ_FAILED", message: error.message } satisfies MasterMembersResponse, { status: 500 });
  const ids = ((memberships ?? []) as Array<{ user_id: unknown; role: unknown }>).map((row) => String(row.user_id));
  const profiles = ids.length
    ? await auth.supabase.from("profiles").select("id,email,display_name,is_active").in("id", ids)
    : { data: [], error: null };
  if (profiles.error) return NextResponse.json({ ok: false, code: "PROFILES_READ_FAILED", message: profiles.error.message } satisfies MasterMembersResponse, { status: 500 });
  const profileRows = (profiles.data ?? []) as Array<Record<string, unknown>>;
  const profileMap = new Map<string, Record<string, unknown>>(profileRows.map((row) => [String(row.id), row]));
  const memberRows = (memberships ?? []) as Array<Record<string, unknown>>;
  const members = memberRows.map((row) => normalizeMasterMember(row, profileMap.get(String(row.user_id))));
  return NextResponse.json({ ok: true, members } satisfies MasterMembersResponse, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const auth = await authorize();
  if (!auth.supabase || auth.status !== 200) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: auth.message ?? "Không có quyền." } satisfies MasterMemberMutationResponse, { status: auth.status });

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const role = validRole(raw.role);
  if (!email || !role) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "Email và role hợp lệ là bắt buộc." } satisfies MasterMemberMutationResponse, { status: 400 });

  const { data: profile } = await auth.supabase.from("profiles").select("id,email,display_name,is_active").ilike("email", email).maybeSingle();
  if (!profile) return NextResponse.json({ ok: false, code: "PROFILE_NOT_FOUND", message: "Không tìm thấy tài khoản đã đăng nhập/được tạo trong Supabase với email này." } satisfies MasterMemberMutationResponse, { status: 404 });
  if (profile.is_active === false) return NextResponse.json({ ok: false, code: "PROFILE_INACTIVE", message: "Tài khoản đang bị vô hiệu hóa." } satisfies MasterMemberMutationResponse, { status: 409 });

  const { data: membership, error } = await auth.supabase.from("project_members").upsert({ project_id: projectId, user_id: profile.id, role }, { onConflict: "project_id,user_id" }).select("user_id,role").single();
  if (error || !membership) return NextResponse.json({ ok: false, code: "MEMBER_SAVE_FAILED", message: error?.message ?? "Không lưu được thành viên." } satisfies MasterMemberMutationResponse, { status: 500 });
  return NextResponse.json({ ok: true, member: normalizeMasterMember(membership as Record<string, unknown>, profile as Record<string, unknown>) } satisfies MasterMemberMutationResponse);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const auth = await authorize();
  if (!auth.supabase || auth.status !== 200) return NextResponse.json({ ok: false, code: "MASTER_REQUIRED", message: auth.message ?? "Không có quyền." } satisfies MasterMemberMutationResponse, { status: auth.status });
  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok: false, code: "USER_REQUIRED", message: "Thiếu userId." } satisfies MasterMemberMutationResponse, { status: 400 });
  const { error } = await auth.supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error) return NextResponse.json({ ok: false, code: "MEMBER_REMOVE_FAILED", message: error.message } satisfies MasterMemberMutationResponse, { status: 500 });
  return NextResponse.json({ ok: true, removedUserId: userId } satisfies MasterMemberMutationResponse);
}
