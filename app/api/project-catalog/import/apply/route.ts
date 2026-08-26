import { NextResponse } from "next/server";
import { loadQuickCatalogReference, parseQuickCatalogWorkbook } from "@/lib/catalog/quick-import-server";
import type { QuickCatalogImportSection } from "@/lib/catalog/quick-import-types";
import type { ImportApplyResult } from "@/lib/import/types";
import { assertProjectImportAccess, sha256ArrayBuffer } from "@/lib/import/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const validSections = new Set<QuickCatalogImportSection>(["departments", "contractItems", "contractDetails"]);

function sectionsFrom(value: FormDataEntryValue | null) {
  const raw = String(value ?? "departments,contractItems,contractDetails");
  return [...new Set(raw.split(",").map((item) => item.trim()).filter((item): item is QuickCatalogImportSection => validSections.has(item as QuickCatalogImportSection)))];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = String(formData.get("projectId") ?? "").trim();
    const projectCode = String(formData.get("projectCode") ?? "").trim();
    const confirmCode = String(formData.get("confirmCode") ?? "").trim();
    const sections = sectionsFrom(formData.get("sections"));

    if (!(file instanceof File)) return NextResponse.json({ error: "Không tìm thấy file Excel." }, { status: 400 });
    if (!projectId || !projectCode) return NextResponse.json({ error: "Thiếu Project đích." }, { status: 400 });
    if (!sections.length) return NextResponse.json({ error: "Hãy chọn ít nhất một nhóm dữ liệu cần import." }, { status: 400 });
    if (confirmCode.toLowerCase() !== projectCode.toLowerCase()) {
      return NextResponse.json({ error: `Nhập chính xác mã Project '${projectCode}' để xác nhận Import.` }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Chỉ hỗ trợ file .xlsx." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File vượt quá giới hạn 20 MB." }, { status: 413 });

    await assertProjectImportAccess(supabase, projectId, true);
    const arrayBuffer = await file.arrayBuffer();
    const reference = await loadQuickCatalogReference(supabase, projectId, sections);
    const parsed = parseQuickCatalogWorkbook(arrayBuffer, { id: projectId, code: projectCode }, sections, reference);
    if (parsed.errors.length) {
      return NextResponse.json({ error: parsed.errors.join(" ") }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("apply_quick_master_import_v132", {
      p_project_id: projectId,
      p_payload: parsed.payload,
      p_mode: "merge",
      p_file_name: file.name,
      p_source_hash: sha256ArrayBuffer(arrayBuffer),
    });
    if (error) {
      throw new Error(
        `${error.message}. Nếu RPC V1.3.2 chưa tồn tại, hãy chạy/rerun migration 202608260004_v132_bulk_master_data_import.sql.`,
      );
    }

    return NextResponse.json(data as ImportApplyResult, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    console.error("Quick catalog import apply failed", reason instanceof Error ? reason.message : "Unknown error");
    const message = reason instanceof Error ? reason.message : "Import dữ liệu thất bại.";
    const forbidden = /quyền|permission|access/i.test(message);
    const migrationRequired = /migration V1\.3\.2|import_key|apply_quick_master_import_v132/i.test(message);
    return NextResponse.json({ error: message }, { status: forbidden ? 403 : migrationRequired ? 409 : 500 });
  }
}
