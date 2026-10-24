"use client";

import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import {
  countTickets,
  listTickets,
} from "@/features/admin/services/admin.service";
import { TICKET_STATUS_ID } from "@/features/admin/utils/admin-constants";
import { formatRelative } from "@/features/admin/utils/admin-format";
import type { Category } from "@/features/categories/types/category.types";
import { getCategories } from "@/features/categories/services/category.service";
import type { AdminQueueRow } from "@/features/admin/types/admin.types";
import type { TicketPriority } from "@/features/tickets/types/ticket.types";

type CountKey =
  | "total"
  | "pending"
  | "inProgress"
  | "resolved"
  | "rejected"
  | "closed";

export type QueueCounts = Record<CountKey, number | null>;

const EMPTY_COUNTS: QueueCounts = {
  total: null,
  pending: null,
  inProgress: null,
  resolved: null,
  rejected: null,
  closed: null,
};

/**
 * Server-side ticket queue for the admin support desk: paginated list,
 * summary counts, filter categories, and the currently selected ticket.
 */
export function useAdminQueue() {
  /* --- list --- */
  const [listState, setListState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<AdminQueueRow[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  /* --- filters --- */
  const [statusFilter, setStatusFilterRaw] = useState<number | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  /* --- summary counts + categories --- */
  const [counts, setCounts] = useState<QueueCounts>(EMPTY_COUNTS);
  const [categories, setCategories] = useState<Category[]>([]);

  /* --- selection --- */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Summary counts + categories. Failures degrade to "—" gracefully. */
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      countTickets(),
      countTickets({ statusId: TICKET_STATUS_ID.PENDING_REVIEW }),
      countTickets({ statusId: TICKET_STATUS_ID.IN_PROGRESS }),
      countTickets({ statusId: TICKET_STATUS_ID.RESOLVED }),
      countTickets({ statusId: TICKET_STATUS_ID.REJECTED }),
      countTickets({ statusId: TICKET_STATUS_ID.CLOSED }),
      getCategories(),
    ]).then(
      ([
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        closed,
        categoryList,
      ]) => {
        if (cancelled) return;
        setCounts({
          total: total.status === "fulfilled" ? total.value : null,
          pending: pending.status === "fulfilled" ? pending.value : null,
          inProgress: inProgress.status === "fulfilled" ? inProgress.value : null,
          resolved: resolved.status === "fulfilled" ? resolved.value : null,
          rejected: rejected.status === "fulfilled" ? rejected.value : null,
          closed: closed.status === "fulfilled" ? closed.value : null,
        });
        if (categoryList.status === "fulfilled") {
          setCategories(categoryList.value);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* Ticket list: server-side filters + pagination. */
  useEffect(() => {
    let cancelled = false;

    listTickets({
      page,
      statusId: statusFilter === "ALL" ? undefined : statusFilter,
      categoryId: categoryFilter === "ALL" ? undefined : categoryFilter,
      priority:
        priorityFilter === "ALL"
          ? undefined
          : (priorityFilter as TicketPriority),
    })
      .then((response) => {
        if (cancelled) return;
        const now = Date.now();
        setTickets(
          response.data.map((row) => ({
            ...row,
            timeAgo: formatRelative(row.createdAt, now),
          })),
        );
        setServerTotal(response.pagination.total);
        setServerTotalPages(Math.max(1, response.pagination.totalPages));
        setListState("success");
        setListError(null);
        // Open the first ticket automatically until the admin picks one.
        setSelectedId((current) => current ?? response.data[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setListError(
          getApiErrorMessage(
            err,
            "Failed to load tickets. Please try again.",
          ),
        );
        setListState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, categoryFilter, priorityFilter, reloadKey]);

  const setStatusFilter = (next: number | "ALL") => {
    setStatusFilterRaw(next);
    setPage(1);
  };

  const retryList = () => {
    setListState("loading");
    setListError(null);
    setReloadKey((count) => count + 1);
  };

  /** Reloads the queue list and the summary counts, e.g. after a review action. */
  const refreshQueue = useCallback(() => {
    setReloadKey((count) => count + 1);
  }, []);

  const selectTicket = useCallback((ticketId: string) => {
    setSelectedId(ticketId);
  }, []);

  return {
    page,
    setPage,
    listState,
    listError,
    tickets,
    serverTotal,
    serverTotalPages,
    retryList,
    refreshQueue,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    counts,
    categories,
    selectedId,
    selectTicket,
  };
}
