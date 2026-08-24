import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CanonicalProjectPayload,
  ImportApplyResult,
  ImportMode,
  ImportPreview,
} from "@/lib/import/types";
import { getEffectiveProjectRole } from "@/lib/access";

export function sha256ArrayBuffer(arrayBuffer: ArrayBuffer) {
  return createHash("sha256").update(new Uint8Array(arrayBuffer)).digest("hex");
}

export async function assertProjectImportAccess(
  supabase: SupabaseClient,
  projectId: string,
  write = false,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Phiên đăng nhập không hợp lệ.");

  const role = await getEffectiveProjectRole(supabase, projectId, user.id);
  if (!role) throw new Error("Bạn không có quyền truy cập Project này.");
  if (write && role !== "admin" && role !== "pm") {
    throw new Error("Chỉ MASTER, Admin hoặc PM được Apply Import.");
  }
  return { user, role };
}

export async function previewCanonicalImport(
  supabase: SupabaseClient,
  projectId: string,
  payload: CanonicalProjectPayload,
): Promise<ImportPreview> {
  const { data, error } = await supabase.rpc("preview_import_v092", {
    p_project_id: projectId,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return data as ImportPreview;
}

export async function applyCanonicalImport(
  supabase: SupabaseClient,
  projectId: string,
  payload: CanonicalProjectPayload,
  mode: ImportMode,
  fileName: string,
  sourceHash: string,
): Promise<ImportApplyResult> {
  const { data, error } = await supabase.rpc("apply_import_v092", {
    p_project_id: projectId,
    p_payload: payload,
    p_mode: mode,
    p_file_name: fileName,
    p_source_hash: sourceHash,
  });
  if (error) throw new Error(error.message);
  return data as ImportApplyResult;
}
