import {
  BarChart3,
  Bell,
  CheckCircle2,
  CircleDashed,
  Cloud,
  Crown,
  Database,
  FileSpreadsheet,
  FileText,
  KeyRound,
  MonitorCog,
  Palette,
  ServerCog,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isMasterUser } from "@/lib/access";
import { APP_NAME, APP_RELEASE, APP_VERSION_LABEL } from "@/lib/app-meta";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "System Information" };

function readyEncryption() {
  const key = process.env.APP_ENCRYPTION_KEY?.trim();
  return Boolean(key && key.length >= 24);
}

export default async function SystemInformationPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const master = Boolean(supabase && user && await isMasterUser(supabase, user.id));
  const serviceRoleReady = Boolean(createServiceClient());
  const encryptionReady = readyEncryption();

  let databaseReady = false;
  let databaseDetail = configured ? "Chưa xác nhận query database." : "Supabase chưa được cấu hình.";
  if (supabase && user) {
    const result = await supabase.from("projects").select("id", { count: "exact", head: true });
    databaseReady = !result.error;
    databaseDetail = result.error
      ? `Database/RLS query lỗi: ${result.error.message}`
      : `Database connected • ${result.count ?? 0} Project nhìn thấy theo RLS.`;
  }

  let notificationsReady = false;
  let notificationsDetail = configured ? "Chưa xác nhận migration Notifications V1.1.0." : "Supabase chưa được cấu hình.";
  if (supabase && user) {
    const result = await supabase.from("activity_events").select("id", { count: "exact", head: true });
    notificationsReady = !result.error;
    notificationsDetail = result.error ? "Chưa có schema Notifications & Activity V1.1.0." : "Bell Inbox + Activity Feed + Preferences đã sẵn sàng.";
  }

  let analyticsReady = false;
  let analyticsDetail = configured ? "Chưa xác nhận migration Analytics V1.2.0." : "Supabase chưa được cấu hình.";
  if (supabase && user) {
    const projectResult = await supabase.from("projects").select("id").limit(1).maybeSingle();
    if (projectResult.data?.id) {
      const result = await supabase.rpc("get_project_analytics_v120", {
        p_project_id: projectResult.data.id,
        p_from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
        p_to: new Date().toISOString().slice(0, 10),
      });
      analyticsReady = !result.error;
      analyticsDetail = result.error ? "Cần migration 202608260002_v120_analytics_health.sql." : "Project Health + trends + risk ranking đã sẵn sàng.";
    } else {
      analyticsDetail = "Chưa có Project để chạy health check.";
    }
  }

  let reportsReady = false;
  let reportsDetail = configured ? "Chưa xác nhận migration Executive Report V1.3.0." : "Supabase chưa được cấu hình.";
  if (supabase && user) {
    const result = await supabase.from("report_snapshots").select("id", { count: "exact", head: true });
    reportsReady = !result.error;
    reportsDetail = result.error ? "Cần migration 202608260003_v130_executive_reports.sql." : "Executive Report snapshots + PM notes đã sẵn sàng.";
  }

  let teamPerformanceReady = false;
  let teamPerformanceDetail = configured ? "Chưa xác nhận migration V1.1.1." : "Supabase chưa được cấu hình.";
  if (supabase && user) {
    const [teamCheck, summaryCheck] = await Promise.all([
      supabase.from("people").select("id,is_active", { count: "exact", head: true }).eq("person_type", "asc"),
      supabase.rpc("get_issue_summary_v1111", { p_project_id: "00000000-0000-0000-0000-000000000000", p_person_id: null }),
    ]);
    teamPerformanceReady = !teamCheck.error && !summaryCheck.error;
    teamPerformanceDetail = teamPerformanceReady
      ? "Flexible Project Team + ISSUE summary RPC đã sẵn sàng."
      : "Cần migration 202608260001_v1111_team_validation_performance.sql.";
  }

  const environment = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV.toUpperCase()
    : process.env.NODE_ENV === "production"
      ? "PRODUCTION"
      : "LOCAL";

  const items = [
    { label: "Application", value: `${APP_NAME} ${APP_VERSION_LABEL}`, detail: APP_RELEASE, ok: true, icon: MonitorCog },
    { label: "Environment", value: environment, detail: process.env.VERCEL ? "Vercel Runtime" : "Local / Custom Runtime", ok: true, icon: Cloud },
    { label: "Supabase", value: configured ? "Configured" : "Demo Mode", detail: configured ? "URL + Publishable Key đã nhận." : "Chưa có environment Supabase.", ok: configured, icon: Database },
    { label: "Authentication", value: user ? "Authenticated" : "Not authenticated", detail: user?.email ?? "Chưa xác nhận session.", ok: Boolean(user), icon: UserCheck },
    { label: "Database / RLS", value: databaseReady ? "Connected" : "Attention", detail: databaseDetail, ok: databaseReady, icon: ShieldCheck },
    { label: "MASTER Access", value: master ? "Ready" : "Project-scoped", detail: master ? "Global access trên mọi Project." : "Quyền theo project_members.", ok: master, icon: Crown },
    { label: "Service Role", value: serviceRoleReady ? "Ready" : "Missing", detail: "SUPABASE_SERVICE_ROLE_KEY • server-only", ok: serviceRoleReady, icon: KeyRound },
    { label: "Encryption", value: encryptionReady ? "Ready" : "Missing", detail: "APP_ENCRYPTION_KEY • AES-256-GCM Resource Vault", ok: encryptionReady, icon: ServerCog },
    { label: "Excel Import", value: "Production", detail: "Template → Preview → Transaction Apply", ok: configured, icon: FileSpreadsheet },
    { label: "Appearance", value: "Dark / Light", detail: "Preference lưu trên browser; mặc định theo system theme.", ok: true, icon: Palette },
    { label: "Analytics / Health", value: analyticsReady ? "Ready" : "Migration required", detail: analyticsDetail, ok: analyticsReady, icon: BarChart3 },
    { label: "Executive Reports", value: reportsReady ? "Ready" : "Migration required", detail: reportsDetail, ok: reportsReady, icon: FileText },
    { label: "Team / Performance", value: teamPerformanceReady ? "Ready" : "Migration required", detail: teamPerformanceDetail, ok: teamPerformanceReady, icon: UsersRound },
    { label: "Notifications", value: notificationsReady ? "Ready" : "Migration required", detail: notificationsDetail, ok: notificationsReady, icon: Bell },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Production Runtime"
        title="System Information"
        description={`Thông tin release và các điều kiện runtime quan trọng của ASC WORKING ${APP_VERSION_LABEL}. Màn hình này không hiển thị giá trị secret, chỉ xác nhận trạng thái cấu hình.`}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="tech-panel rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                  <Icon className="size-4 text-cyan-300/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-200">{item.value}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</div>
                </div>
                {item.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-300/70" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-amber-300/65" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="tech-panel mt-4 rounded-2xl p-5 md:p-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Production baseline</div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
            <div className="text-slate-600">App release</div>
            <div className="mt-2 font-semibold text-slate-200">{APP_VERSION_LABEL}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
            <div className="text-slate-600">Schema baseline</div>
            <div className="mt-2 font-semibold text-slate-200">Through V1.3.0 migration</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
            <div className="text-slate-600">Deploy target</div>
            <div className="mt-2 font-semibold text-slate-200">Vercel / Next.js</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
            <div className="text-slate-600">Database</div>
            <div className="mt-2 font-semibold text-slate-200">Supabase PostgreSQL</div>
          </div>
        </div>
      </div>
    </>
  );
}
