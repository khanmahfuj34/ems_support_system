"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import {
  countMyTickets,
  listMyTickets,
} from "@/features/tickets/services/ticket.service";
import type { Category } from "@/features/categories/types/category.types";
import { getCategories } from "@/features/categories/services/category.service";
import type {
  TicketListRow,
  TicketPriority,
} from "@/features/tickets/types/ticket.types";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 500;

const TICKET_STATUS_ID = {
  PENDING_REVIEW: 2,
  IN_PROGRESS: 4,
  RESOLVED: 6,
} as const;

/** Server-side counts for the summary cards; null means the count failed. */
export interface MyTicketCounts {
  total: number | null;
  pending: number | null;
  inProgress: number | null;
  resolved: number | null;
}

const EMPTY_COUNTS: MyTicketCounts = {
  total: null,
  pending: null,
  inProgress: null,
  resolved: null,
};

/**
 * Server-driven "My Tickets" queue for the authenticated user: the API scopes
 * rows to the caller's own tickets, applies filters/search server-side, and
 * pages with opaque keyset cursors.
 */
export function useMyTickets() {
  /* --- list --- */
  const [listState, setListState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketListRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

  /* --- filters --- */
  const [statusFilter, setStatusFilterRaw] = useState<number | "ALL">("ALL");
  const [categoryIdFilter, setCategoryIdFilterRaw] = useState("ALL");
  const [priorityFilter, setPriorityFilterRaw] = useState<string>("ALL");
  const [searchTerm, setSearchTermRaw] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  /* --- summary counts + filter categories --- */
  const [counts, setCounts] = useState<MyTicketCounts>(EMPTY_COUNTS);
  const [categories, setCategories] = useState<Category[]>([]);

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
      countMyTickets(),
      countMyTickets({ statusId: TICKET_STATUS_ID.PENDING_REVIEW }),
      countMyTickets({ statusId: TICKET_STATUS_ID.IN_PROGRESS }),
      countMyTickets({ statusId: TICKET_STATUS_ID.RESOLVED }),
      getCategories(),
    ]).then(([total, pending, inProgress, resolved, categoryList]) => {
      if (cancelled) return;
      setCounts({
        total: total.status === "fulfilled" ? total.value : null,
        pending: pending.status === "fulfilled" ? pending.value : null,
        inProgress:
          inProgress.status === "fulfilled" ? inProgress.value : null,
        resolved: resolved.status === "fulfilled" ? resolved.value : null,
      });
      if (categoryList.status === "fulfilled") {
        setCategories(categoryList.value);
      }
    });

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

    listMyTickets(
      {
        cursor,
        limit: PAGE_SIZE,
        statusId: statusFilter === "ALL" ? undefined : statusFilter,
        categoryId: categoryIdFilter === "ALL" ? undefined : categoryIdFilter,
        priority:
          priorityFilter === "ALL"
            ? undefined
            : (priorityFilter as TicketPriority),
        search: debouncedSearch || undefined,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (cancelled || currentRequestId !== requestIdRef.current) return;
        setTickets(response.data);
        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
        setListState("success");
        setListError(null);
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
          getApiErrorMessage(err, "Failed to load tickets. Please try again."),
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
    categoryIdFilter,
    priorityFilter,
    debouncedSearch,
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

  const setCategoryIdFilter = useCallback(
    (next: string) => {
      beginListLoad();
      setCategoryIdFilterRaw(next);
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

  return {
    tickets,
    listState,
    listError,
    retryList,
    pageNumber: pageIndex + 1,
    canGoPrevious: pageIndex > 0,
    hasMore,
    goNext,
    goPrevious,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    categoryIdFilter,
    setCategoryIdFilter,
    counts,
    categories,
  };
}
