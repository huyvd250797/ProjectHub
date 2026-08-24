"use client";

import { LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export function NoProjectAccess({ userEmail }: { userEmail?: string | null }) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-300/[0.05] blur-3xl" />
      <section className="tech-panel relative w-full max-w-xl rounded-[28px] p-6 md:p-8">
        <Logo />
        <div className="mt-8 grid size-12 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06]">
          <ShieldAlert className="size-5 text-amber-200" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
          Chưa có Project được cấp quyền
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Tài khoản {userEmail ? <span className="text-slate-300">{userEmail}</span> : "hiện tại"} đã đăng nhập nhưng chưa nhìn thấy Project nào trong Supabase. ASC WORKING V0.9.0 không dùng dữ liệu EPU demo để che trạng thái này.
        </p>
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-6 text-slate-500">
          Kiểm tra bảng <span className="font-mono text-cyan-200/70">project_members</span>, RLS và migration trước khi tiếp tục. Sau khi được cấp quyền, reload trang để vào workspace.
        </div>
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
