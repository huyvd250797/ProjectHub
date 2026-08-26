import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeMasterMember, requireMaster } from "@/lib/master/server";
import type { MasterMemberMutationResponse, MasterMembersResponse } from "@/lib/master/types";
import type { ProjectRole } from "@/lib/issues/types";

export const dynamic = "force-dynamic";

function validRole(value: unknown): ProjectRole | null {
  return value === "admin" || value === "pm" || value === "member" || value === "viewer" ? value : null;
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  if (!auth.supabase || auth.status !== 200) {
    return NextResponse.json(
      { ok: false, code: "MASTER_REQUIRED", message: auth.message ?? "Không có quyền." } satisfies MasterMembersResponse,
      { status: auth.status },
    );
  }

  // Project Team is authoritative in people. Login/project_members is optional.
  const { data: peopleRows, error: peopleError } = await auth.supabase
    .from("people")
    .select("id,user_id,full_name,email,project_role,is_active")
    .eq("project_id", projectId)
    .eq("person_type", "asc")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (peopleError) {
    const migrationMissing = /is_active|column .* does not exist/i.test(peopleError.message);
    return NextResponse.json(
      {
        ok: false,
        code: migrationMissing ? "V1111_MIGRATION_REQUIRED" : "TEAM_READ_FAILED",
        message: migrationMissing
          ? "Project Team V1.1.1 cần chạy migration 202608260001_v1111_team_validation_performance.sql."
          : peopleError.message,
      } satisfies MasterMembersResponse,
      { status: migrationMissing ? 503 : 500 },
    );
  }

  const people = (peopleRows ?? []) as Array<Record<string, unknown>>;
  const userIds = [...new Set(people.map((row) => row.user_id ? String(row.user_id) : "").filter(Boolean))];

  const [profilesResult, membershipsResult] = await Promise.all([
    userIds.length
      ? auth.supabase.from("profiles").select("id,email,display_name,is_active").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? auth.supabase.from("project_members").select("user_id,role").eq("project_id", projectId).in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    return NextResponse.json(
      { ok: false, code: "PROFILES_READ_FAILED", message: profilesResult.error.message } satisfies MasterMembersResponse,
      { status: 500 },
    );
  }
  if (membershipsResult.error) {
    return NextResponse.json(
      { ok: false, code: "MEMBERSHIPS_READ_FAILED", message: membershipsResult.error.message } satisfies MasterMembersResponse,
      { status: 500 },
    );
  }

  const profileMap = new Map<string, Record<string, unknown>>(
    ((profilesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), row]),
  );
  const membershipMap = new Map<string, Record<string, unknown>>(
    ((membershipsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.user_id), row]),
  );

  const members = people.map((person) => {
    const userId = person.user_id ? String(person.user_id) : "";
    return normalizeMasterMember(userId ? membershipMap.get(userId) : { role: person.project_role }, userId ? profileMap.get(userId) : undefined, person);
  });

  return NextResponse.json(
    { ok: true, members } satisfies MasterMembersResponse,
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" } },
  );
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const auth = await authorize();
  if (!auth.supabase || auth.status !== 200) {
    return NextResponse.json(
      { ok: false, code: "MASTER_REQUIRED", message: auth.message ?? "Không có quyền." } satisfies MasterMemberMutationResponse,
      { status: auth.status },
    );
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      {
        ok: false,
        code: "SERVICE_ROLE_REQUIRED",
        message: "Cần SUPABASE_SERVICE_ROLE_KEY để quản lý Project Team và liên kết tài khoản đăng nhập.",
      } satisfies MasterMemberMutationResponse,
      { status: 503 },
    );
  }

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch {}

  const memberId = typeof raw.memberId === "string" ? raw.memberId.trim() : "";
  const fullName = cleanName(raw.fullName);
  const email = cleanEmail(raw.email);
  const role = validRole(raw.role);
  const fieldErrors: Record<string, string> = {};

  if (!fullName || fullName.length < 2) fieldErrors.fullName = "Họ tên là bắt buộc và phải có ít nhất 2 ký tự.";
  if (email && !validEmail(email)) fieldErrors.email = "Email chưa đúng định dạng.";
  if (!role) fieldErrors.role = "Vui lòng chọn quyền trong Project.";

  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_FAILED", message: "Vui lòng kiểm tra thông tin thành viên.", fieldErrors } satisfies MasterMemberMutationResponse,
      { status: 400 },
    );
  }

  if (email) {
    let duplicateQuery = service
      .from("people")
      .select("id,full_name")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .eq("is_active", true)
      .ilike("email", email)
      .limit(1);
    if (memberId) duplicateQuery = duplicateQuery.neq("id", memberId);
    const { data: duplicateRows, error: duplicateError } = await duplicateQuery;
    if (duplicateError) {
      return NextResponse.json({ ok: false, code: "TEAM_EMAIL_CHECK_FAILED", message: duplicateError.message } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    if (duplicateRows?.length) {
      return NextResponse.json(
        { ok: false, code: "EMAIL_ALREADY_USED", message: `Email này đã được dùng bởi ${duplicateRows[0].full_name ?? "một thành viên khác"}.`, fieldErrors: { email: "Email đã tồn tại trong Project Team." } } satisfies MasterMemberMutationResponse,
        { status: 409 },
      );
    }
  }

  let existingPerson: Record<string, unknown> | null = null;
  if (memberId) {
    const { data, error } = await service
      .from("people")
      .select("id,user_id,full_name,email,project_role,is_active")
      .eq("id", memberId)
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, code: "TEAM_MEMBER_READ_FAILED", message: error.message } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, code: "TEAM_MEMBER_NOT_FOUND", message: "Không tìm thấy thành viên trong Project." } satisfies MasterMemberMutationResponse, { status: 404 });
    }
    existingPerson = data as Record<string, unknown>;
  }

  const oldUserId = existingPerson?.user_id ? String(existingPerson.user_id) : null;
  let linkedProfile: Record<string, unknown> | null = null;
  let newUserId: string | null = null;

  // Email is optional. If it matches an existing Supabase profile, link login access automatically.
  if (email) {
    const { data: profiles, error } = await service
      .from("profiles")
      .select("id,email,display_name,is_active")
      .ilike("email", email)
      .limit(1);
    if (error) {
      return NextResponse.json({ ok: false, code: "PROFILE_READ_FAILED", message: error.message } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    const profile = profiles?.[0] as Record<string, unknown> | undefined;
    if (profile?.id && profile.is_active !== false) {
      linkedProfile = profile;
      newUserId = String(profile.id);
    }
  }

  if (newUserId) {
    const { data: usedByOtherPerson, error } = await service
      .from("people")
      .select("id,full_name")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .eq("user_id", newUserId)
      .neq("id", memberId || "00000000-0000-0000-0000-000000000000")
      .limit(1);
    if (error) {
      return NextResponse.json({ ok: false, code: "LOGIN_LINK_CHECK_FAILED", message: error.message } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    if (usedByOtherPerson?.length) {
      return NextResponse.json(
        { ok: false, code: "EMAIL_ALREADY_LINKED", message: `Email này đã được liên kết với ${usedByOtherPerson[0].full_name ?? "một thành viên khác"} trong Project.`, fieldErrors: { email: "Email đã được dùng bởi thành viên khác." } } satisfies MasterMemberMutationResponse,
        { status: 409 },
      );
    }
  }

  const personPayload = {
    project_id: projectId,
    user_id: newUserId,
    person_type: "asc",
    full_name: fullName,
    email: email || null,
    project_role: role,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let savedPerson: Record<string, unknown>;
  if (existingPerson?.id) {
    const { data, error } = await service
      .from("people")
      .update(personPayload)
      .eq("id", String(existingPerson.id))
      .select("id,user_id,full_name,email,project_role,is_active")
      .single();
    if (error || !data) {
      return NextResponse.json({ ok: false, code: "TEAM_MEMBER_UPDATE_FAILED", message: error?.message ?? "Không cập nhật được thành viên." } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    savedPerson = data as Record<string, unknown>;
  } else {
    const { data, error } = await service
      .from("people")
      .insert(personPayload)
      .select("id,user_id,full_name,email,project_role,is_active")
      .single();
    if (error || !data) {
      return NextResponse.json({ ok: false, code: "TEAM_MEMBER_CREATE_FAILED", message: error?.message ?? "Không tạo được thành viên." } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    savedPerson = data as Record<string, unknown>;
  }

  // Keep project_members only for members who actually have a login profile.
  if (oldUserId && oldUserId !== newUserId) {
    await service.from("project_members").delete().eq("project_id", projectId).eq("user_id", oldUserId);
  }

  let membership: Record<string, unknown> = { role };
  if (newUserId) {
    const { error: profileUpdateError } = await service
      .from("profiles")
      .update({ display_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", newUserId);
    if (profileUpdateError) {
      return NextResponse.json({ ok: false, code: "PROFILE_UPDATE_FAILED", message: profileUpdateError.message } satisfies MasterMemberMutationResponse, { status: 500 });
    }

    const { data, error } = await service
      .from("project_members")
      .upsert({ project_id: projectId, user_id: newUserId, role }, { onConflict: "project_id,user_id" })
      .select("user_id,role")
      .single();
    if (error || !data) {
      return NextResponse.json({ ok: false, code: "MEMBER_ACCESS_SAVE_FAILED", message: error?.message ?? "Không lưu được quyền đăng nhập Project." } satisfies MasterMemberMutationResponse, { status: 500 });
    }
    membership = data as Record<string, unknown>;
    linkedProfile = { ...(linkedProfile ?? {}), id: newUserId, email, display_name: fullName, is_active: true };
  } else if (oldUserId) {
    await service.from("project_members").delete().eq("project_id", projectId).eq("user_id", oldUserId);
  }

  const member = normalizeMasterMember(membership, linkedProfile, savedPerson);
  const loginMessage = newUserId
    ? "Đã lưu thành viên và liên kết tài khoản đăng nhập."
    : email
      ? "Đã lưu thành viên để giao việc. Email chưa có tài khoản Supabase; sau khi tạo tài khoản, mở thành viên và bấm Lưu lại để liên kết đăng nhập."
      : "Đã lưu thành viên để giao việc. Có thể bổ sung email đăng nhập sau.";

  return NextResponse.json(
    { ok: true, member, assigneeSynced: true, loginLinked: Boolean(newUserId), message: loginMessage } satisfies MasterMemberMutationResponse,
  );
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const auth = await authorize();
  if (!auth.supabase || auth.status !== 200) {
    return NextResponse.json(
      { ok: false, code: "MASTER_REQUIRED", message: auth.message ?? "Không có quyền." } satisfies MasterMemberMutationResponse,
      { status: auth.status },
    );
  }

  const memberId = request.nextUrl.searchParams.get("memberId")?.trim();
  if (!memberId) {
    return NextResponse.json({ ok: false, code: "MEMBER_REQUIRED", message: "Thiếu memberId." } satisfies MasterMemberMutationResponse, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, code: "SERVICE_ROLE_REQUIRED", message: "Thiếu SUPABASE_SERVICE_ROLE_KEY." } satisfies MasterMemberMutationResponse, { status: 503 });
  }

  const { data: person, error: readError } = await service
    .from("people")
    .select("id,user_id")
    .eq("id", memberId)
    .eq("project_id", projectId)
    .eq("person_type", "asc")
    .maybeSingle();
  if (readError) return NextResponse.json({ ok: false, code: "TEAM_MEMBER_READ_FAILED", message: readError.message } satisfies MasterMemberMutationResponse, { status: 500 });
  if (!person) return NextResponse.json({ ok: false, code: "TEAM_MEMBER_NOT_FOUND", message: "Không tìm thấy thành viên." } satisfies MasterMemberMutationResponse, { status: 404 });

  const { error } = await service
    .from("people")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) return NextResponse.json({ ok: false, code: "TEAM_MEMBER_REMOVE_FAILED", message: error.message } satisfies MasterMemberMutationResponse, { status: 500 });

  if (person.user_id) {
    await service.from("project_members").delete().eq("project_id", projectId).eq("user_id", String(person.user_id));
  }

  return NextResponse.json({ ok: true, removedMemberId: memberId } satisfies MasterMemberMutationResponse);
}
