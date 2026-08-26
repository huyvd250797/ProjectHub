import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const pass = (label, detail = "") => checks.push({ ok: true, label, detail });
const fail = (label, detail = "") => checks.push({ ok: false, label, detail });
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
pkg.version === "1.1.3" ? pass("Package version", "1.1.3") : fail("Package version", `Expected 1.1.3, got ${pkg.version}`);

for (const rel of [
  "app/api/readiness/route.ts",
  "app/(workspace)/settings/uat/page.tsx",
  "app/(workspace)/settings/projects/page.tsx",
  "app/api/master/projects/route.ts",
  "app/api/master/projects/[projectId]/route.ts",
  "components/master/master-project-console.tsx",
  "components/ui/themed-select.tsx",
  "components/ui/floating-select.tsx",
  "components/issues/issue-workspace.tsx",
  "docs/V0.9.5-SCOPE.md",
  "docs/V1.0.0-SCOPE.md",
  "docs/V1.0.1-SCOPE.md",
  "docs/V1.1.0-SCOPE.md",
  "docs/V1.1.1-SCOPE.md",
  "docs/V1.1.1-SETUP.md",
  "docs/V1.1.3-ISSUE-DELETE.md",
  "docs/UAT_V1111_CHECKLIST.md",
  "supabase/migrations/202608260001_v1111_team_validation_performance.sql",
  "docs/NOTIFICATIONS_ACTIVITY_V110_SETUP.md",
  "docs/UAT_V110_NOTIFICATIONS_CHECKLIST.md",
  "components/notifications/notification-center.tsx",
  "components/notifications/activity-center.tsx",
  "app/(workspace)/activity/page.tsx",
  "app/api/notifications/route.ts",
  "app/api/notifications/preferences/route.ts",
  "app/api/activity/route.ts",
  "lib/notifications/types.ts",
  "lib/notifications/server.ts",
  "supabase/migrations/202608250001_v110_notifications_activity.sql",
  "docs/DARK_MODE_V101.md",
  "docs/PRODUCTION_V100_RELEASE.md",
  "docs/PRODUCTION_CHECKLIST_V100.md",
  "docs/BACKUP_RESTORE_ROLLBACK_V100.md",
  "docs/UAT_V100_CHECKLIST.md",
  "components/theme-toggle.tsx",
  "app/(workspace)/settings/system/page.tsx",
  "lib/app-meta.ts",
  "docs/PROJECT_TEAM_V095_SETUP.md",
  "docs/UAT_V095_PROJECT_TEAM_CHECKLIST.md",
  "app/api/master/projects/[projectId]/members/route.ts",
  "lib/issues/server.ts",
  "supabase/migrations/202608240006_v095_project_members_assignees.sql",
  "docs/UAT_V094_GRID_UX_CHECKLIST.md",
  "supabase/migrations/202608240002_v090_hardening.sql",
  "supabase/migrations/202608240003_v091_master_multi_project.sql",
  "supabase/migrations/202608240004_v092_excel_import_production.sql",
  "supabase/migrations/202608240005_v093_project_profile.sql",
  "supabase/promote-master.sql",
  "app/api/import/template/route.ts",
  "app/api/import/apply/route.ts",
  "lib/import/canonical.ts",
  "docs/PROJECT_PROFILE_V093_SETUP.md",
  "docs/UAT_V093_PROJECT_PROFILE_CHECKLIST.md",
  "docs/EXCEL_IMPORT_V092_SETUP.md",
  "docs/UAT_V092_IMPORT_CHECKLIST.md",
]) {
  exists(rel) ? pass(`Required file: ${rel}`) : fail(`Required file: ${rel}`);
}

for (const rel of [".env.local", "tsconfig.tsbuildinfo"]) {
  !exists(rel) ? pass(`Not packaged: ${rel}`) : fail(`Sensitive/cache file must not be packaged: ${rel}`);
}

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "APP_ENCRYPTION_KEY"]) {
  envExample.includes(name) ? pass(`Environment contract: ${name}`) : fail(`Environment contract: ${name}`);
}

const masterConsole = fs.readFileSync(path.join(root, "components/master/master-project-console.tsx"), "utf8");
for (const token of ["organizationName", "organizationAddress", "contractValue", "contactName", "Hồ sơ dự án"]) {
  masterConsole.includes(token) ? pass(`Project Profile UI: ${token}`) : fail(`Project Profile UI: ${token}`);
}

const themedSelect = fs.readFileSync(path.join(root, "components/ui/themed-select.tsx"), "utf8");
for (const token of ["Nhập để tìm kiếm...", "normalizeSearchText", "filteredOptions"]) {
  themedSelect.includes(token) ? pass(`Searchable ThemedSelect: ${token}`) : fail(`Searchable ThemedSelect: ${token}`);
}

const floatingSelect = fs.readFileSync(path.join(root, "components/ui/floating-select.tsx"), "utf8");
for (const token of ["Nhập để tìm kiếm...", "normalizeSearchText", "filteredOptions"]) {
  floatingSelect.includes(token) ? pass(`Searchable FloatingSelect: ${token}`) : fail(`Searchable FloatingSelect: ${token}`);
}

const issueWorkspace = fs.readFileSync(path.join(root, "components/issues/issue-workspace.tsx"), "utf8");
for (const token of ["max-h-[calc(100vh-150px)]", "sticky left-0 top-0 z-50", "sticky top-0 z-30"]) {
  issueWorkspace.includes(token) ? pass(`Sticky ISSUE grid: ${token}`) : fail(`Sticky ISSUE grid: ${token}`);
}


const memberPanel = fs.readFileSync(path.join(root, "components/master/master-project-console.tsx"), "utf8");
for (const token of ["Họ tên", "Email đăng nhập (không bắt buộc)", "Nhân sự nội bộ", "fullName", "editingMemberId"]) {
  memberPanel.includes(token) ? pass(`Project Member / Assignee: ${token}`) : fail(`Project Member / Assignee: ${token}`);
}

const issueServer = fs.readFileSync(path.join(root, "lib/issues/server.ts"), "utf8");
for (const token of ["is_active", "Chưa có tài khoản", "assignees", "assigneeValid"]) {
  issueServer.includes(token) ? pass(`Assignee source guard: ${token}`) : fail(`Assignee source guard: ${token}`);
}


const themeToggle = fs.readFileSync(path.join(root, "components/theme-toggle.tsx"), "utf8");
for (const token of ["asc-working-theme", "Moon", "Sun", "localStorage"]) {
  themeToggle.includes(token) ? pass(`Theme toggle: ${token}`) : fail(`Theme toggle: ${token}`);
}

const globalCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
for (const token of ['data-theme="light"', "theme-toggle", "--bg: #f4f7fb"]) {
  globalCss.includes(token) ? pass(`Light theme CSS: ${token}`) : fail(`Light theme CSS: ${token}`);
}

for (const token of ['ASC WORKING V1.0.1 — Dark Mode Contrast', '--bg: #0b1422', '.text-slate-600 { color: #768da5', 'border-color: rgba(158, 184, 210, 0.18)']) {
  globalCss.includes(token) ? pass(`Dark contrast CSS: ${token}`) : fail(`Dark contrast CSS: ${token}`);
}

const notificationCenter = fs.readFileSync(path.join(root, "components/notifications/notification-center.tsx"), "utf8");
for (const token of ["unreadCount", "mark_all_read", "Activity Center", "90000", "visibilitychange"]) {
  notificationCenter.includes(token) ? pass(`Notification Center: ${token}`) : fail(`Notification Center: ${token}`);
}

const activityCenter = fs.readFileSync(path.join(root, "components/notifications/activity-center.tsx"), "utf8");
for (const token of ["Notifications & Activity Center", "Cài đặt thông báo", "Due Reminder", "/api/activity"]) {
  activityCenter.includes(token) ? pass(`Activity Center: ${token}`) : fail(`Activity Center: ${token}`);
}

const notificationMigration = fs.readFileSync(path.join(root, "supabase/migrations/202608250001_v110_notifications_activity.sql"), "utf8");
for (const token of ["activity_events", "notifications", "notification_preferences", "sync_issue_due_notifications_v110", "capture_issue_activity_v110"]) {
  notificationMigration.includes(token) ? pass(`V1.1.0 migration: ${token}`) : fail(`V1.1.0 migration: ${token}`);
}

const systemInfo = fs.readFileSync(path.join(root, "app/(workspace)/settings/system/page.tsx"), "utf8");
for (const token of ["System Information", "SUPABASE_SERVICE_ROLE_KEY", "APP_ENCRYPTION_KEY", "V1.1.1"]) {
  systemInfo.includes(token) ? pass(`System Information: ${token}`) : fail(`System Information: ${token}`);
}

const v1111Migration = fs.readFileSync(path.join(root, "supabase/migrations/202608260001_v1111_team_validation_performance.sql"), "utf8");
for (const token of ["people_project_team_active_idx", "get_issue_summary_v1111", "get_issue_lookups_v1111", "pg_trgm"]) {
  v1111Migration.includes(token) ? pass(`V1.1.1 migration: ${token}`) : fail(`V1.1.1 migration: ${token}`);
}

const issueDrawer = fs.readFileSync(path.join(root, "components/issues/issue-drawer.tsx"), "utf8");
for (const token of ["validateBeforeSave", "FieldError", "Chưa thể", "fieldErrors"]) {
  issueDrawer.includes(token) ? pass(`Issue validation UX: ${token}`) : fail(`Issue validation UX: ${token}`);
}

const issueDrawerV113 = fs.readFileSync(path.join(root, "components/issues/issue-drawer.tsx"), "utf8");
for (const token of ["Xóa ISSUE", "Trash2", "method: \"DELETE\""]) {
  issueDrawerV113.includes(token) ? pass(`ISSUE delete drawer: ${token}`) : fail(`ISSUE delete drawer: ${token}`);
}

const issueWorkspaceV113 = fs.readFileSync(path.join(root, "components/issues/issue-workspace.tsx"), "utf8");
for (const token of ["deleteSelectedIssues", "Xóa", "method: \"DELETE\""]) {
  issueWorkspaceV113.includes(token) ? pass(`ISSUE bulk delete: ${token}`) : fail(`ISSUE bulk delete: ${token}`);
}

const issueBulkV113 = fs.readFileSync(path.join(root, "app/api/issues/bulk/route.ts"), "utf8");
for (const token of ["export async function DELETE", "archived_at", "BULK_DELETE_FAILED"]) {
  issueBulkV113.includes(token) ? pass(`ISSUE bulk delete API: ${token}`) : fail(`ISSUE bulk delete API: ${token}`);
}

console.log("\nASC WORKING V1.1.3 - ISSUE Delete / CRUD Completion Preflight\n");
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
const failures = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
