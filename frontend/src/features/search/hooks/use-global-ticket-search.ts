"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import { searchTickets, searchUsers } from "../service/search.service";
import type { SearchTicketItem, SearchUserItem } from "../types/search.types";

const TICKET_PAGE_SIZE = 10;
const USER_PAGE_SIZE = 5;

function isNumericUserId(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

export interface UseGlobalTicketSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchTicketItem[];
  loading: boolean;
  error: string | null;
  userResults: SearchUserItem[];
  userLoading: boolean;
  userError: string | null;
  userPageNumber: number;
  userHasMore: boolean;
  userCanGoPrevious: boolean;
  goNextUserPage: () => void;
  goPreviousUserPage: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clear: () => void;
  pageNumber: number;
  hasMore: boolean;
  canGoPrevious: boolean;
  goNext: () => void;
  goPrevious: () => void;
}

/**
 * Debounced ticket search plus optional admin user results. Each result group
 * keeps its own cursor and request guard so paging one group cannot cancel or
 * overwrite the other group's response.
 */
export function useGlobalTicketSearch(
  debounceMs = 500,
  includeUsers = false,
): UseGlobalTicketSearchResult {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<SearchTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userResults, setUserResults] = useState<SearchUserItem[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [userPageIndex, setUserPageIndex] = useState(0);
  const [userPageCursors, setUserPageCursors] = useState<(string | null)[]>([
    null,
  ]);
  const [userHasMore, setUserHasMore] = useState(false);
  const [userNextCursor, setUserNextCursor] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const userAbortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const userRequestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (search: string, cursor: string | null) => {
      const trimmed = search.trim();
      if (trimmed.length < 3) return;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const response = await searchTickets(
          { search: trimmed, limit: TICKET_PAGE_SIZE, cursor },
          controller.signal,
        );

        if (
          controller.signal.aborted ||
          currentRequestId !== requestIdRef.current
        ) {
          return;
        }

        setResults(response.data);
        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
        setError(null);
        setLoading(false);
        setIsOpen(true);
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          currentRequestId !== requestIdRef.current
        ) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to search tickets",
        );
        setResults([]);
        setHasMore(false);
        setNextCursor(null);
        setLoading(false);
        setIsOpen(true);
      }
    },
    [],
  );

  const fetchUserPage = useCallback(
    async (search: string, cursor: string | null) => {
      const trimmed = search.trim();
      if (
        !includeUsers ||
        (trimmed.length < 3 && !isNumericUserId(trimmed))
      ) {
        return;
      }

      userAbortControllerRef.current?.abort();
      const controller = new AbortController();
      userAbortControllerRef.current = controller;
      const currentRequestId = ++userRequestIdRef.current;

      setUserResults([]);
      setUserLoading(true);
      setUserError(null);

      try {
        const response = await searchUsers(
          { search: trimmed, limit: USER_PAGE_SIZE, cursor },
          controller.signal,
        );

        if (
          controller.signal.aborted ||
          currentRequestId !== userRequestIdRef.current
        ) {
          return;
        }

        setUserResults(response.data);
        setUserHasMore(response.pagination.hasMore);
        setUserNextCursor(response.pagination.nextCursor);
        setUserError(null);
        setUserLoading(false);
        setIsOpen(true);
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          currentRequestId !== userRequestIdRef.current
        ) {
          return;
        }

        setUserError(getApiErrorMessage(err, "Failed to search users."));
        setUserResults([]);
        setUserHasMore(false);
        setUserNextCursor(null);
        setUserLoading(false);
        setIsOpen(true);
      }
    },
    [includeUsers],
  );

  const resetPages = useCallback(() => {
    setPageIndex(0);
    setPageCursors([null]);
    setHasMore(false);
    setNextCursor(null);
    setUserPageIndex(0);
    setUserPageCursors([null]);
    setUserHasMore(false);
    setUserNextCursor(null);
  }, []);

  const setQuery = useCallback(
    (newQuery: string) => {
      const trimmed = newQuery.trim();
      const canSearchTickets = trimmed.length >= 3;
      const canSearchUsers =
        includeUsers && (canSearchTickets || isNumericUserId(trimmed));

      setQueryState(newQuery);
      resetPages();
      requestIdRef.current += 1;
      userRequestIdRef.current += 1;
      abortControllerRef.current?.abort();
      userAbortControllerRef.current?.abort();
      abortControllerRef.current = null;
      userAbortControllerRef.current = null;
      setResults([]);
      setError(null);
      setUserResults([]);
      setUserError(null);
      setLoading(canSearchTickets);
      setUserLoading(canSearchUsers);

      if (!canSearchTickets && !canSearchUsers) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setIsOpen(false);
        return;
      }

      setIsOpen(true);
    },
    [includeUsers, resetPages],
  );

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    abortControllerRef.current?.abort();
    userAbortControllerRef.current?.abort();
    abortControllerRef.current = null;
    userAbortControllerRef.current = null;
    requestIdRef.current += 1;
    userRequestIdRef.current += 1;
    resetPages();
    setQueryState("");
    setResults([]);
    setError(null);
    setUserResults([]);
    setUserError(null);
    setLoading(false);
    setUserLoading(false);
    setIsOpen(false);
  }, [resetPages]);

  useEffect(() => {
    const trimmed = query.trim();
    const canSearchTickets = trimmed.length >= 3;
    const canSearchUsers =
      includeUsers && (canSearchTickets || isNumericUserId(trimmed));
    if (!canSearchTickets && !canSearchUsers) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    abortControllerRef.current?.abort();
    userAbortControllerRef.current?.abort();
    abortControllerRef.current = null;
    userAbortControllerRef.current = null;

    debounceTimerRef.current = setTimeout(() => {
      if (canSearchTickets) void fetchPage(trimmed, null);
      if (canSearchUsers) void fetchUserPage(trimmed, null);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, fetchPage, fetchUserPage, includeUsers]);

  const goNext = useCallback(() => {
    if (!hasMore || !nextCursor) return;

    const nextIndex = pageIndex + 1;
    setPageCursors((current) => {
      const updated = current.slice(0, pageIndex + 1);
      updated[nextIndex] = nextCursor;
      return updated;
    });
    setPageIndex(nextIndex);
    void fetchPage(query, nextCursor);
  }, [hasMore, nextCursor, pageIndex, query, fetchPage]);

  const goPrevious = useCallback(() => {
    if (pageIndex === 0) return;

    const previousIndex = pageIndex - 1;
    const previousCursor = pageCursors[previousIndex] ?? null;
    setPageIndex(previousIndex);
    void fetchPage(query, previousCursor);
  }, [pageIndex, pageCursors, query, fetchPage]);

  const goNextUserPage = useCallback(() => {
    if (!userHasMore || !userNextCursor) return;

    const nextIndex = userPageIndex + 1;
    setUserPageCursors((current) => {
      const updated = current.slice(0, userPageIndex + 1);
      updated[nextIndex] = userNextCursor;
      return updated;
    });
    setUserPageIndex(nextIndex);
    void fetchUserPage(query, userNextCursor);
  }, [userHasMore, userNextCursor, userPageIndex, query, fetchUserPage]);

  const goPreviousUserPage = useCallback(() => {
    if (userPageIndex === 0) return;

    const previousIndex = userPageIndex - 1;
    const previousCursor = userPageCursors[previousIndex] ?? null;
    setUserPageIndex(previousIndex);
    void fetchUserPage(query, previousCursor);
  }, [userPageIndex, userPageCursors, query, fetchUserPage]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    userResults,
    userLoading,
    userError,
    userPageNumber: userPageIndex + 1,
    userHasMore,
    userCanGoPrevious: userPageIndex > 0,
    goNextUserPage,
    goPreviousUserPage,
    isOpen,
    setIsOpen,
    clear,
    pageNumber: pageIndex + 1,
    hasMore,
    canGoPrevious: pageIndex > 0,
    goNext,
    goPrevious,
  };
}
