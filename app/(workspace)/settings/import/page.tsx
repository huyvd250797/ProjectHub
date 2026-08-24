import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ImportWorkbook } from "@/components/import-workbook";

export const metadata = { title: "Excel Import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Data Migration"
        title="Excel Import Production"
        description="Tải template theo Project, điền dữ liệu, upload lại để Dry-run/Preview rồi Apply Import vào Supabase. V0.9.2 dùng key ổn định để import lặp lại an toàn và không nhận password/token/secret từ Excel."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-500">
            <FileSpreadsheet className="size-3.5 text-emerald-300/70" />
            XLSX • Template Round-trip
          </div>
        }
      />
      <ImportWorkbook />
    </>
  );
}
