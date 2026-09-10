import { ExternalLink, Link2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectDocuments } from "@/components/documents/project-documents";

export const metadata = { title: "Tài liệu dự án" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Document Link Registry"
        title="Tài liệu dự án"
        description="Quản lý biên bản, hợp đồng, hướng dẫn và báo cáo theo từng Project bằng thông tin tài liệu và link Google Drive. ASC-WORKING chỉ lưu metadata nhẹ, không lưu file nặng."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">
            <Link2 className="size-3.5" /> Drive Link
            <span className="h-3 w-px bg-emerald-200/20" />
            <ExternalLink className="size-3.5" /> Xem file
          </div>
        }
      />
      <ProjectDocuments />
    </>
  );
}
