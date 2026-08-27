import { Cloud, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectDocuments } from "@/components/documents/project-documents";

export const metadata = { title: "Tài liệu dự án" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Attachment & Project Documents"
        title="Tài liệu dự án"
        description="Quản lý biên bản, hợp đồng, hướng dẫn và báo cáo theo từng Project. File được lưu private trên Google Drive; quyền xem/tải luôn được kiểm tra qua ASC-WORKING."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">
            <Cloud className="size-3.5" /> Google Drive
            <span className="h-3 w-px bg-emerald-200/20" />
            <ShieldCheck className="size-3.5" /> Private Proxy
          </div>
        }
      />
      <ProjectDocuments />
    </>
  );
}
