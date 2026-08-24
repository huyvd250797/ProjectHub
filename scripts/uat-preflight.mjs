import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const pass = (label, detail = "") => checks.push({ ok: true, label, detail });
const fail = (label, detail = "") => checks.push({ ok: false, label, detail });
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
pkg.version === "0.9.5" ? pass("Package version", "0.9.5") : fail("Package version", `Expected 0.9.5, got ${pkg.version}`);

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
for (const token of ["Họ tên", "Email đăng nhập", "Đã đồng bộ Phụ trách ISSUE", "fullName"]) {
  memberPanel.includes(token) ? pass(`Project Member / Assignee: ${token}`) : fail(`Project Member / Assignee: ${token}`);
}

const issueServer = fs.readFileSync(path.join(root, "lib/issues/server.ts"), "utf8");
for (const token of ["project_members", "personByUser", "assignees", "assigneeValid"]) {
  issueServer.includes(token) ? pass(`Assignee source guard: ${token}`) : fail(`Assignee source guard: ${token}`);
}

console.log("\nASC WORKING V0.9.5 - UAT Preflight\n");
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
const failures = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
