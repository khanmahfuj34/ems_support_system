"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchTickets } from "../service/search.service";
import type { SearchTicketItem } from "../types/search.types";

export interface UseGlobalTicketSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchTicketItem[];
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clear: () => void;
}

/**
 * Hook providing debounced global ticket search with request cancellation,
 * out-of-order response guarding, and state management.
 */
export function useGlobalTicketSearch(debounceMs = 500): UseGlobalTicketSearchResult {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<SearchTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    if (newQuery.trim().length < 3) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setResults([]);
      setError(null);
      setLoading(false);
      setIsOpen(false);
    }
  }, []);

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setQueryState("");
    setResults([]);
    setError(null);
    setLoading(false);
    setIsOpen(false);
  }, []);

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

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const currentRequestId = ++requestIdRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await searchTickets(
          { search: trimmed, limit: 8 },
          controller.signal,
        );

        // Guard against stale response if a newer query was issued
        if (currentRequestId === requestIdRef.current) {
          setResults(response.data);
          setError(null);
          setLoading(false);
          setIsOpen(true);
        }
      } catch (err: unknown) {
        // Discard aborted network requests
        if (controller.signal.aborted) {
          return;
        }

        if (currentRequestId === requestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to search tickets",
          );
          setResults([]);
          setLoading(false);
          setIsOpen(true);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debounceMs]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    setIsOpen,
    clear,
  };
}
