"use client";

import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import { useToast } from "@/components/ui/toaster";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service";
import type { NotificationItem } from "../types/notification.types";

export type NotificationsLoadState = "loading" | "success" | "error";

/** Fired after a successful mark-read mutation so other mounted
 * notification UIs (e.g. the shell bell) can refresh their counts. */
export const NOTIFICATIONS_UPDATED_EVENT =
  "supportdesk:notifications-updated";

function broadcastNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
}

/**
 * Loads one page of notifications for the authenticated user and owns the
 * mark-as-read / mark-all-as-read mutations (local state is patched from the
 * API results; unreadCount always reflects the full unread total).
 */
export function useNotifications(unreadOnly: boolean) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [state, setState] = useState<NotificationsLoadState>("loading");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [actingId, setActingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listNotifications({ page, unreadOnly }).then(
      (response) => {
        if (cancelled) return;
        setItems(response.data);
        setPage(response.pagination.page);
        setTotalPages(Math.max(1, response.pagination.totalPages));
        setTotal(response.pagination.total);
        setUnreadCount(response.unreadCount);
        setFetchedAt(Date.now());
        setErrorMsg(null);
        setState("success");
      },
      (err: unknown) => {
        if (cancelled) return;
        setErrorMsg(
          getApiErrorMessage(
            err,
            "Failed to load notifications. Please try again.",
          ),
        );
        setState("error");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [page, unreadOnly, retryKey]);

  const markAsRead = async (notification: NotificationItem) => {
    if (actingId) return;
    setActingId(notification.id);
    try {
      await markNotificationRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
      if (!notification.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      broadcastNotificationsUpdated();
      showSuccessToast({
        title: "Notification updated",
        description: "Notification marked as read.",
      });
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to mark the notification as read. Please try again.",
      );
      showErrorToast({ title: "Update failed", description: message });
    } finally {
      setActingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const response = await markAllNotificationsRead();
      setItems((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );
      setUnreadCount(0);
      broadcastNotificationsUpdated();
      showSuccessToast({
        title: "All caught up",
        description: `${response.updatedCount} notification${
          response.updatedCount === 1 ? "" : "s"
        } marked as read.`,
      });
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to mark all notifications as read. Please try again.",
      );
      showErrorToast({ title: "Update failed", description: message });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const retry = () => {
    setState("loading");
    setErrorMsg(null);
    setRetryKey((key) => key + 1);
  };

  /** Re-fetches without resetting the visible state (used by the shell bell
   * for dropdown-open refresh and background polling). */
  const refresh = useCallback(() => {
    setRetryKey((key) => key + 1);
  }, []);

  const goToPage = (nextPage: number) => {
    if (nextPage === page || actingId !== null) return;
    setPage(nextPage);
    setState("loading");
  };

  return {
    state,
    items,
    page,
    totalPages,
    total,
    unreadCount,
    fetchedAt,
    errorMsg,
    actingId,
    isMarkingAll,
    markAsRead,
    markAllAsRead,
    retry,
    refresh,
    goToPage,
  };
}
