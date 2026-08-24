import { PageHeader } from "@/components/page-header";
import { UatCenter } from "@/components/uat-center";

export const metadata = { title: "Hardening & UAT" };

export default function UatPage() {
  return (
    <>
      <PageHeader eyebrow="Production Readiness" title="Hardening & UAT" description="V0.9.0 tập trung kiểm tra độ ổn định, security, data quality và regression trước khi chốt ASC WORKING V1.0.0 Production." />
      <UatCenter />
    </>
  );
}
