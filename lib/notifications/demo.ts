import type { ActivityData, NotificationInboxData, NotificationPreferences } from "@/lib/notifications/types";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  issueAssignment: true,
  issueUpdates: true,
  dueReminders: true,
  projectMembership: true,
  importUpdates: true,
  securityEvents: true,
};

export function createDemoNotificationInbox(projectId: string): NotificationInboxData {
  const now = new Date();
  const earlier = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return {
    source: "demo",
    projectId,
    unreadCount: 2,
    items: [
      {
        id: "demo-notification-1",
        projectId,
        category: "issue_assignment",
        title: "Bạn được giao ISSUE mới",
        summary: "Hoàn thiện mapping dữ liệu và kiểm tra tiến độ bàn giao.",
        href: "/issues",
        readAt: null,
        createdAt: now.toISOString(),
      },
      {
        id: "demo-notification-2",
        projectId,
        category: "due_reminder",
        title: "ISSUE sắp đến hạn",
        summary: "Kiểm tra các yêu cầu còn tồn trước Due Date.",
        href: "/issues?nearDue=7",
        readAt: null,
        createdAt: earlier.toISOString(),
      },
    ],
  };
}

export function createDemoActivity(projectId: string): ActivityData {
  const now = Date.now();
  return {
    source: "demo",
    projectId,
    page: 1,
    pageSize: 30,
    total: 4,
    totalPages: 1,
    items: [
      { id: "a1", projectId, eventType: "issue_status_code", entityType: "issue", entityId: null, title: "ISSUE #128 cập nhật trạng thái", summary: "Đã chuyển sang Đang xử lý.", href: "/issues", createdAt: new Date(now - 10 * 60 * 1000).toISOString(), actorName: "ASC Team", actorEmail: null },
      { id: "a2", projectId, eventType: "project_member_added", entityType: "project_member", entityId: null, title: "Thành viên mới được thêm vào Project", summary: "Role: member", href: "/settings/projects", createdAt: new Date(now - 60 * 60 * 1000).toISOString(), actorName: "MASTER", actorEmail: null },
      { id: "a3", projectId, eventType: "import_completed", entityType: "import", entityId: null, title: "Excel Import hoàn tất", summary: "ASC-WORKING-Import.xlsx", href: "/settings/import", createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(), actorName: "ASC Team", actorEmail: null },
      { id: "a4", projectId, eventType: "resource_open_link", entityType: "resource", entityId: null, title: "Mở resource: Portal Production", summary: null, href: "/resources", createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(), actorName: "ASC Team", actorEmail: null },
    ],
  };
}
