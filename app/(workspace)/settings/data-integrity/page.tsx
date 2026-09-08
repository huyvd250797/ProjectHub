import { DataIntegrityDashboard } from "@/components/data-integrity/data-integrity-dashboard";
import { PageHeader } from "@/components/page-header";
import { APP_VERSION_LABEL } from "@/lib/app-meta";

export const metadata = { title: "Data Integrity" };

export default function DataIntegrityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Source of Truth"
        title="Data Integrity"
        description={`${APP_VERSION_LABEL} kiểm tra tính nhất quán dữ liệu giữa Plan, ISSUE, PLHĐ, Finance và Workload để hạn chế lỗi lệch danh mục với màn nghiệp vụ.`}
      />
      <DataIntegrityDashboard />
    </>
  );
}
