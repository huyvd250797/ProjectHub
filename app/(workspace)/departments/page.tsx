import { Building2 } from "lucide-react";
import { DepartmentIntelligence } from "@/components/departments/department-intelligence";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Phòng ban" };

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string; missingDepartment?: string }>;
}) {
  const params = await searchParams;
  const initialDepartmentId =
    params.departmentId || (params.missingDepartment === "1" ? "__unassigned__" : "");

  return (
    <>
      <PageHeader
        eyebrow="Department Intelligence"
        title="Phòng ban & Stakeholder"
        description="Theo dõi mức xử lý, bàn giao, quá hạn, đầu mối và Module theo từng phòng ban của project đang chọn. Click một đơn vị để mở intelligence drawer và drill-down sang ISSUE."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-500">
            <Building2 className="size-3.5 text-emerald-300/60" />
            Real Project Data • V0.9.5
          </div>
        }
      />
      <DepartmentIntelligence initialDepartmentId={initialDepartmentId} />
    </>
  );
}
