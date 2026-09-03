import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/demo";
import type {
  ActivityData,
  ActivityEvent,
  NotificationCategory,
  NotificationInboxData,
  NotificationItem,
  NotificationPreferences,
} from "@/lib/notifications/types";

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function category(value: unknown): NotificationCategory {
  return value === "issue_assignment" ||
    value === "issue_update" ||
    value === "due_reminder" ||
    value === "project_membership" ||
    value === "import_update" ||
    value === "security_event"
    ? value
    : "issue_update";
}

export function normalizeNotification(row: Record<string, unknown>): NotificationItem {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    category: category(row.category),
    title: String(row.title ?? "Thông báo"),
    summary: text(row.summary),
    href: text(row.href),
    readAt: text(row.read_at),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function getNotificationInbox(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  limit = 12,
): Promise<NotificationInboxData> {
  // V1.1.0 lazily generates due/overdue reminders for the current user.
  // Missing migration is handled by the following table query and surfaced by the API.
  await supabase.rpc("sync_issue_due_notifications_v110", { p_project_id: projectId });

  const [itemsResult, countResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,project_id,category,title,summary,href,read_at,created_at")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (countResult.error) throw new Error(countResult.error.message);

  return {
    source: "database",
    projectId,
    unreadCount: countResult.count ?? 0,
    items: ((itemsResult.data ?? []) as Array<Record<string, unknown>>).map(normalizeNotification),
  };
}

export async function getNotificationPreferences(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("issue_assignment,issue_updates,due_reminders,project_membership,import_updates,security_events")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;

  return {
    issueAssignment: data.issue_assignment !== false,
    issueUpdates: data.issue_updates !== false,
    dueReminders: data.due_reminders !== false,
    projectMembership: data.project_membership !== false,
    importUpdates: data.import_updates !== false,
    securityEvents: data.security_events !== false,
  };
}

export async function getProjectActivity(
  supabase: SupabaseClient,
  projectId: string,
  page: number,
  pageSize: number,
  eventGroup?: string | null,
): Promise<ActivityData> {
  let query = supabase
    .from("activity_events")
    .select("id,project_id,actor_id,event_type,entity_type,entity_id,title,summary,href,created_at", { count: "exact" })
    .eq("project_id", projectId);

  if (eventGroup === "issue") query = query.eq("entity_type", "issue");
  else if (eventGroup === "resource") query = query.eq("entity_type", "resource");
  else if (eventGroup === "project") query = query.in("entity_type", ["project_member", "project"]);
  else if (eventGroup === "import") query = query.eq("entity_type", "import");
  else if (eventGroup === "plan") query = query.in("entity_type", ["plan", "stage", "milestone"]);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const actorIds = [...new Set(rows.map((row) => text(row.actor_id)).filter((id): id is string => Boolean(id)))];
  const profileMap = new Map<string, { name: string | null; email: string | null }>();

  if (actorIds.length) {
    const profiles = await supabase.from("profiles").select("id,display_name,email").in("id", actorIds);
    if (!profiles.error) {
      for (const profile of (profiles.data ?? []) as Array<Record<string, unknown>>) {
        profileMap.set(String(profile.id), { name: text(profile.display_name), email: text(profile.email) });
      }
    }
  }

  const items: ActivityEvent[] = rows.map((row) => {
    const actorId = text(row.actor_id);
    const actor = actorId ? profileMap.get(actorId) : undefined;
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      eventType: String(row.event_type ?? "activity"),
      entityType: String(row.entity_type ?? "activity"),
      entityId: text(row.entity_id),
      title: String(row.title ?? "Hoạt động"),
      summary: text(row.summary),
      href: text(row.href),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
    };
  });

  const total = count ?? 0;
  return {
    source: "database",
    projectId,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
  };
}
