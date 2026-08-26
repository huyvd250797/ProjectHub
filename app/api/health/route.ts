import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    app: "ASC WORKING",
    workspace: "Project Workspace",
    version: "1.3.0",
    release: "Executive Report & Project Summary",
    status: "ok",
    supabaseConfigured: isSupabaseConfigured(),
    features: ["multi-project-schema", "project-switcher", "import-dry-run", "supabase-rls-foundation", "real-project-dashboard", "dashboard-rpc", "contract-unified-view", "contract-detail-virtualization", "issue-core", "issue-bulk-update", "issue-saved-views", "issue-column-preferences", "issue-export", "remote-server-security", "security-headers", "readiness-checks", "uat-center", "resource-access-batch", "master-global-role", "master-project-console", "multi-project-master-access", "project-team-assignee-sync", "searchable-combobox", "sticky-issue-grid", "light-dark-theme", "system-information", "production-release", "notifications-center", "activity-feed", "notification-preferences", "issue-due-reminders", "advanced-analytics", "project-health-score", "backlog-aging", "risk-ranking", "issue-page-size-all", "executive-report", "project-summary", "report-snapshots", "pm-notes", "issue-fullscreen"],
  });
}
