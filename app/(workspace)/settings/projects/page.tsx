import { redirect } from "next/navigation";
import { Crown, ShieldCheck } from "lucide-react";
import { MasterProjectConsole } from "@/components/master/master-project-console";
import { PageHeader } from "@/components/page-header";
import { isMasterUser } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Master Project Console" };

export default async function MasterProjectsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/settings");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isMasterUser(supabase, user.id))) redirect("/settings");

  return (
    <>
      <PageHeader
        eyebrow="Global Administration"
        title="Master Project Console"
        description="Quản trị toàn bộ Project của ASC WORKING. V1.1.1 cho phép khai báo Project Team bằng họ tên + quyền trước; email đăng nhập có thể bổ sung và liên kết Supabase sau."
        actions={<span className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200"><Crown className="size-3.5" /> MASTER</span>}
      />
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-200/70" />
        Quyền MASTER là quyền toàn cục. Mỗi Project có hồ sơ riêng và có thể chỉnh sửa sau khi tạo; project_members chỉ dùng để giới hạn user thường theo từng Project.
      </div>
      <MasterProjectConsole />
    </>
  );
}
