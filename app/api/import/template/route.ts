import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildImportTemplate } from "@/lib/import/template";
import { assertProjectImportAccess } from "@/lib/import/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "Thiếu projectId." }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });
    }

    await assertProjectImportAccess(supabase, projectId, false);
    const template = await buildImportTemplate(supabase, projectId);

    return new Response(template.bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${template.fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo template." },
      { status: 500 },
    );
  }
}
