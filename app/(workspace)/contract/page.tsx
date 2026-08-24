import { DatabaseZap, FileStack } from "lucide-react";
import { ContractView } from "@/components/contract-view";
import { PageHeader } from "@/components/page-header";
import { CurrentProjectContractDescription } from "@/components/current-project";

export const metadata = { title: "PLHĐ" };

export default function ContractPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contract Intelligence"
        title="PLHĐ Unified View"
        description={<CurrentProjectContractDescription />}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] px-3 py-2 text-[10px] text-cyan-100/60">
            <DatabaseZap className="size-3.5" />
            Real Project Data • V0.9.3
            <FileStack className="ml-1 size-3.5 text-violet-300/60" />
          </div>
        }
      />
      <ContractView />
    </>
  );
}
