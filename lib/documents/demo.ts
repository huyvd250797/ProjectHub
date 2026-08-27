import type { DocumentListData, ProjectDocument } from "./types";

const now = Date.now();

export function createDemoDocuments(projectId: string): ProjectDocument[] {
  return [
    {
      id: "demo-document-001",
      projectId,
      title: "Biên bản họp triển khai tuần 04",
      originalFileName: "Bien-ban-hop-trien-khai-tuan-04.pdf",
      category: "minutes",
      description: "Tổng hợp nội dung, đầu việc và mốc bàn giao sau buổi họp tuần.",
      linkType: "project",
      linkedEntityId: null,
      linkedEntityLabel: "Toàn dự án",
      mimeType: "application/pdf",
      sizeBytes: 1_842_688,
      driveFileId: "demo-drive-file-001",
      versionNo: 1,
      uploadedBy: null,
      uploadedByName: "Võ Đức Huy",
      createdAt: new Date(now - 86_400_000).toISOString(),
      updatedAt: new Date(now - 86_400_000).toISOString(),
    },
    {
      id: "demo-document-002",
      projectId,
      title: "Tài liệu hướng dẫn vận hành ISSUE",
      originalFileName: "Huong-dan-van-hanh-ISSUE.docx",
      category: "guide",
      description: "Hướng dẫn dành cho thành viên dự án và đầu mối phía trường.",
      linkType: "issue",
      linkedEntityId: null,
      linkedEntityLabel: "Quy trình xử lý ISSUE",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 736_420,
      driveFileId: "demo-drive-file-002",
      versionNo: 2,
      uploadedBy: null,
      uploadedByName: "Nguyễn Đức Huy",
      createdAt: new Date(now - 4 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
    },
    {
      id: "demo-document-003",
      projectId,
      title: "Báo cáo tiến độ tháng",
      originalFileName: "Bao-cao-tien-do-thang-08.xlsx",
      category: "report",
      description: null,
      linkType: "project",
      linkedEntityId: null,
      linkedEntityLabel: "Toàn dự án",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 429_811,
      driveFileId: "demo-drive-file-003",
      versionNo: 1,
      uploadedBy: null,
      uploadedByName: "Võ Đức Huy",
      createdAt: new Date(now - 8 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 8 * 86_400_000).toISOString(),
    },
  ];
}

export function createDemoDocumentList(projectId: string): DocumentListData {
  const rows = createDemoDocuments(projectId);
  return {
    source: "demo",
    projectId,
    role: "pm",
    canUpload: false,
    canManage: false,
    driveReady: false,
    summary: {
      total: rows.length,
      minutes: rows.filter((row) => row.category === "minutes").length,
      reports: rows.filter((row) => row.category === "report").length,
      totalBytes: rows.reduce((sum, row) => sum + row.sizeBytes, 0),
      latestAt: rows[0]?.createdAt ?? null,
    },
    rows,
  };
}
