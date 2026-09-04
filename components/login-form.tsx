"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase chưa được cấu hình. Hãy dùng Demo Workspace hoặc thêm biến môi trường.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setLoading(false);
        setError("Đăng nhập không thành công. Kiểm tra email hoặc mật khẩu.");
        return;
      }

      // Keep loading=true until the login page unmounts after navigation.
      // This prevents the spinner from stopping while Next.js/Supabase is still
      // completing the authenticated dashboard transition.
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Không kết nối được máy chủ đăng nhập. Vui lòng thử lại.");
    }
  }

  return (
    <div className="tech-panel w-full max-w-[440px] rounded-[28px] p-6 shadow-2xl md:p-8">
      <div className="mb-7">
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
          <ShieldCheck className="size-3.5" />
          Secure Project Workspace
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
          Đăng nhập ASC WORKING
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Truy cập Project Workspace và các dự án bạn được phân quyền.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Mật khẩu
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/10 px-3.5 pr-11 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-slate-600 hover:text-slate-300"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3.5 py-3 text-xs leading-5 text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!configured || loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 text-sm font-semibold text-[#07111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          {!loading ? <ArrowRight className="size-4" /> : null}
        </button>
      </form>

      {!configured ? (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
            V2.2.1 Demo Mode
          </div>
          <p className="mb-4 text-xs leading-5 text-slate-500">
            Chưa có biến môi trường Supabase. Bạn vẫn có thể xem toàn bộ Dashboard và giao diện workspace.
          </p>
          <Link
            href="/dashboard"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-medium text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.05]"
          >
            Vào Demo Workspace
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
