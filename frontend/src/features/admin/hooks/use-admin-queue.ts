"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import {
  countTickets,
  listTickets,
} from "@/features/admin/services/admin.service";
import {
  ADMIN_PAGE_SIZE,
  DATE_RANGES,
  TICKET_STATUS_ID,
  type DateRangeValue,
} from "@/features/admin/utils/admin-constants";
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

const SEARCH_DEBOUNCE_MS = 500;

/**
 * Server-side ticket queue for the admin support desk: cursor-paginated list,
 * server-side search/filters, summary counts, filter categories, and the
 * currently selected ticket.
 */
export function useAdminQueue() {
  /* --- list --- */
  const [listState, setListState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<AdminQueueRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

  /* --- filters --- */
  const [statusFilter, setStatusFilterRaw] = useState<number | "ALL">("ALL");
  const [categoryFilter, setCategoryFilterRaw] = useState("ALL");
  const [priorityFilter, setPriorityFilterRaw] = useState("ALL");
  const [searchTerm, setSearchTermRaw] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRangeRaw] = useState<DateRangeValue>("ALL");
  const [createdFrom, setCreatedFrom] = useState<string | undefined>(undefined);

  /* --- summary counts + categories --- */
  const [counts, setCounts] = useState<QueueCounts>(EMPTY_COUNTS);
  const [categories, setCategories] = useState<Category[]>([]);

  /* --- selection --- */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resetPagination = useCallback(() => {
    setPageIndex(0);
    setPageCursors([null]);
    setHasMore(false);
    setNextCursor(null);
  }, []);

  /* Called from event handlers (never inside an effect) before a refetch. */
  const beginListLoad = useCallback(() => {
    setListState("loading");
    setListError(null);
    setTickets([]);
  }, []);

  /* Debounce the keyword; filters reset the page sequence immediately. */
  useEffect(() => {
    const trimmed = searchTerm.trim();
    const timer = setTimeout(
      () => setDebouncedSearch(trimmed),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  /* Ticket list: cursor pagination plus server-side search/filters. */
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const currentRequestId = ++requestIdRef.current;
    const cursor = pageCursors[pageIndex] ?? null;

    listTickets(
      {
        cursor,
        limit: ADMIN_PAGE_SIZE,
        statusId: statusFilter === "ALL" ? undefined : statusFilter,
        categoryId: categoryFilter === "ALL" ? undefined : categoryFilter,
        priority:
          priorityFilter === "ALL"
            ? undefined
            : (priorityFilter as TicketPriority),
        search: debouncedSearch || undefined,
        createdFrom,
      },
      controller.signal,
    )
      .then((response) => {
        if (cancelled || currentRequestId !== requestIdRef.current) return;
        const now = Date.now();
        setTickets(
          response.data.map((row) => ({
            ...row,
            timeAgo: formatRelative(row.createdAt, now),
          })),
        );
        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
        setListState("success");
        setListError(null);
        // Open the first ticket automatically until the admin picks one.
        setSelectedId((current) => current ?? response.data[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          controller.signal.aborted ||
          currentRequestId !== requestIdRef.current
        ) {
          return;
        }
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
      controller.abort();
    };
  }, [
    pageIndex,
    pageCursors,
    statusFilter,
    categoryFilter,
    priorityFilter,
    debouncedSearch,
    createdFrom,
    reloadKey,
  ]);

  const setStatusFilter = useCallback(
    (next: number | "ALL") => {
      beginListLoad();
      setStatusFilterRaw(next);
      resetPagination();
    },
    [beginListLoad, resetPagination],
  );

  const setCategoryFilter = useCallback(
    (next: string) => {
      beginListLoad();
      setCategoryFilterRaw(next);
      resetPagination();
    },
    [beginListLoad, resetPagination],
  );

  const setPriorityFilter = useCallback(
    (next: string) => {
      beginListLoad();
      setPriorityFilterRaw(next);
      resetPagination();
    },
    [beginListLoad, resetPagination],
  );

  const setSearchTerm = useCallback(
    (next: string) => {
      beginListLoad();
      setSearchTermRaw(next);
      resetPagination();
    },
    [beginListLoad, resetPagination],
  );

  const setDateRange = useCallback(
    (next: DateRangeValue) => {
      beginListLoad();
      setDateRangeRaw(next);
      const days = DATE_RANGES.find((range) => range.value === next)?.days;
      setCreatedFrom(
        days === null || days === undefined
          ? undefined
          : new Date(Date.now() - days * 86_400_000).toISOString(),
      );
      resetPagination();
    },
    [beginListLoad, resetPagination],
  );

  const goNext = useCallback(() => {
    if (!hasMore || !nextCursor) return;

    beginListLoad();
    const nextIndex = pageIndex + 1;
    setPageCursors((current) => {
      const updated = current.slice(0, pageIndex + 1);
      updated[nextIndex] = nextCursor;
      return updated;
    });
    setPageIndex(nextIndex);
  }, [beginListLoad, hasMore, nextCursor, pageIndex]);

  const goPrevious = useCallback(() => {
    if (pageIndex === 0) return;

    beginListLoad();
    setPageIndex((current) => Math.max(0, current - 1));
  }, [beginListLoad, pageIndex]);

  const retryList = useCallback(() => {
    beginListLoad();
    setReloadKey((count) => count + 1);
  }, [beginListLoad]);

  /** Reloads the queue list and the summary counts, e.g. after a review action. */
  const refreshQueue = useCallback(() => {
    beginListLoad();
    setReloadKey((count) => count + 1);
  }, [beginListLoad]);

  const selectTicket = useCallback((ticketId: string) => {
    setSelectedId(ticketId);
  }, []);

  return {
    pageNumber: pageIndex + 1,
    canGoPrevious: pageIndex > 0,
    hasMore,
    goNext,
    goPrevious,
    listState,
    listError,
    tickets,
    retryList,
    refreshQueue,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    counts,
    categories,
    selectedId,
    selectTicket,
  };
}
