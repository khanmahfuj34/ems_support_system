"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchTickets } from "../service/search.service";
import type { SearchTicketItem } from "../types/search.types";

const PAGE_SIZE = 10;

export interface UseGlobalTicketSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchTicketItem[];
  loading: boolean;
  error: string | null;
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
 * Hook providing debounced global ticket search with cursor pagination,
 * request cancellation, and out-of-order response guarding.
 */
export function useGlobalTicketSearch(debounceMs = 500): UseGlobalTicketSearchResult {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<SearchTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (search: string, cursor: string | null) => {
      const trimmed = search.trim();
      if (trimmed.length < 3) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const response = await searchTickets(
          { search: trimmed, limit: PAGE_SIZE, cursor },
          controller.signal,
        );

        // Guard against stale response if a newer query/page was issued.
        if (currentRequestId !== requestIdRef.current) return;

        setResults(response.data);
        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
        setError(null);
        setLoading(false);
        setIsOpen(true);
      } catch (err: unknown) {
        // Discard aborted or superseded network requests.
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

  const resetPages = useCallback(() => {
    setPageIndex(0);
    setPageCursors([null]);
    setHasMore(false);
    setNextCursor(null);
  }, []);

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);
      resetPages();
      // Immediately invalidate any in-flight response from the prior query.
      requestIdRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setResults([]);
      setError(null);

      if (newQuery.trim().length < 3) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setLoading(false);
        setIsOpen(false);
        return;
      }

      setLoading(true);
    },
    [resetPages],
  );

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    requestIdRef.current += 1;
    resetPages();
    setQueryState("");
    setResults([]);
    setError(null);
    setLoading(false);
    setIsOpen(false);
  }, [resetPages]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      return;
    }

    // Cancel existing pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Abort any in-flight HTTP request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(() => {
      void fetchPage(trimmed, null);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, fetchPage]);

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

  return {
    query,
    setQuery,
    results,
    loading,
    error,
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
