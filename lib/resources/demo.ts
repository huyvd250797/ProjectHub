import type { ResourceData } from "@/lib/resources/types";

export function createDemoResources(projectId: string): ResourceData {
  const now = new Date().toISOString();
  const rows = [
    { id: "demo-portal", projectId, name: "Portal Production", resourceType: "portal", environment: "production", urlOrHost: "https://portal.example.local", remoteAddress: null, username: "viewer-user", hasSecret: true, secretHint: "••••demo", notes: "Dữ liệu minh họa — không phải credential thật.", isSensitive: true, canReveal: false, canCopy: false, updatedAt: now },
    { id: "demo-sql", projectId, name: "SQL Server Production", resourceType: "database", environment: "production", urlOrHost: "10.xxx.xxx.xxx", remoteAddress: "10.xxx.xxx.xxx:1433", username: "db-user", hasSecret: true, secretHint: "••••demo", notes: "Demo Mode chỉ đọc.", isSensitive: true, canReveal: false, canCopy: false, updatedAt: now },
    { id: "demo-test", projectId, name: "Portal Test", resourceType: "test", environment: "test", urlOrHost: "https://test.example.local", remoteAddress: null, username: "tester", hasSecret: false, secretHint: null, notes: null, isSensitive: false, canReveal: false, canCopy: false, updatedAt: now },
  ];
  return { source: "demo", projectId, role: "pm", canManage: false, canAudit: false, securityReady: false, summary: { total: rows.length, production: 2, sensitive: 2, withSecret: 2 }, rows };
}
