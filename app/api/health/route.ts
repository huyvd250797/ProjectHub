import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    app: "ASC WORKING",
    workspace: "Project Workspace",
    version: "2.2.1",
    release: "PLHĐ Grid UX & Jira Code Display",
    status: "ok",
    supabaseConfigured: isSupabaseConfigured(),
    features: ["multi-project-schema", "project-switcher", "import-dry-run", "supabase-rls-foundation", "real-project-dashboard", "dashboard-rpc", "contract-unified-view", "contract-detail-virtualization", "issue-core", "issue-bulk-update", "issue-saved-views", "issue-column-preferences", "issue-export", "remote-server-security", "security-headers", "readiness-checks", "uat-center", "resource-access-batch", "master-global-role", "master-project-console", "multi-project-master-access", "project-team-assignee-sync", "searchable-combobox", "sticky-issue-grid", "light-dark-theme", "system-information", "production-release", "notifications-center", "activity-feed", "notification-preferences", "issue-due-reminders", "advanced-analytics", "project-health-score", "backlog-aging", "risk-ranking", "issue-page-size-all", "executive-report", "project-summary", "report-snapshots", "pm-notes", "issue-fullscreen", "project-master-data", "department-catalog", "plhd-module-catalog", "wide-modal-forms", "bulk-master-data-import", "quick-excel-template", "stable-master-import-keys", "project-documents", "google-drive-resumable-upload", "private-file-proxy", "issue-tag-colors", "issue-header-drag-drop", "issue-filter-visibility", "workspace-navigation-order", "master-plan", "project-stage-planning", "gantt-timeline", "project-milestones", "automatic-stage-scheduling", "manual-stage-date-ranges", "stage-date-lock", "plan-execution-tasks", "milestone-checklists", "execution-dashboard", "blocked-task-alerts", "smart-plan-alerts", "plan-reminders", "reminder-snooze", "plan-reminder-notifications", "portfolio-dashboard", "cross-project-health-ranking", "cross-project-priority-board", "catalog-hard-delete", "catalog-bulk-delete", "plhd-catalog-source-of-truth", "plhd-detail-catalog", "project-command-center", "command-action-board", "command-risk-radar", "navbar-double-click-reload", "navbar-display-labels", "auto-generate-plan", "auto-generated-stages", "auto-generated-milestones", "single-plhd-tab", "plhd-function-tree", "inline-module-status", "project-hard-delete", "plhd-resizable-columns", "plhd-draggable-columns", "plhd-wrapped-tree-rows", "jira-code-display"],
  });
}
