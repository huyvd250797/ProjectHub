import { NextRequest, NextResponse } from "next/server";
import { getEffectiveProjectRole } from "@/lib/access";
import { createDemoProjectCopilot } from "@/lib/copilot/demo";
import { isCopilotMigrationMissing, loadProjectCopilotData } from "@/lib/copilot/server";
import type { CopilotApiResponse } from "@/lib/copilot/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ ok: false, code: "PROJECT_REQUIRED", message: "Thiếu projectId cho AI Project Copilot." } satisfies CopilotApiResponse, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, data: createDemoProjectCopilot(projectId) } satisfies CopilotApiResponse);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn." } satisfies CopilotApiResponse, { status: 401 });

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền truy cập Project này." } satisfies CopilotApiResponse, { status: 403 });

  try {
    const data = await loadProjectCopilotData(supabase, projectId, role);
    return NextResponse.json({ ok: true, data } satisfies CopilotApiResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tải được AI Project Copilot.";
    const missing = isCopilotMigrationMissing(message);
    return NextResponse.json({
      ok: false,
      code: missing ? "COPILOT_SOURCE_REQUIRED" : "COPILOT_QUERY_FAILED",
      message: missing ? "AI Project Copilot cần dữ liệu Plan, Workload và Finance hiện có trước khi tổng hợp." : message,
    } satisfies CopilotApiResponse, { status: missing ? 503 : 500 });
  }
}
