/**
 * Shapes mirror the backend `Notification` model and the
 * `/api/v1/notifications` responses (AdminService notification writes).
 */
export interface NotificationItem {
  id: string;
  ticketId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListData {
  message: string;
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface ListNotificationsQuery {
  page?: number;
  unreadOnly?: boolean;
}

export interface MarkNotificationReadData {
  message: string;
  data: NotificationItem;
}

export interface MarkAllNotificationsReadData {
  message: string;
  updatedCount: number;
}
