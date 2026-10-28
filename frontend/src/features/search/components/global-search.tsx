"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
  Loader2,
  Search,
  Ticket,
  X,
} from "lucide-react";

import { useGlobalTicketSearch } from "../hooks/use-global-ticket-search";
import type { SearchTicketItem } from "../types/search.types";
import { StatusChip } from "@/features/admin/components/support-desk/ticket-status-chip";

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
}

/**
 * Safely highlights matching query substrings without using innerHTML.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed || !text) {
    return <>{text}</>;
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            className="bg-blue-100 text-blue-900 font-semibold rounded-xs px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Keeps the API-provided plain-text preview concise for the search result.
 */
function getExcerpt(preview?: string, maxLength = 80): string | null {
  if (!preview) return null;
  const plainText = preview.replace(/\s+/g, " ").trim();
  if (!plainText) return null;
  if (plainText.length <= maxLength) return plainText;

  const boundary = plainText.lastIndexOf(" ", maxLength);
  return boundary > 0
    ? `${plainText.slice(0, boundary)}…`
    : `${plainText.slice(0, maxLength)}…`;
}

export function GlobalSearch({
  className = "",
  placeholder = "Search tickets, categories, numbers...",
}: GlobalSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    setIsOpen,
    clear,
    pageNumber,
    hasMore,
    canGoPrevious,
    goNext,
    goPrevious,
  } = useGlobalTicketSearch(500);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [prevResults, setPrevResults] = useState(results);

  // Reset active index whenever search results change
  if (results !== prevResults) {
    setPrevResults(results);
    setActiveIndex(-1);
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [setIsOpen]);

  const handleSelectTicket = (ticket: SearchTicketItem) => {
    setIsOpen(false);
    router.push(`/support-desk/${ticket.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      if (results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelectTicket(results[activeIndex]);
        } else if (results.length > 0) {
          handleSelectTicket(results[0]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const showDropdown =
    isOpen && (query.trim().length >= 3 || loading || error !== null);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <label htmlFor="global-ticket-search-input" className="sr-only">
          Search tickets
        </label>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-blue-600" />
          ) : (
            <Search className="size-4" />
          )}
        </div>

        <input
          id="global-ticket-search-input"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (!isOpen && val.trim().length >= 3) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (query.trim().length >= 3) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
          }
          className="w-full bg-[#F3F4F6] border-none rounded-lg pl-9 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            aria-label="Clear search query"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="absolute left-0 top-full mt-1.5 w-[min(440px,calc(100vw-2rem))] sm:w-[440px] md:w-[480px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          >
          {/* Header indicator */}
          <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 bg-gray-50/60">
            <span className="font-medium">
              {loading
                ? "Searching tickets..."
                : error
                  ? "Search failed"
                  : results.length > 0
                    ? `Page ${pageNumber} · ${results.length} ticket${results.length === 1 ? "" : "s"}`
                    : "No matching tickets"}
            </span>
            <span className="hidden sm:inline text-gray-400 text-[10px]">
              ↑↓ navigate • ↵ select • esc close
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
            {loading && results.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-gray-400 gap-2">
                <Loader2 className="size-5 animate-spin text-blue-600" />
                <span>Searching support desk tickets...</span>
              </div>
            )}

            {error && (
              <div className="p-4 flex items-center gap-2.5 text-xs text-red-600 bg-red-50/50">
                <AlertCircle className="size-4 shrink-0 text-red-500" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {!loading && !error && results.length === 0 && query.trim().length >= 3 && (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-xs text-gray-500 gap-1.5">
                <Ticket className="size-6 text-gray-300 stroke-1" />
                <p className="font-medium text-gray-700">No tickets found</p>
                <p className="text-[11px] text-gray-400 max-w-[260px]">
                  No tickets matched &ldquo;{query.trim()}&rdquo;. Try searching by ID, subject, or category.
                </p>
              </div>
            )}

            {results.map((ticket, index) => {
              const isActive = activeIndex === index;
              const excerpt = getExcerpt(ticket.descriptionPreview);

              return (
                <div
                  key={ticket.id}
                  id={`search-item-${index}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isActive ? "bg-blue-50/70" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-blue-600 shrink-0">
                        <HighlightMatch
                          text={ticket.ticketNumber}
                          query={query}
                        />
                      </span>
                      {ticket.category && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 truncate shrink-0">
                          <Folder className="size-2.5 text-gray-400" />
                          <HighlightMatch
                            text={ticket.category.name}
                            query={query}
                          />
                        </span>
                      )}
                    </div>

                    {/* Status Chip */}
                    <div className="shrink-0">
                      <StatusChip
                        statusId={ticket.statusId}
                        name={ticket.status?.name ?? null}
                      />
                    </div>
                  </div>

                  {/* Subject line */}
                  <h4 className="text-xs font-medium text-gray-900 leading-snug line-clamp-1 mb-1">
                    <HighlightMatch text={ticket.subject} query={query} />
                  </h4>

                  {/* Excerpt if present */}
                  {excerpt && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 mb-1.5 leading-relaxed">
                      <HighlightMatch text={excerpt} query={query} />
                    </p>
                  )}

                  {/* Date & Metadata */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="size-2.5" />
                      {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {ticket.userPriority && (
                      <span className="uppercase text-[9px] font-semibold tracking-wider text-gray-500">
                        {ticket.userPriority}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading &&
            !error &&
            query.trim().length >= 3 &&
            (results.length > 0 || pageNumber > 1) && (
              <div className="border-t border-gray-100 px-3.5 py-2 flex items-center justify-between gap-3 text-[11px] text-gray-500 bg-gray-50/60">
                <span>Page {pageNumber}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={goPrevious}
                    disabled={!canGoPrevious}
                    aria-label="Previous results page"
                    className="inline-flex size-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!hasMore}
                    aria-label="Next results page"
                    className="inline-flex size-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
