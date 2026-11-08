"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/api-errors";
import { countMyTickets, listMyTickets } from "@/features/tickets/services/ticket.service";
import { listNotifications } from "@/features/notifications/services/notification.service";
import type { TicketListRow } from "@/features/tickets/types/ticket.types";
import type { NotificationItem } from "@/features/notifications/types/notification.types";

export type UserDashboardLoadState = "loading" | "success" | "error";

export interface UserDashboardStats {
  total: number | null;
  open: number | null;
  inProgress: number | null;
  resolved: number | null;
}

export interface UserDashboardData {
  stats: UserDashboardStats;
  actionRequiredTickets: TicketListRow[];
  recentTickets: TicketListRow[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  fetchedAt: number;
}

const TICKET_STATUS_ID = {
  OPEN: 1,
  PENDING_REVIEW: 2,
  ACCEPTED: 3,
  IN_PROGRESS: 4,
  WAITING_FOR_USER: 5,
  RESOLVED: 6,
  CLOSED: 7,
  REJECTED: 8,
  REOPENED: 9,
} as const;

const DASHBOARD_ERROR_FALLBACK =
  "Failed to load dashboard data. Please try again.";

export function useUserDashboard() {
  const [state, setState] = useState<UserDashboardLoadState>("loading");
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  const retry = useCallback(() => {
    setState("loading");
    setErrorMessage(null);
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 1. Accurate server-side count queries (fails degrade individual KPI to null)
    const statsPromise = Promise.allSettled([
      countMyTickets(),
      countMyTickets({ statusId: TICKET_STATUS_ID.OPEN }),
      countMyTickets({ statusId: TICKET_STATUS_ID.PENDING_REVIEW }),
      countMyTickets({ statusId: TICKET_STATUS_ID.IN_PROGRESS }),
      countMyTickets({ statusId: TICKET_STATUS_ID.RESOLVED }),
    ]);

    // 2. Data rows: Action Required, Recent Tickets, and Notifications
    const listsPromise = Promise.all([
      listMyTickets({
        statusId: TICKET_STATUS_ID.WAITING_FOR_USER,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      listMyTickets({
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      listNotifications({
        page: 1,
      }),
    ]);

    Promise.all([statsPromise, listsPromise])
      .then(([statsResults, [actionList, recentList, notificationList]]) => {
        if (cancelled) return;

        const totalRes = statsResults[0];
        const openRes = statsResults[1];
        const pendingRes = statsResults[2];
        const inProgressRes = statsResults[3];
        const resolvedRes = statsResults[4];

        // Total Tickets count
        const total = totalRes.status === "fulfilled" ? totalRes.value : null;

        // Open Tickets count: combines OPEN (1) and PENDING_REVIEW (2)
        let open: number | null = null;
        if (openRes.status === "fulfilled" || pendingRes.status === "fulfilled") {
          const openVal = openRes.status === "fulfilled" ? openRes.value : 0;
          const pendingVal = pendingRes.status === "fulfilled" ? pendingRes.value : 0;
          open = openVal + pendingVal;
        }

        // In Progress (4) and Resolved (6)
        const inProgress =
          inProgressRes.status === "fulfilled" ? inProgressRes.value : null;
        const resolved =
          resolvedRes.status === "fulfilled" ? resolvedRes.value : null;

        setData({
          stats: {
            total,
            open,
            inProgress,
            resolved,
          },
          actionRequiredTickets: actionList.data,
          recentTickets: recentList.data,
          notifications: notificationList.data.slice(0, 4),
          unreadNotificationsCount: notificationList.unreadCount ?? 0,
          fetchedAt: Date.now(),
        });

        setState("success");
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(getApiErrorMessage(error, DASHBOARD_ERROR_FALLBACK));
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return {
    state,
    data,
    errorMessage,
    refresh,
    retry,
  };
}

