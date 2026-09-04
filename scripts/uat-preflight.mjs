import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const pass = (label, detail = "") => checks.push({ ok: true, label, detail });
const fail = (label, detail = "") => checks.push({ ok: false, label, detail });
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
pkg.version === "1.9.2" ? pass("Package version", "1.9.2") : fail("Package version", `Expected 1.9.2, got ${pkg.version}`);

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
  "app/(workspace)/analytics/page.tsx",
  "app/api/analytics/route.ts",
  "components/analytics/project-analytics.tsx",
  "lib/analytics-types.ts",
  "lib/analytics/demo.ts",
  "supabase/migrations/202608260002_v120_analytics_health.sql",
  "docs/V1.2.0-SCOPE.md",
  "docs/ANALYTICS_V120_SETUP.md",
  "docs/UAT_V120_ANALYTICS_CHECKLIST.md",
  "app/(workspace)/reports/page.tsx",
  "app/api/reports/route.ts",
  "components/reports/executive-report.tsx",
  "lib/reports/types.ts",
  "supabase/migrations/202608260003_v130_executive_reports.sql",
  "docs/V1.3.0-SCOPE.md",
  "docs/EXECUTIVE_REPORT_V130_SETUP.md",
  "docs/UAT_V130_EXECUTIVE_REPORT_CHECKLIST.md",
  "app/api/project-catalog/route.ts",
  "components/catalog/project-master-data-modal.tsx",
  "lib/catalog/types.ts",
  "docs/V1.3.1-SCOPE.md",
  "docs/UAT_V131_PROJECT_MASTER_DATA_CHECKLIST.md",
  "lib/catalog/quick-import-types.ts",
  "lib/catalog/quick-import-server.ts",
  "components/catalog/quick-import-modal.tsx",
  "app/api/project-catalog/import/template/route.ts",
  "app/api/project-catalog/import/preview/route.ts",
  "app/api/project-catalog/import/apply/route.ts",
  "supabase/migrations/202608260004_v132_bulk_master_data_import.sql",
  "docs/V1.3.2-SCOPE.md",
  "docs/V1.3.2-DIRECT-EXCEL-IMPORT.md",
  "docs/V1.3.2-VALIDATION.md",
  "docs/UAT_V132_BULK_IMPORT_CHECKLIST.md",
  "app/(workspace)/documents/page.tsx",
  "components/documents/project-documents.tsx",
  "app/api/documents/route.ts",
  "app/api/documents/upload-session/route.ts",
  "app/api/documents/complete/route.ts",
  "app/api/documents/[documentId]/route.ts",
  "app/api/documents/[documentId]/content/route.ts",
  "lib/documents/google-drive.ts",
  "lib/documents/server.ts",
  "lib/documents/types.ts",
  "supabase/migrations/202608270001_v140_google_drive_documents.sql",
  "scripts/google-drive-oauth.mjs",
  "docs/V1.4.0-SCOPE.md",
  "docs/GOOGLE_DRIVE_V140_SETUP.md",
  "docs/UAT_V140_PROJECT_DOCUMENTS_CHECKLIST.md",
  "docs/V1.4.0-VALIDATION.md",
  "components/issues/tag-style-manager.tsx",
  "components/navigation-order-manager.tsx",
  "app/api/workspace/preferences/route.ts",
  "lib/workspace-preferences.ts",
  "supabase/migrations/202608270002_v150_issue_workspace_personalization.sql",
  "docs/V1.5.0-SCOPE.md",
  "docs/UAT_V150_ISSUE_PERSONALIZATION_CHECKLIST.md",
  "docs/V1.5.0-VALIDATION.md",
  "app/(workspace)/plan/page.tsx",
  "components/planning/plan-workspace.tsx",
  "components/planning/plan-timeline.tsx",
  "components/planning/plan-modals.tsx",
  "app/api/plan/route.ts",
  "app/api/plan/recalculate/route.ts",
  "app/api/plan/stages/route.ts",
  "app/api/plan/stages/[stageId]/route.ts",
  "app/api/plan/milestones/route.ts",
  "app/api/plan/milestones/[milestoneId]/route.ts",
  "lib/planning/types.ts",
  "lib/planning/server.ts",
  "lib/planning/schedule.ts",
  "lib/planning/validation.ts",
  "lib/planning/demo.ts",
  "supabase/migrations/202609030001_v160_master_plan_project_stages.sql",
  "docs/V1.6.0-SCOPE.md",
  "docs/MASTER_PLAN_V160_SETUP.md",
  "docs/UAT_V160_MASTER_PLAN_CHECKLIST.md",
  "docs/V1.6.0-VALIDATION.md",
  "supabase/migrations/202609030002_v161_stage_date_range.sql",
  "docs/V1.6.1-SCOPE.md",
  "docs/STAGE_DATE_RANGE_V161_SETUP.md",
  "docs/UAT_V161_STAGE_DATE_RANGE_CHECKLIST.md",
  "docs/V1.6.1-VALIDATION.md",
  "app/api/plan/tasks/route.ts",
  "app/api/plan/tasks/[taskId]/route.ts",
  "app/api/plan/checklist/route.ts",
  "app/api/plan/checklist/[itemId]/route.ts",
  "supabase/migrations/202609030003_v170_plan_execution_tracking.sql",
  "docs/V1.9.0-SCOPE.md",
  "docs/PLAN_EXECUTION_TRACKING_V170_SETUP.md",
  "docs/UAT_V170_PLAN_EXECUTION_TRACKING_CHECKLIST.md",
  "app/api/plan/reminders/route.ts",
  "app/api/plan/reminders/[reminderId]/route.ts",
  "supabase/migrations/202609030004_v180_smart_reminders_alerts.sql",
  "docs/SMART_REMINDERS_ALERTS_V180_SETUP.md",
  "docs/UAT_V180_SMART_REMINDERS_ALERTS_CHECKLIST.md",
  "app/(workspace)/portfolio/page.tsx",
  "app/api/portfolio/route.ts",
  "components/portfolio/portfolio-dashboard.tsx",
  "lib/portfolio/types.ts",
  "lib/portfolio/demo.ts",
  "supabase/migrations/202609040001_v190_portfolio_catalog_delete_notes.sql",
  "docs/UAT_V190_PORTFOLIO_CATALOG_DELETE_CHECKLIST.md",
  "docs/V1.9.0-VALIDATION.md",
  "supabase/migrations/202609040002_v192_catalog_source_of_truth.sql",
  "docs/V1.9.2-SCOPE.md",
  "docs/V1.9.2-VALIDATION.md",
]) {
  exists(rel) ? pass(`Required file: ${rel}`) : fail(`Required file: ${rel}`);
}

for (const rel of [".env.local"]) {
  !exists(rel) ? pass(`Not packaged: ${rel}`) : fail(`Sensitive/cache file must not be packaged: ${rel}`);
}

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "APP_ENCRYPTION_KEY", "GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_FOLDER_ID"]) {
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
for (const token of ["System Information", "SUPABASE_SERVICE_ROLE_KEY", "APP_ENCRYPTION_KEY", "Analytics / Health"]) {
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


const analyticsComponent = fs.readFileSync(path.join(root, "components/analytics/project-analytics.tsx"), "utf8");
for (const token of ["Advanced Analytics & Project Health", "Project Health Score", "Backlog Aging", "Top Module rủi ro", "Export"]) {
  analyticsComponent.includes(token) ? pass(`V1.2.0 Analytics UI: ${token}`) : fail(`V1.2.0 Analytics UI: ${token}`);
}

const analyticsMigration = fs.readFileSync(path.join(root, "supabase/migrations/202608260002_v120_analytics_health.sql"), "utf8");
for (const token of ["get_project_analytics_v120", "issue_user_preferences_page_size_check", "500,1000,0", "aging as", "risk_score"]) {
  analyticsMigration.includes(token) ? pass(`V1.2.0 migration: ${token}`) : fail(`V1.2.0 migration: ${token}`);
}

const dashboardV120 = fs.readFileSync(path.join(root, "components/dashboard/project-dashboard.tsx"), "utf8");
for (const token of ["asc-working-show-project-money", "Ẩn số tiền dự án", "Hiện số tiền dự án"]) {
  dashboardV120.includes(token) ? pass(`Project money visibility: ${token}`) : fail(`Project money visibility: ${token}`);
}
const issueWorkspaceV120 = fs.readFileSync(path.join(root, "components/issues/issue-workspace.tsx"), "utf8");
for (const token of ["500 dòng", "1000 dòng", "ALL", "Số dòng ISSUE hiển thị"]) {
  issueWorkspaceV120.includes(token) ? pass(`ISSUE page size: ${token}`) : fail(`ISSUE page size: ${token}`);
}


const executiveReport = fs.readFileSync(path.join(root, "components/reports/executive-report.tsx"), "utf8");
for (const token of ["Executive Report", "PM Comment", "Kế hoạch tiếp theo", "Lưu Snapshot", "In / PDF"]) {
  executiveReport.includes(token) ? pass(`V1.3.0 Executive Report: ${token}`) : fail(`V1.3.0 Executive Report: ${token}`);
}

const reportMigration = fs.readFileSync(path.join(root, "supabase/migrations/202608260003_v130_executive_reports.sql"), "utf8");
for (const token of ["report_snapshots", "report_snapshots_select_project_member", "capture_report_snapshot_activity_v130"]) {
  reportMigration.includes(token) ? pass(`V1.3.0 report migration: ${token}`) : fail(`V1.3.0 report migration: ${token}`);
}

for (const token of ["fullScreen", "Full Screen", "Maximize2", "min-h-0 flex-1", "Escape"]) {
  issueWorkspaceV120.includes(token) ? pass(`ISSUE Full Screen: ${token}`) : fail(`ISSUE Full Screen: ${token}`);
}


const catalogApi = fs.readFileSync(path.join(root, "app/api/project-catalog/route.ts"), "utf8");
for (const token of ["departments", "contract_items", "item_type", "normalized_name", "FORBIDDEN_WRITE"]) {
  catalogApi.includes(token) ? pass(`V1.3.1 Project Catalog API: ${token}`) : fail(`V1.3.1 Project Catalog API: ${token}`);
}

const projectCatalogModal = fs.readFileSync(path.join(root, "components/catalog/project-master-data-modal.tsx"), "utf8");
for (const token of ["Project Master Data", "Danh mục Phòng ban", "Chi tiết PLHĐ", "max-w-[1340px]", "asc-working:catalog-changed"]) {
  projectCatalogModal.includes(token) ? pass(`V1.3.1 Project Master Data UI: ${token}`) : fail(`V1.3.1 Project Master Data UI: ${token}`);
}

for (const [rel, tokens] of [
  ["components/issues/issue-drawer.tsx", ["max-w-[1180px]", "xl:grid-cols-4", "Wide Modal"]],
  ["components/master/master-project-console.tsx", ["max-w-[1240px]", "max-w-[1040px]", "Tạo Project mới", "xl:grid-cols-2"]],
  ["components/resources/resource-vault.tsx", ["max-w-[1040px]", "Đóng modal"]],
]) {
  const content = fs.readFileSync(path.join(root, rel), "utf8");
  for (const token of tokens) content.includes(token) ? pass(`V1.3.1 Wide Modal ${rel}: ${token}`) : fail(`V1.3.1 Wide Modal ${rel}: ${token}`);
}



const quickImportLib = fs.readFileSync(path.join(root, "lib/catalog/quick-import-server.ts"), "utf8");
for (const token of ["parseQuickCatalogWorkbook", "loadQuickCatalogReference", "stableKey", "SHEET_ALIASES", "PLHĐ chi tiết", "import_key"]) {
  quickImportLib.includes(token) ? pass(`V1.3.2 Direct Import server: ${token}`) : fail(`V1.3.2 Direct Import server: ${token}`);
}

const quickImportUi = fs.readFileSync(path.join(root, "components/catalog/quick-import-modal.tsx"), "utf8");
for (const token of ["Import Phòng ban", "PLHĐ / Module", "Preview dữ liệu", "Apply Import", "20 MB", "initialSections", "file 3 sheet đơn giản"]) {
  quickImportUi.includes(token) ? pass(`V1.3.2 Direct Import UI: ${token}`) : fail(`V1.3.2 Direct Import UI: ${token}`);
}

const quickPreviewRoute = fs.readFileSync(path.join(root, "app/api/project-catalog/import/preview/route.ts"), "utf8");
for (const token of ["20 * 1024 * 1024", "loadQuickCatalogReference", "preview_quick_master_import_v132", "canWrite", "Preview nhưng chỉ MASTER/Admin/PM", "202608260004_v132_bulk_master_data_import.sql"]) {
  quickPreviewRoute.includes(token) ? pass(`V1.3.2 Quick Preview API: ${token}`) : fail(`V1.3.2 Quick Preview API: ${token}`);
}

const quickApplyRoute = fs.readFileSync(path.join(root, "app/api/project-catalog/import/apply/route.ts"), "utf8");
for (const token of ["loadQuickCatalogReference", "apply_quick_master_import_v132", "sha256ArrayBuffer", 'p_mode: "merge"']) {
  quickApplyRoute.includes(token) ? pass(`V1.3.2 Quick Apply API: ${token}`) : fail(`V1.3.2 Quick Apply API: ${token}`);
}

const quickImportMigration = fs.readFileSync(path.join(root, "supabase/migrations/202608260004_v132_bulk_master_data_import.sql"), "utf8");
for (const token of ["ensure_master_data_import_key_v132", "departments_import_key_v132", "contract_items_import_key_v132", "contract_detail_items_import_key_v132", "preview_quick_master_import_v132", "apply_quick_master_import_v132"]) {
  quickImportMigration.includes(token) ? pass(`V1.3.2 Direct Import migration: ${token}`) : fail(`V1.3.2 Direct Import migration: ${token}`);
}

for (const [rel, tokens] of [
  ["app/(workspace)/departments/page.tsx", ['initialSections={["departments"]}', "Import Phòng ban"]],
  ["app/(workspace)/contract/page.tsx", ['initialSections={["contractItems", "contractDetails"]}', "Import PLHĐ / Chi tiết"]],
]) {
  const content = fs.readFileSync(path.join(root, rel), "utf8");
  for (const token of tokens) content.includes(token) ? pass(`V1.3.2 Import scope ${rel}: ${token}`) : fail(`V1.3.2 Import scope ${rel}: ${token}`);
}

const documentsUi = fs.readFileSync(path.join(root, "components/documents/project-documents.tsx"), "utf8");
for (const token of ["Project Documents", "XMLHttpRequest", "upload.onprogress", "Lưu trữ", "250 MB"]) {
  documentsUi.includes(token) ? pass(`V1.4.0 Documents UI: ${token}`) : fail(`V1.4.0 Documents UI: ${token}`);
}

const driveServer = fs.readFileSync(path.join(root, "lib/documents/google-drive.ts"), "utf8");
for (const token of ["oauth2.googleapis.com/token", "uploadType", "resumable", "appProperties", "GOOGLE_DRIVE_REFRESH_TOKEN"]) {
  driveServer.includes(token) ? pass(`V1.4.0 Google Drive server: ${token}`) : fail(`V1.4.0 Google Drive server: ${token}`);
}

const documentsMigration = fs.readFileSync(path.join(root, "supabase/migrations/202608270001_v140_google_drive_documents.sql"), "utf8");
for (const token of ["project_document_folders", "project_document_upload_sessions", "project_documents", "documents_select_member_v140", "documents_update_pm_v140"]) {
  documentsMigration.includes(token) ? pass(`V1.4.0 Documents migration: ${token}`) : fail(`V1.4.0 Documents migration: ${token}`);
}

const uploadRoute = fs.readFileSync(path.join(root, "app/api/documents/upload-session/route.ts"), "utf8");
for (const token of ["MAX_DOCUMENT_SIZE", "BLOCKED_EXTENSIONS", "createUploadToken", "createResumableUploadSession", "viewer"]) {
  uploadRoute.includes(token) ? pass(`V1.4.0 Upload guard: ${token}`) : fail(`V1.4.0 Upload guard: ${token}`);
}

const issuePersonalization = fs.readFileSync(path.join(root, "components/issues/issue-workspace.tsx"), "utf8");
for (const token of ["TagStyleManager", "filtersVisible", "draggable", "dropColumn", "Màu tag", "Ẩn lọc", "Kéo để đổi vị trí cột"]) {
  issuePersonalization.includes(token) ? pass(`V1.5.0 ISSUE personalization: ${token}`) : fail(`V1.5.0 ISSUE personalization: ${token}`);
}

const tagStyleManager = fs.readFileSync(path.join(root, "components/issues/tag-style-manager.tsx"), "utf8");
for (const token of ["Trạng thái KH", "Phụ trách", "borderColor", "backgroundColor", "color: style.text", "Mặc định nhóm"]) {
  tagStyleManager.includes(token) ? pass(`V1.5.0 Tag colors: ${token}`) : fail(`V1.5.0 Tag colors: ${token}`);
}

const sidebarV150 = fs.readFileSync(path.join(root, "components/sidebar.tsx"), "utf8");
for (const token of ["NavigationOrderManager", "orderedNavigation", "asc-working-nav-order-v150", "/api/workspace/preferences", "Sắp xếp vị trí module"]) {
  sidebarV150.includes(token) ? pass(`V1.5.0 Navbar order: ${token}`) : fail(`V1.5.0 Navbar order: ${token}`);
}

const personalizationMigration = fs.readFileSync(path.join(root, "supabase/migrations/202608270002_v150_issue_workspace_personalization.sql"), "utf8");
for (const token of ["filters_visible", "tag_styles", "workspace_user_preferences", "navigation_order", "auth.uid()"] ) {
  personalizationMigration.includes(token) ? pass(`V1.5.0 personalization migration: ${token}`) : fail(`V1.5.0 personalization migration: ${token}`);
}

const planWorkspace = fs.readFileSync(path.join(root, "components/planning/plan-workspace.tsx"), "utf8");
for (const token of ["Master Plan", "Project Stages", "Timeline", "Milestones", "Tính lại lịch", "Export"]) {
  planWorkspace.includes(token) ? pass(`V1.6.0 Planning workspace: ${token}`) : fail(`V1.6.0 Planning workspace: ${token}`);
}

const planTimeline = fs.readFileSync(path.join(root, "components/planning/plan-timeline.tsx"), "utf8");
for (const token of ["Gantt Timeline", "Milestone độc lập", "Hôm nay", "Target", "stage.progress"]) {
  planTimeline.includes(token) ? pass(`V1.6.0 Gantt timeline: ${token}`) : fail(`V1.6.0 Gantt timeline: ${token}`);
}

const planApi = fs.readFileSync(path.join(root, "app/api/plan/route.ts"), "utf8");
for (const token of ["loadProjectPlan", "parseMasterPlanInput", "recalculateProjectPlan", "V161_MIGRATION_REQUIRED", "Admin hoặc PM"]) {
  planApi.includes(token) ? pass(`V1.6.0 Planning API: ${token}`) : fail(`V1.6.0 Planning API: ${token}`);
}

const planMigration = fs.readFileSync(path.join(root, "supabase/migrations/202609030001_v160_master_plan_project_stages.sql"), "utf8");
for (const token of ["project_master_plans", "project_milestones", "duration_days", "progress", "recalculate_project_plan_v160", "project_master_plans_select_member_v160", "capture_planning_activity_v160"]) {
  planMigration.includes(token) ? pass(`V1.6.0 Planning migration: ${token}`) : fail(`V1.6.0 Planning migration: ${token}`);
}

const navigationV160 = fs.readFileSync(path.join(root, "lib/navigation.ts"), "utf8");
navigationV160.includes('/plan') ? pass("V1.6.0 Planning navigation") : fail("V1.6.0 Planning navigation");

const stageModalV161 = fs.readFileSync(path.join(root, "components/planning/plan-modals.tsx"), "utf8");
for (const token of ["Từ ngày", "Đến ngày", "ProjectStageDateMode", "countScheduleDays", "Nhập Từ ngày – Đến ngày"]) {
  stageModalV161.includes(token) ? pass(`V1.6.1 Stage date UI: ${token}`) : fail(`V1.6.1 Stage date UI: ${token}`);
}

const stageApiV161 = fs.readFileSync(path.join(root, "app/api/plan/stages/[stageId]/route.ts"), "utf8");
for (const token of ["resolveStageDuration", "date_mode", "start_date", "end_date", "V161_MIGRATION_REQUIRED"]) {
  stageApiV161.includes(token) ? pass(`V1.6.1 Stage date API: ${token}`) : fail(`V1.6.1 Stage date API: ${token}`);
}

const stageDateMigrationV161 = fs.readFileSync(path.join(root, "supabase/migrations/202609030002_v161_stage_date_range.sql"), "utf8");
for (const token of ["date_mode", "plan_duration_between_v161", "validate_project_stage_dates_v161", "recalculate_project_plan_v161", "manualStageCount"]) {
  stageDateMigrationV161.includes(token) ? pass(`V1.6.1 Stage date migration: ${token}`) : fail(`V1.6.1 Stage date migration: ${token}`);
}

for (const token of ["Execution Tasks", "MilestoneChecklistBlock", "PlanTaskModal", "executionProgress", "Task Rủi ro"]) {
  planWorkspace.includes(token) ? pass(`V1.9.0 Execution UI: ${token}`) : fail(`V1.9.0 Execution UI: ${token}`);
}

const planTypesV170 = fs.readFileSync(path.join(root, "lib/planning/types.ts"), "utf8");
for (const token of ["ProjectPlanTask", "MilestoneChecklistItem", "PlanTaskStatus", "PlanTaskPriority", "executionProgress"]) {
  planTypesV170.includes(token) ? pass(`V1.9.0 Execution types: ${token}`) : fail(`V1.9.0 Execution types: ${token}`);
}

const planServerV170 = fs.readFileSync(path.join(root, "lib/planning/server.ts"), "utf8");
for (const token of ["normalizePlanTask", "normalizeChecklistItem", "project_plan_tasks", "project_milestone_checklist_items", "nextPlanTaskSortOrder"]) {
  planServerV170.includes(token) ? pass(`V1.9.0 Execution server: ${token}`) : fail(`V1.9.0 Execution server: ${token}`);
}

const taskApiV170 = fs.readFileSync(path.join(root, "app/api/plan/tasks/route.ts"), "utf8");
for (const token of ["parsePlanTaskInput", "project_plan_tasks", "completed_at", "V170_MIGRATION_REQUIRED"]) {
  taskApiV170.includes(token) ? pass(`V1.9.0 Task API: ${token}`) : fail(`V1.9.0 Task API: ${token}`);
}

const checklistApiV170 = fs.readFileSync(path.join(root, "app/api/plan/checklist/route.ts"), "utf8");
for (const token of ["parseMilestoneChecklistInput", "project_milestone_checklist_items", "completed_at", "V170_MIGRATION_REQUIRED"]) {
  checklistApiV170.includes(token) ? pass(`V1.9.0 Checklist API: ${token}`) : fail(`V1.9.0 Checklist API: ${token}`);
}

const executionMigrationV170 = fs.readFileSync(path.join(root, "supabase/migrations/202609030003_v170_plan_execution_tracking.sql"), "utf8");
for (const token of ["project_plan_tasks", "project_milestone_checklist_items", "validate_project_plan_task_v170", "validate_milestone_checklist_v170", "capture_plan_execution_activity_v170"]) {
  executionMigrationV170.includes(token) ? pass(`V1.9.0 Execution migration: ${token}`) : fail(`V1.9.0 Execution migration: ${token}`);
}

for (const token of ["Smart Alerts", "PlanReminderModal", "reminderEditor", "completeReminder", "snoozeReminder", "PLAN REMINDERS"]) {
  planWorkspace.includes(token) ? pass(`V1.9.0 Smart Alerts UI: ${token}`) : fail(`V1.9.0 Smart Alerts UI: ${token}`);
}

const planTypesV180 = fs.readFileSync(path.join(root, "lib/planning/types.ts"), "utf8");
for (const token of ["ProjectPlanReminder", "SmartPlanAlert", "PlanReminderStatus", "PlanReminderEntityType", "smartAlertCount"]) {
  planTypesV180.includes(token) ? pass(`V1.9.0 Smart Alerts types: ${token}`) : fail(`V1.9.0 Smart Alerts types: ${token}`);
}

const planServerV180 = fs.readFileSync(path.join(root, "lib/planning/server.ts"), "utf8");
for (const token of ["normalizePlanReminder", "project_plan_reminders", "planningEntityExists", "buildSmartPlanAlerts"]) {
  planServerV180.includes(token) ? pass(`V1.9.0 Smart Alerts server: ${token}`) : fail(`V1.9.0 Smart Alerts server: ${token}`);
}

const reminderApiV180 = fs.readFileSync(path.join(root, "app/api/plan/reminders/route.ts"), "utf8");
for (const token of ["parsePlanReminderInput", "project_plan_reminders", "planningEntityExists", "V180_MIGRATION_REQUIRED"]) {
  reminderApiV180.includes(token) ? pass(`V1.9.0 Reminder API: ${token}`) : fail(`V1.9.0 Reminder API: ${token}`);
}

const reminderMigrationV180 = fs.readFileSync(path.join(root, "supabase/migrations/202609030004_v180_smart_reminders_alerts.sql"), "utf8");
for (const token of ["project_plan_reminders", "validate_project_plan_reminder_v180", "capture_plan_reminder_activity_v180", "push_notification_v110", "project_plan_reminders_write_pm_v180"]) {
  reminderMigrationV180.includes(token) ? pass(`V1.9.0 Reminder migration: ${token}`) : fail(`V1.9.0 Reminder migration: ${token}`);
}

const portfolioUiV190 = fs.readFileSync(path.join(root, "components/portfolio/portfolio-dashboard.tsx"), "utf8");
for (const token of ["Cross-Project Portfolio", "Project Ranking", "Priority Board", "alertScore", "/api/portfolio"]) {
  portfolioUiV190.includes(token) ? pass(`V1.9.0 Portfolio UI: ${token}`) : fail(`V1.9.0 Portfolio UI: ${token}`);
}

const portfolioApiV190 = fs.readFileSync(path.join(root, "app/api/portfolio/route.ts"), "utf8");
for (const token of ["getWorkspaceProjects", "project_plan_reminders", "alertScore", "PORTFOLIO_QUERY_FAILED"]) {
  portfolioApiV190.includes(token) ? pass(`V1.9.0 Portfolio API: ${token}`) : fail(`V1.9.0 Portfolio API: ${token}`);
}

const catalogApiV190 = fs.readFileSync(path.join(root, "app/api/project-catalog/route.ts"), "utf8");
for (const token of ["export async function DELETE", "uniqueUuidList", "contract_detail_items", "hard delete", "blockedCount"]) {
  catalogApiV190.includes(token) ? pass(`V1.9.0 Catalog hard delete API: ${token}`) : fail(`V1.9.0 Catalog hard delete API: ${token}`);
}

const catalogUiV190 = fs.readFileSync(path.join(root, "components/catalog/project-master-data-modal.tsx"), "utf8");
for (const token of ["selectedDepartments", "selectedModules", "toggleAllVisible", "Xóa đã chọn", "Trash2"]) {
  catalogUiV190.includes(token) ? pass(`V1.9.0 Catalog bulk delete UI: ${token}`) : fail(`V1.9.0 Catalog bulk delete UI: ${token}`);
}

const quickImportServerV190 = fs.readFileSync(path.join(root, "lib/catalog/quick-import-server.ts"), "utf8");
for (const token of ["ParsedContractTree", "embeddedDetails", "nodeType: \"other\"", "dòng Other trong sheet PLHĐ", "contractItems.items"]) {
  quickImportServerV190.includes(token) ? pass(`V1.9.0 PLHĐ import tree parser: ${token}`) : fail(`V1.9.0 PLHĐ import tree parser: ${token}`);
}

for (const token of ["ProjectCatalogTab = \"departments\" | \"modules\" | \"details\"", "ProjectCatalogDetail", "contractItemOptions", "detailParentOptions"]) {
  fs.readFileSync(path.join(root, "lib/catalog/types.ts"), "utf8").includes(token) ? pass(`V1.9.2 Catalog detail types: ${token}`) : fail(`V1.9.2 Catalog detail types: ${token}`);
}

for (const token of ["details:", "contract_detail_items", "entity === \"detail\"", "DETAIL_DELETE_FAILED", "item_type\", [\"root\", \"subsystem\", \"module\"]"]) {
  catalogApiV190.includes(token) ? pass(`V1.9.2 Catalog source API: ${token}`) : fail(`V1.9.2 Catalog source API: ${token}`);
}

for (const token of ["Chi tiết PLHĐ", "DetailTable", "DetailForm", "Danh mục chi tiết PLHĐ", "data?.details.length"]) {
  catalogUiV190.includes(token) ? pass(`V1.9.2 Catalog detail UI: ${token}`) : fail(`V1.9.2 Catalog detail UI: ${token}`);
}

const contractApiV192 = fs.readFileSync(path.join(root, "app/api/contract/route.ts"), "utf8");
for (const token of ["item.itemType === \"root\"", "item.itemType === \"subsystem\"", "item.itemType === \"module\""]) {
  contractApiV192.includes(token) ? pass(`V1.9.2 Contract overview source filter: ${token}`) : fail(`V1.9.2 Contract overview source filter: ${token}`);
}

const catalogMigrationV192 = fs.readFileSync(path.join(root, "supabase/migrations/202609040002_v192_catalog_source_of_truth.sql"), "utf8");
for (const token of ["legacy_other", "contract_items.item_type = 'other'", "contract_detail_items", "get_project_contract", "root','subsystem','module"]) {
  catalogMigrationV192.includes(token) ? pass(`V1.9.2 Catalog source migration: ${token}`) : fail(`V1.9.2 Catalog source migration: ${token}`);
}

const navigationV190 = fs.readFileSync(path.join(root, "lib/navigation.ts"), "utf8");
for (const token of ["Portfolio", "/portfolio", "BriefcaseBusiness"]) {
  navigationV190.includes(token) ? pass(`V1.9.0 Portfolio navigation: ${token}`) : fail(`V1.9.0 Portfolio navigation: ${token}`);
}

console.log("\nASC WORKING V1.9.2 - Catalog Source of Truth Preflight\n");
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
const failures = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
