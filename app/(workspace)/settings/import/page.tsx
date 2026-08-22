import { ArrowLeft, DatabaseZap } from "lucide-react";
import Link from "next/link";
import { ImportWorkbook } from "@/components/import-workbook";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Import POC" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Data Migration Lab"
        title="Import POC — ASC-Working Workbook"
        description="V0.2.0 đọc workbook .xlsx phía server, nhận diện sheet, kiểm tra mapping và chất lượng dữ liệu trước khi import. Mọi bảng nghiệp vụ trong database đều tách theo project_id để sẵn sàng nhiều dự án."
        actions={
          <Link href="/settings" className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="size-3.5" /> Thiết lập
          </Link>
        }
      />
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-4">
        <DatabaseZap className="size-4 text-cyan-200/70" />
        <p className="text-xs leading-5 text-slate-500">
          Dry-run không ghi database. Sau khi report ổn định, version sau có thể bật bước Apply Import theo batch và transaction.
        </p>
      </div>
      <ImportWorkbook />
    </>
  );
}
