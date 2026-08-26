import { NextResponse } from "next/server";
import { loadQuickCatalogReference, parseQuickCatalogWorkbook } from "@/lib/catalog/quick-import-server";
import type { QuickCatalogImportSection, QuickCatalogImportPreviewResponse } from "@/lib/catalog/quick-import-types";
import type { ImportPreview } from "@/lib/import/types";
import { assertProjectImportAccess } from "@/lib/import/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 45;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const validSections = new Set<QuickCatalogImportSection>(["departments", "contractItems", "contractDetails"]);

function sectionsFrom(value: FormDataEntryValue | null) {
  const raw = String(value ?? "departments,contractItems,contractDetails");
  const sections = raw.split(",").map((item) => item.trim()).filter((item): item is QuickCatalogImportSection => validSections.has(item as QuickCatalogImportSection));
  return [...new Set(sections)];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = String(formData.get("projectId") ?? "").trim();
    const projectCode = String(formData.get("projectCode") ?? "").trim();
    const sections = sectionsFrom(formData.get("sections"));

    if (!(file instanceof File)) return NextResponse.json({ error: "Không tìm thấy file Excel." }, { status: 400 });
    if (!projectId || !projectCode) return NextResponse.json({ error: "Cần chọn Project đích trước khi import." }, { status: 400 });
    if (!sections.length) return NextResponse.json({ error: "Hãy chọn ít nhất một nhóm dữ liệu cần import." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Chỉ hỗ trợ file .xlsx." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File vượt quá giới hạn 20 MB." }, { status: 413 });

    const access = await assertProjectImportAccess(supabase, projectId, false);
    const canWrite = access.role === "admin" || access.role === "pm";
    const arrayBuffer = await file.arrayBuffer();
    const reference = await loadQuickCatalogReference(supabase, projectId, sections);
    const parsed = parseQuickCatalogWorkbook(arrayBuffer, { id: projectId, code: projectCode }, sections, reference);

    if (!canWrite) {
      parsed.warnings.push("Bạn có thể Preview nhưng chỉ MASTER/Admin/PM mới được Apply Import.");
    }

    let databasePreview: ImportPreview | null = null;
    if (parsed.errors.length === 0) {
      const { data, error } = await supabase.rpc("preview_quick_master_import_v132", {
        p_project_id: projectId,
        p_payload: parsed.payload,
      });
      if (error) {
        parsed.errors.push(
          `Không tạo được Preview database: ${error.message}. `
          + "Hãy chạy/rerun migration 202608260004_v132_bulk_master_data_import.sql.",
        );
      } else {
        databasePreview = data as ImportPreview;
      }
    }

    if (!canWrite && parsed.errors.length === 0) {
      parsed.warnings.push("Bạn có thể Preview nhưng chỉ MASTER/Admin/PM được Apply Import.");
    }

    const body: QuickCatalogImportPreviewResponse = {
      ok: true,
      projectId,
      fileName: file.name,
      sheets: parsed.sheets,
      summary: parsed.summary,
      samples: parsed.samples,
      warnings: [...new Set(parsed.warnings)].slice(0, 80),
      errors: parsed.errors,
      databasePreview,
      canApply: canWrite && parsed.errors.length === 0 && Boolean(databasePreview),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    console.error("Quick catalog import preview failed", reason instanceof Error ? reason.message : "Unknown error");
    const message = reason instanceof Error ? reason.message : "Không thể phân tích file Excel.";
    const forbidden = /quyền|permission|access/i.test(message);
    const migrationRequired = /migration V1\.3\.2|import_key|preview_quick_master_import_v132/i.test(message);
    return NextResponse.json({ error: message }, { status: forbidden ? 403 : migrationRequired ? 409 : 500 });
  }
}
