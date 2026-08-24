import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    app: "ASC WORKING",
    workspace: "Project Workspace",
    version: "0.9.0",
    status: "ok",
    supabaseConfigured: isSupabaseConfigured(),
    features: ["multi-project-schema", "project-switcher", "import-dry-run", "supabase-rls-foundation", "real-project-dashboard", "dashboard-rpc", "contract-unified-view", "contract-detail-virtualization", "issue-core", "issue-bulk-update", "issue-saved-views", "issue-column-preferences", "issue-export", "remote-server-security", "security-headers", "readiness-checks", "uat-center", "resource-access-batch"],
  });
}
