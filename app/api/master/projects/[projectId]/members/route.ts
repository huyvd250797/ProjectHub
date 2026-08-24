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

  const { data: memberships, error } = await auth.supabase
    .from("project_members")
    .select("user_id,role")
    .eq("project_id", projectId)
    .order("role");

  if (error) {
    return NextResponse.json(
      { ok: false, code: "MEMBERS_READ_FAILED", message: error.message } satisfies MasterMembersResponse,
      { status: 500 },
    );
  }

  const ids = ((memberships ?? []) as Array<{ user_id: unknown; role: unknown }>).map((row) => String(row.user_id));
  const [profiles, people] = await Promise.all([
    ids.length
      ? auth.supabase.from("profiles").select("id,email,display_name,is_active").in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? auth.supabase.from("people").select("id,user_id,full_name,email").eq("project_id", projectId).eq("person_type", "asc").in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profiles.error) {
    return NextResponse.json(
      { ok: false, code: "PROFILES_READ_FAILED", message: profiles.error.message } satisfies MasterMembersResponse,
      { status: 500 },
    );
  }
  if (people.error) {
    return NextResponse.json(
      {
        ok: false,
        code: "ASSIGNEE_LINK_READ_FAILED",
        message: `${people.error.message}. Hãy chạy migration V0.9.5 để liên kết Project Member với Phụ trách ISSUE.`,
      } satisfies MasterMembersResponse,
      { status: 500 },
    );
  }

  const profileRows = (profiles.data ?? []) as Array<Record<string, unknown>>;
  const peopleRows = (people.data ?? []) as Array<Record<string, unknown>>;
  const profileMap = new Map<string, Record<string, unknown>>(profileRows.map((row) => [String(row.id), row]));
  const personMap = new Map<string, Record<string, unknown>>(peopleRows.map((row) => [String(row.user_id), row]));
  const memberRows = (memberships ?? []) as Array<Record<string, unknown>>;
  const members = memberRows.map((row) =>
    normalizeMasterMember(row, profileMap.get(String(row.user_id)), personMap.get(String(row.user_id))),
  );

  return NextResponse.json(
    { ok: true, members } satisfies MasterMembersResponse,
    { headers: { "Cache-Control": "no-store" } },
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
        message: "Cần SUPABASE_SERVICE_ROLE_KEY để quản lý hồ sơ thành viên và đồng bộ Phụ trách ISSUE.",
      } satisfies MasterMemberMutationResponse,
      { status: 503 },
    );
  }

  let raw: Record<string, unknown> = {};
  try {
    raw = await request.json();
  } catch {}

  const fullName = cleanName(raw.fullName);
  const email = cleanEmail(raw.email);
  const role = validRole(raw.role);

  if (!fullName || fullName.length < 2 || !email || !email.includes("@") || !role) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Họ tên, email đăng nhập và role hợp lệ là bắt buộc.",
      } satisfies MasterMemberMutationResponse,
      { status: 400 },
    );
  }

  const { data: profileRows, error: profileReadError } = await service
    .from("profiles")
    .select("id,email,display_name,is_active")
    .ilike("email", email)
    .limit(1);

  if (profileReadError) {
    return NextResponse.json(
      { ok: false, code: "PROFILE_READ_FAILED", message: profileReadError.message } satisfies MasterMemberMutationResponse,
      { status: 500 },
    );
  }

  const profile = profileRows?.[0] as Record<string, unknown> | undefined;
  if (!profile?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "PROFILE_NOT_FOUND",
        message: "Email này chưa có tài khoản Supabase Auth. Hãy tạo tài khoản đăng nhập bằng email này trước, sau đó thêm lại vào Project.",
      } satisfies MasterMemberMutationResponse,
      { status: 404 },
    );
  }

  if (profile.is_active === false) {
    return NextResponse.json(
      { ok: false, code: "PROFILE_INACTIVE", message: "Tài khoản đang bị vô hiệu hóa." } satisfies MasterMemberMutationResponse,
      { status: 409 },
    );
  }

  const userId = String(profile.id);

  const { error: profileUpdateError } = await service
    .from("profiles")
    .update({ display_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileUpdateError) {
    return NextResponse.json(
      { ok: false, code: "PROFILE_UPDATE_FAILED", message: profileUpdateError.message } satisfies MasterMemberMutationResponse,
      { status: 500 },
    );
  }

  const { data: membership, error: membershipError } = await service
    .from("project_members")
    .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: "project_id,user_id" })
    .select("user_id,role")
    .single();

  if (membershipError || !membership) {
    return NextResponse.json(
      {
        ok: false,
        code: "MEMBER_SAVE_FAILED",
        message: membershipError?.message ?? "Không lưu được thành viên.",
      } satisfies MasterMemberMutationResponse,
      { status: 500 },
    );
  }

  const { data: linkedPeople, error: personLookupError } = await service
    .from("people")
    .select("id,user_id,full_name,email")
    .eq("project_id", projectId)
    .eq("person_type", "asc")
    .eq("user_id", userId)
    .limit(1);

  if (personLookupError) {
    return NextResponse.json(
      {
        ok: false,
        code: "ASSIGNEE_LOOKUP_FAILED",
        message: `${personLookupError.message}. Hãy chạy migration V0.9.5 trước.`,
      } satisfies MasterMemberMutationResponse,
      { status: 500 },
    );
  }

  let person = linkedPeople?.[0] as Record<string, unknown> | undefined;

  if (!person) {
    const { data: emailMatch } = await service
      .from("people")
      .select("id,user_id,full_name,email")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .ilike("email", email)
      .limit(1);
    person = emailMatch?.[0] as Record<string, unknown> | undefined;
  }

  if (!person) {
    const { data: nameMatch } = await service
      .from("people")
      .select("id,user_id,full_name,email")
      .eq("project_id", projectId)
      .eq("person_type", "asc")
      .ilike("full_name", fullName)
      .limit(1);
    person = nameMatch?.[0] as Record<string, unknown> | undefined;
  }

  let savedPerson: Record<string, unknown> | null = null;

  if (person?.id) {
    const { data, error } = await service
      .from("people")
      .update({
        user_id: userId,
        full_name: fullName,
        email,
        project_role: role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(person.id))
      .select("id,user_id,full_name,email")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "ASSIGNEE_SYNC_FAILED", message: error.message } satisfies MasterMemberMutationResponse,
        { status: 500 },
      );
    }
    savedPerson = data as Record<string, unknown>;
  } else {
    const { data, error } = await service
      .from("people")
      .insert({
        project_id: projectId,
        user_id: userId,
        person_type: "asc",
        full_name: fullName,
        email,
        project_role: role,
      })
      .select("id,user_id,full_name,email")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "ASSIGNEE_CREATE_FAILED", message: error.message } satisfies MasterMemberMutationResponse,
        { status: 500 },
      );
    }
    savedPerson = data as Record<string, unknown>;
  }

  const updatedProfile = {
    ...profile,
    display_name: fullName,
    email,
  };

  return NextResponse.json(
    {
      ok: true,
      member: normalizeMasterMember(membership, updatedProfile, savedPerson),
      assigneeSynced: true,
    } satisfies MasterMemberMutationResponse,
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

  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json(
      { ok: false, code: "USER_REQUIRED", message: "Thiếu userId." } satisfies MasterMemberMutationResponse,
      { status: 400 },
    );
  }

  const { error } = await auth.supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { ok: false, code: "MEMBER_REMOVE_FAILED", message: error.message } satisfies MasterMemberMutationResponse,
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, removedUserId: userId } satisfies MasterMemberMutationResponse);
}
