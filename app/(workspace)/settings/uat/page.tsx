import { PageHeader } from "@/components/page-header";
import { UatCenter } from "@/components/uat-center";

export const metadata = { title: "Hardening & UAT" };

export default function UatPage() {
  return (
    <>
      <PageHeader eyebrow="Production Readiness" title="Hardening & UAT" description="Production UAT Center cho ASC WORKING V1.1.0: kiểm tra độ ổn định, security environment, RLS, data quality và regression sau mỗi deployment." />
      <UatCenter />
    </>
  );
}
