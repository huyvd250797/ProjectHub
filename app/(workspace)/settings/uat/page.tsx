import { PageHeader } from "@/components/page-header";
import { UatCenter } from "@/components/uat-center";
import { APP_VERSION_LABEL } from "@/lib/app-meta";

export const metadata = { title: "Hardening & UAT" };

export default function UatPage() {
  return (
    <>
      <PageHeader eyebrow="Production Readiness" title="Hardening & UAT" description={`Production UAT Center cho ASC WORKING ${APP_VERSION_LABEL}: kiểm tra độ ổn định, security environment, RLS và regression sau mỗi deployment.`} />
      <UatCenter />
    </>
  );
}
