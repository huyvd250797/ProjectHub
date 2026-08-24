import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="tech-panel w-full max-w-lg rounded-[28px] p-7 md:p-9">
        <Logo />
        <SearchX className="mt-8 size-8 text-cyan-300/70" />
        <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">404 / Not Found</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Không tìm thấy trang</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Đường dẫn có thể đã thay đổi hoặc không thuộc Project Workspace hiện tại.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-semibold text-[#07111f]">
          <ArrowLeft className="size-4" /> Về Dashboard
        </Link>
      </section>
    </main>
  );
}
