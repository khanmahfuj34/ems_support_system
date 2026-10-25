import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  ListNotificationsQuery,
  MarkAllNotificationsReadData,
  MarkNotificationReadData,
  NotificationsListData,
} from "../types/notification.types";

/**
 * Backend contract: GET /api/v1/notifications?page=&unreadOnly=
 * Returns the user's own notifications plus the unread count.
 */
export async function listNotifications(
  query: ListNotificationsQuery = {},
): Promise<NotificationsListData> {
  const { data } = await apiClient.get<NotificationsListData>(
    API_ENDPOINTS.notifications.list,
    {
      params: {
        page: query.page ?? 1,
        ...(query.unreadOnly ? { unreadOnly: "true" } : {}),
      },
    },
  );

  return data;
}

/** Idempotent: the backend returns 200 even if the row was already read. */
export async function markNotificationRead(
  notificationId: string,
): Promise<MarkNotificationReadData> {
  const { data } = await apiClient.patch<MarkNotificationReadData>(
    API_ENDPOINTS.notifications.markRead(notificationId),
  );

  return data;
}

export async function markAllNotificationsRead(): Promise<MarkAllNotificationsReadData> {
  const { data } = await apiClient.patch<MarkAllNotificationsReadData>(
    API_ENDPOINTS.notifications.readAll,
  );

  return data;
}
