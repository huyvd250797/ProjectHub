import { NextResponse } from "next/server";
import { inspectProjectWorkbook } from "@/lib/import/workbook";
import {
  isCanonicalImportWorkbook,
  parseCanonicalImportWorkbook,
} from "@/lib/import/canonical";
import { createClient } from "@/lib/supabase/server";
import {
  assertProjectImportAccess,
  previewCanonicalImport,
} from "@/lib/import/server";

export const runtime = "nodejs";
export const maxDuration = 30;

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

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Không tìm thấy file Excel." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Import chỉ hỗ trợ file .xlsx." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File vượt quá giới hạn 10 MB." }, { status: 413 });
    }
    if (!projectId || !projectCode) {
      return NextResponse.json({ error: "Cần chọn Project đích trước khi kiểm tra." }, { status: 400 });
    }

    await assertProjectImportAccess(supabase, projectId, false);
    const arrayBuffer = await file.arrayBuffer();

    if (isCanonicalImportWorkbook(arrayBuffer)) {
      const { result, payload } = parseCanonicalImportWorkbook(
        arrayBuffer,
        file.name,
        { id: projectId, code: projectCode },
      );

      if (result.canImport) {
        try {
          result.preview = await previewCanonicalImport(supabase, projectId, payload);
          result.canApply = true;
        } catch (previewError) {
          result.canApply = false;
          result.messages.push({
            severity: "error",
            code: "PREVIEW_RPC_NOT_READY",
            message: previewError instanceof Error
              ? `Không thể tạo preview database: ${previewError.message}. Hãy chạy migration V0.9.2.`
              : "Không thể tạo preview database. Hãy chạy migration V0.9.2.",
          });
          result.canImport = false;
        }
      }

      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const legacy = inspectProjectWorkbook(
      arrayBuffer,
      file.name,
      { id: projectId, code: projectCode },
    );
    legacy.format = "legacy";
    legacy.templateVersion = null;
    legacy.canApply = false;
    legacy.preview = null;
    legacy.messages.push({
      severity: "warning",
      code: "LEGACY_DRY_RUN_ONLY",
      message: "Workbook cũ chỉ hỗ trợ Dry-run. Để Apply Import, hãy tải Template V0.9.2 từ ASC WORKING và điền dữ liệu theo mẫu.",
    });

    return NextResponse.json(legacy, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Import dry-run failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể đọc workbook. Kiểm tra file .xlsx và thử lại." },
      { status: 500 },
    );
  }
}
