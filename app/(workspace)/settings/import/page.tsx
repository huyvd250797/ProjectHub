import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ImportWorkbook } from "@/components/import-workbook";

export const metadata = { title: "Import POC" };

export default function ImportPocPage() {
  return (
    <>
      <PageHeader
        eyebrow="Data Migration Lab"
        title="Data Model + Import POC"
        description="Dry-run workbook theo project đang chọn: kiểm tra cấu trúc, mapping và chất lượng dữ liệu trước khi ghi vào PostgreSQL. Import POC vẫn là dry-run; Apply Import chưa được bật trong V0.8.0."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-500">
            <FileSpreadsheet className="size-3.5 text-amber-300/70" />
            XLSX • Dry-run only
          </div>
        }
      />
      <ImportWorkbook />
    </>
  );
}
