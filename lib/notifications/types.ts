export type NotificationCategory =
  | "issue_assignment"
  | "issue_update"
  | "due_reminder"
  | "project_membership"
  | "import_update"
  | "security_event";

export type NotificationItem = {
  id: string;
  projectId: string;
  category: NotificationCategory;
  title: string;
  summary: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationInboxData = {
  source: "database" | "demo";
  projectId: string;
  unreadCount: number;
  items: NotificationItem[];
};

export type NotificationInboxResponse =
  | { ok: true; data: NotificationInboxData }
  | { ok: false; code: string; message: string };

export type NotificationMutationResponse =
  | { ok: true; unreadCount?: number }
  | { ok: false; code: string; message: string };

export type NotificationPreferences = {
  issueAssignment: boolean;
  issueUpdates: boolean;
  dueReminders: boolean;
  projectMembership: boolean;
  importUpdates: boolean;
  securityEvents: boolean;
};

export type NotificationPreferencesResponse =
  | { ok: true; preferences: NotificationPreferences }
  | { ok: false; code: string; message: string };

export type ActivityEvent = {
  id: string;
  projectId: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  title: string;
  summary: string | null;
  href: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

export type ActivityData = {
  source: "database" | "demo";
  projectId: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ActivityEvent[];
};

export type ActivityApiResponse =
  | { ok: true; data: ActivityData }
  | { ok: false; code: string; message: string };
