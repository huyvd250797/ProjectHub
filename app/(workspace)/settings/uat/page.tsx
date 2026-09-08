import { PageHeader } from "@/components/page-header";
import { UatCenter } from "@/components/uat-center";

export const metadata = { title: "Hardening & UAT" };

export default function UatPage() {
  return (
    <>
      <PageHeader eyebrow="Production Readiness" title="Hardening & UAT" description="Production UAT Center cho ASC WORKING V3.0.0: kiểm tra độ ổn định, security environment, RLS, Project Command Center, Enterprise Suite, Portfolio Dashboard, Google Drive và regression sau mỗi deployment." />
      <UatCenter />
    </>
  );
}
