"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, LogOut, Plus, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export function NoProjectAccess({
  userEmail,
  isMaster = false,
}: {
  userEmail?: string | null;
  isMaster?: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function logout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function createFirstProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isMaster || creating) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      organizationName: String(form.get("organizationName") ?? "").trim(),
    };
    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/master/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Không tạo được Project.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được Project.");
      setCreating(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-300/[0.05] blur-3xl" />
      <section className="tech-panel relative w-full max-w-xl rounded-[28px] p-6 md:p-8">
        <Logo />
        <div className={`mt-8 grid size-12 place-items-center rounded-2xl border ${isMaster ? "border-cyan-300/15 bg-cyan-300/[0.06]" : "border-amber-300/15 bg-amber-300/[0.06]"}`}>
          {isMaster ? <ShieldCheck className="size-5 text-cyan-200" /> : <ShieldAlert className="size-5 text-amber-200" />}
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
          {isMaster ? "MASTER chưa có Project để quản trị" : "Chưa có Project được cấp quyền"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Tài khoản {userEmail ? <span className="text-slate-300">{userEmail}</span> : "hiện tại"}{" "}
          {isMaster
            ? "đã có quyền MASTER toàn hệ thống. Hiện Supabase chưa có Project nào, bạn có thể tạo Project đầu tiên ngay tại đây."
            : "đã đăng nhập nhưng chưa được gán vào Project nào. User thường chỉ nhìn thấy Project có trong project_members."}
        </p>

        {isMaster ? (
          <form onSubmit={createFirstProject} className="mt-6 space-y-3 rounded-2xl border border-cyan-300/10 bg-black/10 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60">Bootstrap Project</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="code" required maxLength={30} placeholder="Mã Project, VD: EPU" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/25" />
              <input name="organizationName" maxLength={180} placeholder="Đơn vị / Trường" className="h-10 rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/25" />
            </div>
            <input name="name" required maxLength={180} placeholder="Tên dự án" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#081321] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/25" />
            {message ? <div className="text-xs text-rose-300">{message}</div> : null}
            <button disabled={creating} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#07111f] transition hover:bg-cyan-200 disabled:opacity-60">
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {creating ? "Đang tạo Project..." : "Tạo Project đầu tiên"}
            </button>
          </form>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-6 text-slate-500">
            Yêu cầu PM/Admin/MASTER thêm tài khoản vào <span className="font-mono text-cyan-200/70">project_members</span>. Sau khi được cấp quyền, reload trang để vào workspace.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 text-sm font-semibold text-[#07111f] transition hover:bg-cyan-200"
          >
            <RefreshCw className="size-4" /> Reload
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      </section>
    </main>
  );
}
