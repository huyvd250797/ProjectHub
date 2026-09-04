import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDashed,
  Code2,
  Crown,
  Database,
  FileSpreadsheet,
  FolderOpen,
  ClipboardCheck,
  GitBranch,
  Map,
  Layers3,
  ServerCog,
  Network,
  MonitorCog,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isMasterUser } from "@/lib/access";
import { googleDriveReady } from "@/lib/documents/google-drive";

export const metadata = { title: "Thiết lập" };

export default async function SettingsPage() {
  const supabaseReady = isSupabaseConfigured();
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const master = Boolean(supabase && user && await isMasterUser(supabase, user.id));
  const driveReady = googleDriveReady();

  const checks = [
    { label: "Next.js App Router", text: "Framework nền tảng", ok: true, icon: Code2 },
    { label: "Vercel deployment", text: "Output Directory để Default", ok: true, icon: GitBranch },
    { label: "Supabase connection", text: supabaseReady ? "Environment đã nhận" : "Đang chạy Demo Mode", ok: supabaseReady, icon: Database },
    { label: "Multi-project schema", text: "projects + project_members + project_id", ok: true, icon: Layers3 },
    { label: "Master Access", text: master ? "Global MASTER • mọi Project" : "Project-scoped user", ok: master, icon: Crown },
    { label: "Auth / RLS", text: "MASTER global + project_members cho user thường", ok: supabaseReady, icon: ShieldCheck },
    { label: "PLHĐ Unified View", text: "Overview + virtualized detail tree", ok: true, icon: Network },
    { label: "Department Intelligence", text: "KPI + Stakeholder + Module + drill-down", ok: true, icon: Building2 },
    { label: "Remote Server Security", text: "AES-256-GCM + Reveal/Copy permission + Audit", ok: true, icon: ServerCog },
    { label: "Hardening + UAT", text: "Readiness checks + Regression checklist + Security headers", ok: true, icon: ClipboardCheck },
    { label: "Notifications & Activity", text: "Bell inbox + Activity Feed + Due Reminder + Preferences", ok: true, icon: Activity },
    { label: "Project Documents", text: driveReady ? "Google Drive OAuth + private proxy" : "Cần cấu hình Google Drive OAuth", ok: driveReady, icon: FolderOpen },
    { label: "Master Plan", text: "Stage Từ ngày–Đến ngày + Timeline + Milestones", ok: true, icon: Map },
  ];

  return (
    <>
      <PageHeader
        eyebrow="System Foundation"
        title="Thiết lập Project Workspace"
        description="ASC WORKING V2.1.0 bổ sung Auto Generate Plan: nhập ngày bắt đầu/kết thúc để app tự đề xuất stage, số ngày và milestone."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="tech-panel rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                  <Icon className="size-4 text-cyan-300/65" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{item.text}</div>
                </div>
                {item.ok ? (
                  <CheckCircle2 className="ml-auto size-4 text-emerald-300/65" />
                ) : (
                  <CircleDashed className="ml-auto size-4 text-amber-300/50" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {master ? (
        <Link
          href="/settings/projects"
          className="tech-panel tech-panel-hover mt-4 flex flex-col gap-4 rounded-2xl border-amber-300/10 p-5 md:flex-row md:items-center md:p-6"
        >
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.055]">
            <Crown className="size-5 text-amber-200/80" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/60">MASTER Tool</div>
            <div className="mt-1 text-sm font-semibold text-slate-200">Master Project Console</div>
            <div className="mt-1 text-xs leading-5 text-slate-600">Tạo Project, cập nhật hồ sơ trường/đơn vị, hợp đồng, kế hoạch, đầu mối và gán Admin/PM/Member/Viewer cho user thường.</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-200/80 md:ml-auto">
            Quản trị toàn hệ thống <ArrowRight className="size-4" />
          </div>
        </Link>
      ) : null}

      <Link
        href="/settings/uat"
        className="tech-panel tech-panel-hover mt-4 flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:p-6"
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055]">
          <ClipboardCheck className="size-5 text-cyan-200/80" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60">Production Tool</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">Hardening & UAT Center</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">Chạy automated readiness, kiểm tra RLS/schema/security environment, Command Center, Portfolio, Catalog Delete, Auto Generate Plan và regression testcase cho V2.1.0.</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-200/80 md:ml-auto">
          Mở UAT Center <ArrowRight className="size-4" />
        </div>
      </Link>

      <Link
        href="/settings/import"
        className="tech-panel tech-panel-hover mt-4 flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:p-6"
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.055]">
          <FileSpreadsheet className="size-5 text-amber-200/80" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/60">Data Tool</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">Excel Import Production</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">Tải mẫu Excel theo Project, điền dữ liệu, Preview insert/update rồi Apply Import transaction vào Supabase.</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-200/80 md:ml-auto">
          Mở Excel Import <ArrowRight className="size-4" />
        </div>
      </Link>

      <Link
        href="/activity"
        className="tech-panel tech-panel-hover mt-4 flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:p-6"
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055]">
          <Activity className="size-5 text-cyan-200/80" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60">Operations Center</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">Issue Validation / Flexible Team / Performance</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">Xem Activity Feed của Project, ISSUE được giao, nhắc Due Date, trạng thái đã đọc và cấu hình loại thông báo theo từng user.</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-200/80 md:ml-auto">
          Mở Activity Center <ArrowRight className="size-4" />
        </div>
      </Link>

      <Link
        href="/settings/system"
        className="tech-panel tech-panel-hover mt-4 flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:p-6"
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.055]">
          <MonitorCog className="size-5 text-emerald-200/80" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/60">Production Runtime</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">System Information</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">Xem version, environment, Supabase, Auth/RLS, MASTER access, Service Role, Encryption và trạng thái các năng lực production.</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-200/80 md:ml-auto">
          Xem System Info <ArrowRight className="size-4" />
        </div>
      </Link>

      <div className="tech-panel mt-4 rounded-2xl p-5 md:p-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Release</div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-white">ASC WORKING V2.1.0</div>
            <div className="mt-1 text-xs text-slate-500">Auto Generate Plan</div>
          </div>
          <span className="w-fit rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
            Production Ready
          </span>
        </div>
      </div>
    </>
  );
}
