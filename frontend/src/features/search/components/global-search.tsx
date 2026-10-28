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
  UserRound,
  X,
} from "lucide-react";

import { useGlobalTicketSearch } from "../hooks/use-global-ticket-search";
import type { SearchTicketItem, SearchUserItem } from "../types/search.types";
import { StatusChip } from "@/features/admin/components/support-desk/ticket-status-chip";
import { USER_ROLE } from "@/features/auth/types/auth.types";

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  isAdmin?: boolean;
}

type SearchOption =
  | { kind: "user"; item: SearchUserItem }
  | { kind: "ticket"; item: SearchTicketItem };

function isNumericUserId(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

/** Safely highlights matching query text without using innerHTML. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed || !text) return <>{text}</>;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            className="rounded-xs bg-blue-100 px-0.5 font-semibold text-blue-900"
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

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "?";
}

function UserPagination({
  pageNumber,
  canGoPrevious,
  hasMore,
  goPrevious,
  goNext,
}: {
  pageNumber: number;
  canGoPrevious: boolean;
  hasMore: boolean;
  goPrevious: () => void;
  goNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-3.5 py-1.5 text-[10px] text-gray-500">
      <span>User results · page {pageNumber}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous user results page"
          className="inline-flex size-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasMore}
          aria-label="Next user results page"
          className="inline-flex size-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function GlobalSearch({
  className = "",
  placeholder = "Search tickets, categories, numbers...",
  isAdmin = false,
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
    userResults,
    userLoading,
    userError,
    userPageNumber,
    userHasMore,
    userCanGoPrevious,
    goNextUserPage,
    goPreviousUserPage,
    isOpen,
    setIsOpen,
    clear,
    pageNumber,
    hasMore,
    canGoPrevious,
    goNext,
    goPrevious,
  } = useGlobalTicketSearch(500, isAdmin);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [previousResults, setPreviousResults] = useState(results);
  const [previousUserResults, setPreviousUserResults] = useState(userResults);
  if (results !== previousResults || userResults !== previousUserResults) {
    setPreviousResults(results);
    setPreviousUserResults(userResults);
    setActiveIndex(-1);
  }

  const userOptions: SearchOption[] = userResults.map((item) => ({
    kind: "user",
    item,
  }));
  const ticketOptions: SearchOption[] = results.map((item) => ({
    kind: "ticket",
    item,
  }));
  const options = [...userOptions, ...ticketOptions];
  const trimmedQuery = query.trim();
  const canSearchUsers =
    isAdmin &&
    (trimmedQuery.length >= 3 || isNumericUserId(trimmedQuery));
  const canSearchTickets = trimmedQuery.length >= 3;

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

  const handleSelect = (option: SearchOption) => {
    setIsOpen(false);
    if (option.kind === "user") {
      router.push(`/admin/users/${option.item.id}`);
    } else {
      router.push(`/support-desk/${option.item.id}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      if (options.length > 0) setIsOpen(true);
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        if (options.length === 0) return;
        event.preventDefault();
        setActiveIndex((previous) =>
          previous < options.length - 1 ? previous + 1 : 0,
        );
        break;
      case "ArrowUp":
        if (options.length === 0) return;
        event.preventDefault();
        setActiveIndex((previous) =>
          previous > 0 ? previous - 1 : options.length - 1,
        );
        break;
      case "Enter":
        if (options.length === 0) return;
        event.preventDefault();
        handleSelect(options[activeIndex >= 0 ? activeIndex : 0]);
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
    isOpen &&
    Boolean(
      canSearchTickets ||
        canSearchUsers ||
        loading ||
        userLoading ||
        error ||
        userError,
    );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <label htmlFor="global-ticket-search-input" className="sr-only">
          Search tickets and users
        </label>
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading || userLoading ? (
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
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (
              !isOpen &&
              (value.trim().length >= 3 ||
                (isAdmin && isNumericUserId(value.trim())))
            ) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (
              trimmedQuery.length >= 3 ||
              (isAdmin && isNumericUserId(trimmedQuery))
            ) {
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
          className="w-full rounded-lg border-none bg-[#F3F4F6] py-1.5 pl-9 pr-8 text-xs text-gray-800 transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            aria-label="Clear search query"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={isAdmin ? "User and ticket search results" : "Ticket search results"}
          className="absolute left-0 top-full z-50 mt-1.5 w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in-50 zoom-in-95 duration-150 sm:w-[440px] md:w-[480px]"
        >
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-3.5 py-2 text-[11px] text-gray-500">
            <span className="font-medium" aria-live="polite">
              {loading || userLoading
                ? isAdmin
                  ? "Searching users and tickets..."
                  : "Searching tickets..."
                : error || userError
                  ? "Some search results could not be loaded"
                  : "Search results"}
            </span>
            <span className="hidden text-[10px] text-gray-400 sm:inline">
              ↑↓ navigate · ↵ select · esc close
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
            {isAdmin && canSearchUsers && (
              <section role="group" aria-label="Users">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur">
                  <span>Users</span>
                  {!userLoading && !userError && userResults.length > 0 && (
                    <span className="font-normal normal-case tracking-normal text-gray-400">
                      {userResults.length} result{userResults.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {userLoading && (
                  <div className="flex items-center gap-2 px-4 py-4 text-xs text-gray-400">
                    <Loader2 className="size-4 animate-spin text-blue-600" />
                    <span>Searching users...</span>
                  </div>
                )}

                {userError && (
                  <div className="flex items-center gap-2.5 bg-red-50/50 p-3.5 text-xs text-red-600">
                    <AlertCircle className="size-4 shrink-0 text-red-500" />
                    <span className="truncate">{userError}</span>
                  </div>
                )}

                {!userLoading && !userError && userResults.length === 0 && (
                  <div className="px-4 py-4 text-xs text-gray-500">
                    No matching users
                  </div>
                )}

                {!userLoading &&
                  userResults.map((user, index) => {
                    const isActive = activeIndex === index;
                    const role =
                      user.roleId === USER_ROLE.ADMIN ? "Admin" : "User";

                    return (
                      <div
                        key={user.id}
                        id={`search-item-${index}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect({ kind: "user", item: user })}
                        className={`flex min-w-0 cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors ${
                          isActive ? "bg-blue-50/70" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-xs font-medium text-gray-900">
                              <HighlightMatch text={user.name} query={query} />
                            </span>
                            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-500">
                              ID {user.id}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-gray-500">
                            <HighlightMatch text={user.email} query={query} />
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-[9px] font-medium">
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">
                              {role}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 ${
                                user.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                        <UserRound className="size-3.5 shrink-0 text-gray-300" />
                      </div>
                    );
                  })}

                {!userLoading &&
                  !userError &&
                  (userResults.length > 0 || userPageNumber > 1) && (
                    <UserPagination
                      pageNumber={userPageNumber}
                      canGoPrevious={userCanGoPrevious}
                      hasMore={userHasMore}
                      goPrevious={goPreviousUserPage}
                      goNext={goNextUserPage}
                    />
                  )}
              </section>
            )}

            {canSearchTickets && (
              <section role="group" aria-label="Tickets">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur">
                  <span>Tickets</span>
                  {!loading && !error && (
                    <span className="font-normal normal-case tracking-normal text-gray-400">
                      Page {pageNumber} · {results.length} result{results.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {loading && results.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-4 text-xs text-gray-400">
                    <Loader2 className="size-4 animate-spin text-blue-600" />
                    <span>Searching tickets...</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2.5 bg-red-50/50 p-3.5 text-xs text-red-600">
                    <AlertCircle className="size-4 shrink-0 text-red-500" />
                    <span className="truncate">{error}</span>
                  </div>
                )}

                {!loading && !error && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 text-center text-xs text-gray-500">
                    <Ticket className="size-5 text-gray-300 stroke-1" />
                    <p className="font-medium text-gray-700">No matching tickets</p>
                  </div>
                )}

                {!loading &&
                  results.map((ticket, index) => {
                    const optionIndex = userResults.length + index;
                    const isActive = activeIndex === optionIndex;
                    const excerpt = getExcerpt(ticket.descriptionPreview);

                    return (
                      <div
                        key={ticket.id}
                        id={`search-item-${optionIndex}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(optionIndex)}
                        onClick={() => handleSelect({ kind: "ticket", item: ticket })}
                        className={`cursor-pointer p-3 transition-colors ${
                          isActive ? "bg-blue-50/70" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 font-mono text-[11px] font-semibold text-blue-600">
                              <HighlightMatch text={ticket.ticketNumber} query={query} />
                            </span>
                            {ticket.category && (
                              <span className="inline-flex shrink-0 items-center gap-1 truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                <Folder className="size-2.5 text-gray-400" />
                                <HighlightMatch text={ticket.category.name} query={query} />
                              </span>
                            )}
                          </div>
                          <div className="shrink-0">
                            <StatusChip
                              statusId={ticket.statusId}
                              name={ticket.status?.name ?? null}
                            />
                          </div>
                        </div>

                        <h4 className="mb-1 line-clamp-1 text-xs font-medium leading-snug text-gray-900">
                          <HighlightMatch text={ticket.subject} query={query} />
                        </h4>

                        {excerpt && (
                          <p className="mb-1.5 line-clamp-1 text-[11px] leading-relaxed text-gray-500">
                            <HighlightMatch text={excerpt} query={query} />
                          </p>
                        )}

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
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                              {ticket.userPriority}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {!loading &&
                  !error &&
                  (results.length > 0 || pageNumber > 1) && (
                    <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-3.5 py-2 text-[11px] text-gray-500">
                      <span>Ticket page {pageNumber}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={goPrevious}
                          disabled={!canGoPrevious}
                          aria-label="Previous ticket results page"
                          className="inline-flex size-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={goNext}
                          disabled={!hasMore}
                          aria-label="Next ticket results page"
                          className="inline-flex size-6 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
