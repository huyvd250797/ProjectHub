import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCanonicalImportWorkbook } from "@/lib/import/canonical";
import {
  applyCanonicalImport,
  assertProjectImportAccess,
  sha256ArrayBuffer,
} from "@/lib/import/server";
import type { ImportMode } from "@/lib/import/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = String(formData.get("projectId") ?? "").trim();
    const projectCode = String(formData.get("projectCode") ?? "").trim();
    const confirmCode = String(formData.get("confirmCode") ?? "").trim();
    const modeRaw = String(formData.get("mode") ?? "merge").trim();
    const mode: ImportMode = modeRaw === "insert_only" ? "insert_only" : "merge";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Không tìm thấy file Excel." }, { status: 400 });
    }
    if (!projectId || !projectCode) {
      return NextResponse.json({ error: "Thiếu Project đích." }, { status: 400 });
    }
    if (confirmCode.toLowerCase() !== projectCode.toLowerCase()) {
      return NextResponse.json({ error: `Nhập chính xác mã Project '${projectCode}' để xác nhận Apply Import.` }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Chỉ hỗ trợ file .xlsx." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File vượt quá giới hạn 10 MB." }, { status: 413 });
    }

    await assertProjectImportAccess(supabase, projectId, true);
    const arrayBuffer = await file.arrayBuffer();
    const { result, payload } = parseCanonicalImportWorkbook(
      arrayBuffer,
      file.name,
      { id: projectId, code: projectCode },
    );

    if (!result.canImport || result.format !== "canonical_v092") {
      return NextResponse.json({ error: "Workbook chưa đạt validation hoặc không phải template V0.9.2.", result }, { status: 400 });
    }

    const applied = await applyCanonicalImport(
      supabase,
      projectId,
      payload,
      mode,
      file.name,
      sha256ArrayBuffer(arrayBuffer),
    );

    return NextResponse.json(applied, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Import apply failed", error instanceof Error ? error.message : "Unknown error");
    const message = error instanceof Error ? error.message : "Apply Import thất bại.";
    const forbidden = /quyền|permission|access/i.test(message);
    return NextResponse.json({ error: message }, { status: forbidden ? 403 : 500 });
  }
}
