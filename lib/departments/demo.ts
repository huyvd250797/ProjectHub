import type { DepartmentsData } from "./types";

const demoRows = [
  ["PDT", "Phòng Đào tạo", 52, 31, 8, 39, 6, 3],
  ["PTCKT", "Phòng Tài chính - Kế toán", 38, 20, 7, 28, 5, 2],
  ["PCTSV", "Phòng Công tác sinh viên", 34, 18, 6, 25, 4, 3],
  ["PKTDBCL", "Phòng Khảo thí & ĐBCL", 29, 17, 4, 23, 2, 1],
  ["PQLKH", "Phòng Quản lý khoa học", 25, 13, 5, 18, 3, 1],
  ["UNASSIGNED", "Chưa xác định phòng ban", 17, 4, 1, 6, 5, 2],
] as const;

export function createDemoDepartments(projectId: string): DepartmentsData {
  const departments = demoRows.map((row, index) => {
    const [code, name, total, resolved, released, handedOver, overdue, nearDue] = row;
    const unassigned = code === "UNASSIGNED";
    const notHandedOver = total - handedOver;
    return {
      id: unassigned ? "__unassigned__" : `demo-department-${index + 1}`,
      code: unassigned ? null : code,
      name,
      isUnassigned: unassigned,
      isActive: true,
      total,
      resolved,
      released,
      handedOver,
      notHandedOver,
      overdue,
      nearDue,
      missingAssignee: Math.max(0, Math.round(total * 0.08)),
      handoverProgress: total ? Math.round((handedOver / total) * 100) : 0,
      contacts: unassigned
        ? []
        : [
            {
              id: `demo-contact-${index + 1}`,
              fullName: `Đầu mối ${name.replace("Phòng ", "")}`,
              title: "Chuyên viên phụ trách",
              email: null,
              zalo: null,
            },
          ],
      modules: unassigned
        ? []
        : Array.from({ length: Math.max(1, 3 - (index % 2)) }, (_, moduleIndex) => ({
            id: `demo-module-${index + 1}-${moduleIndex + 1}`,
            code: `${index + 1}.${moduleIndex + 1}`,
            name: `Module phụ trách ${moduleIndex + 1}`,
            statusCode: moduleIndex % 2 ? "surveyed" : "ready_training",
          })),
      attentionIssues: Array.from({ length: Math.min(3, overdue + nearDue) }, (_, issueIndex) => ({
        id: `demo-issue-${index + 1}-${issueIndex + 1}`,
        content: `ISSUE cần chú ý của ${name}`,
        statusCode: "processing",
        dueDate: null,
        moduleName: unassigned ? null : `Module phụ trách ${(issueIndex % 2) + 1}`,
        assigneeName: issueIndex === 0 ? null : "ASC Team",
        isOverdue: issueIndex < overdue,
        isNearDue: issueIndex >= overdue,
      })),
    };
  });

  const totalIssues = departments.reduce((sum, row) => sum + row.total, 0);
  const unassignedIssues = departments.find((row) => row.isUnassigned)?.total ?? 0;

  return {
    source: "demo",
    generatedAt: new Date().toISOString(),
    projectId,
    summary: {
      departments: departments.filter((row) => !row.isUnassigned).length,
      totalIssues,
      linkedIssues: totalIssues - unassignedIssues,
      unassignedIssues,
      handedOver: departments.reduce((sum, row) => sum + row.handedOver, 0),
      overdue: departments.reduce((sum, row) => sum + row.overdue, 0),
      contacts: departments.reduce((sum, row) => sum + row.contacts.length, 0),
      modules: departments.reduce((sum, row) => sum + row.modules.length, 0),
    },
    departments,
  };
}
