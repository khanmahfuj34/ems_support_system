"use client";

import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import { countTickets, listTickets } from "@/features/admin/services/admin.service";
import {
  IN_PROGRESS_STATUS_ID,
  PENDING_REVIEW_STATUS_ID,
  RESOLVED_STATUS_ID,
} from "@/features/admin/utils/admin-constants";
import type { AttentionTicketRow } from "@/features/admin/components/dashboard/needs-attention-panel";
import type { RecentTicketRow } from "@/features/admin/components/dashboard/recent-tickets-panel";

export type AdminOverviewLoadState = "loading" | "success" | "error";

export interface AdminOverviewData {
  /** Server-side `pagination.total` per status filter; per-card failures stay `null`. */
  stats: {
    total: number | null;
    pendingReview: number | null;
    inProgress: number | null;
    resolved: number | null;
  };
  attentionRows: AttentionTicketRow[];
  recentRows: RecentTicketRow[];
  /** Client timestamp of the successful fetch; also used for relative times. */
  fetchedAt: number;
}

const OVERVIEW_ERROR_FALLBACK =
  "Failed to load the dashboard data. Please try again.";

/**
 * Loads the admin overview payload from the already-verified ticket list API:
 * per-status totals come from `pagination.total` of `limit=1` requests
 * (server-side counts, not derived from one page), the Needs Attention panel
 * lists actual pending-review tickets, and Recent Tickets lists the latest
 * real tickets. List rows share one request round and any failed list request
 * moves the whole state to `error` (retryable); failing count requests only
 * degrade their individual KPI to `null`.
 */
export function useAdminOverview() {
  const [state, setState] = useState<AdminOverviewLoadState>("loading");
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const statsPromise = Promise.allSettled([
      countTickets(),
      countTickets({ statusId: PENDING_REVIEW_STATUS_ID }),
      countTickets({ statusId: IN_PROGRESS_STATUS_ID }),
      countTickets({ statusId: RESOLVED_STATUS_ID }),
    ]);

    const rowsPromise = Promise.all([
      listTickets({
        statusId: PENDING_REVIEW_STATUS_ID,
        limit: 5,
      }),
      listTickets({ limit: 5 }),
    ]);

    Promise.all([statsPromise, rowsPromise])
      .then(([statsResults, [pendingList, recentList]]) => {
        if (cancelled) return;
        const readCount = (index: 0 | 1 | 2 | 3) =>
          statsResults[index].status === "fulfilled"
            ? statsResults[index].value
            : null;

        setData({
          stats: {
            total: readCount(0),
            pendingReview: readCount(1),
            inProgress: readCount(2),
            resolved: readCount(3),
          },
          attentionRows: pendingList.data.map((row) => ({
            id: row.id,
            ticketNumber: row.ticketNumber,
            subject: row.subject,
            priority: row.adminPriority ?? row.userPriority,
            createdAt: row.createdAt,
          })),
          recentRows: recentList.data.map((row) => ({
            id: row.id,
            ticketNumber: row.ticketNumber,
            subject: row.subject,
            statusId: row.statusId,
            statusName: row.status?.name ?? null,
            createdAt: row.createdAt,
          })),
          fetchedAt: Date.now(),
        });
        setState("success");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(getApiErrorMessage(error, OVERVIEW_ERROR_FALLBACK));
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setState("loading");
    setErrorMessage(null);
    setReloadKey((key) => key + 1);
  }, []);

  /** Silent refresh: keeps previously rendered data visible while reloading. */
  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { state, data, errorMessage, retry, refresh };
}
