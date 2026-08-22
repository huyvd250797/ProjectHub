import { FileStack } from "lucide-react";
import { ContractView } from "@/components/contract-view";
import { PageHeader } from "@/components/page-header";
import { CurrentProjectContractDescription } from "@/components/current-project";

export const metadata = { title: "PLHĐ" };

export default function ContractPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contract Scope"
        title="PLHĐ & PLHĐ chi tiết"
        description={<CurrentProjectContractDescription />}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-500">
            <FileStack className="size-3.5 text-violet-300/60" />
            119 tổng quan • 5K+ chi tiết
          </div>
        }
      />
      <ContractView />
    </>
  );
}
