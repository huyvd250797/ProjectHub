import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const pass = (label, detail = "") => checks.push({ ok: true, label, detail });
const fail = (label, detail = "") => checks.push({ ok: false, label, detail });
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
pkg.version === "0.9.3" ? pass("Package version", "0.9.3") : fail("Package version", `Expected 0.9.3, got ${pkg.version}`);

for (const rel of [
  "app/api/readiness/route.ts",
  "app/(workspace)/settings/uat/page.tsx",
  "app/(workspace)/settings/projects/page.tsx",
  "app/api/master/projects/route.ts",
  "app/api/master/projects/[projectId]/route.ts",
  "components/master/master-project-console.tsx",
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

console.log("\nASC WORKING V0.9.3 - UAT Preflight\n");
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}${item.detail ? ` - ${item.detail}` : ""}`);
const failures = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);
if (failures.length) process.exit(1);
