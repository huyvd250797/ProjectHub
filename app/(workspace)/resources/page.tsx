import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ResourceVault } from "@/components/resources/resource-vault";

export const metadata = { title: "Remote Server" };

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Secure Infrastructure"
        title="Remote Server / Resource Vault"
        description="Kho tài nguyên theo project với secret mã hóa server-side, Reveal/Copy theo quyền và security audit. Metadata không chứa plaintext credential."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">
            <ShieldCheck className="size-3.5" /> V0.9.0 Hardened Security
          </div>
        }
      />
      <ResourceVault />
    </>
  );
}
