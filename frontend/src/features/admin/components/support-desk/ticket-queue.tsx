"use client";

import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  Inbox,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";

import {
  ADMIN_PRIORITIES,
  DATE_RANGES,
  type DateRangeValue,
} from "../../utils/admin-constants";
import { PRIORITY_BADGE_CLASSES } from "@/features/tickets/utils/ticket-badges";
import { avatarColorFor, initialsFor } from "../../utils/admin-format";
import type { AdminTicketRow, AdminQueueRow } from "../../types/admin.types";
import type { Category } from "@/features/categories/types/category.types";
import { StatusChip } from "./ticket-status-chip";

export function TicketQueue({
  showFilters,
  searchTerm,
  onSearchTermChange,
  categoryFilter,
  onCategoryFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dateCutoff,
  onDateCutoffChange,
  categories,
  listState,
  listError,
  retryList,
  tickets,
  selectedId,
  onSelect,
  checkedIds,
  onCheckedIdsChange,
  pageNumber,
  canGoPrevious,
  hasMore,
  onPrevious,
  onNext,
}: {
  showFilters: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  dateCutoff: DateRangeValue;
  onDateCutoffChange: (value: DateRangeValue) => void;
  categories: Category[];
  listState: "loading" | "success" | "error";
  listError: string | null;
  retryList: () => void;
  tickets: AdminQueueRow[];
  selectedId: string | null;
  onSelect: (ticket: AdminTicketRow) => void;
  checkedIds: Set<string>;
  onCheckedIdsChange: (update: (current: Set<string>) => Set<string>) => void;
  pageNumber: number;
  canGoPrevious: boolean;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <section
      aria-label="Ticket queue"
      className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden"
    >
      {/* Filters */}
      {showFilters && (
        <div className="p-4 sm:p-5 space-y-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search tickets by ID, subject, or requester..."
              aria-label="Search tickets"
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div className="relative">
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(event) => onCategoryFilterChange(event.target.value)}
                aria-label="Filter by category"
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              >
                <option value="ALL">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown className="size-3.5" />
              </div>
            </div>
            {/* Priority */}
            <div className="relative">
              <select
                id="filter-priority"
                value={priorityFilter}
                onChange={(event) => onPriorityFilterChange(event.target.value)}
                aria-label="Filter by priority"
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              >
                <option value="ALL">All Priorities</option>
                {ADMIN_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0) + priority.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown className="size-3.5" />
              </div>
            </div>
            {/* Date range */}
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <select
                id="filter-date"
                value={dateCutoff}
                onChange={(event) => onDateCutoffChange(event.target.value as DateRangeValue)}
                aria-label="Filter by created date"
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-8 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown className="size-3.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List body */}
      <div aria-live="polite">
        {listState === "loading" && (
          <div className="space-y-3 p-4 sm:p-5 animate-pulse" role="status" aria-label="Loading tickets">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3">
                <div className="size-3 rounded-sm bg-gray-100 shrink-0 mt-1" />
                <div className="size-9 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 rounded bg-gray-100" />
                  <div className="h-2.5 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {listState === "error" && (
          <div className="m-4 sm:m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 animate-in fade-in-50">
            <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-red-900">Could not load tickets</p>
              <p className="mt-0.5">{listError}</p>
              <button
                type="button"
                onClick={retryList}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
              >
                <Loader2 className="size-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {listState === "success" && tickets.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Inbox className="mx-auto size-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-600">
              No tickets found.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Try adjusting your search or filters.
            </p>
          </div>
        )}

        {listState === "success" && tickets.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              const selected = ticket.id === selectedId;
              const priority =
                ticket.adminPriority ?? ticket.userPriority;
              const checked = checkedIds.has(ticket.id);
              return (
                <li key={ticket.id}>
                  <div
                    className={`relative flex items-start gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 transition-colors ${
                      selected
                        ? "bg-[#EFF6FF]"
                        : "hover:bg-gray-50/70"
                    }`}
                  >
                    {selected && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#2563EB]"
                      />
                    )}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onCheckedIdsChange((current) => {
                          const next = new Set(current);
                          if (next.has(ticket.id)) {
                            next.delete(ticket.id);
                          } else {
                            next.add(ticket.id);
                          }
                          return next;
                        })
                      }
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select ticket ${ticket.ticketNumber}`}
                      className="mt-2.5 size-3.5 shrink-0 cursor-pointer rounded-sm border-gray-300 text-[#2563EB] focus:ring-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => onSelect(ticket)}
                      aria-current={selected ? "true" : undefined}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-lg"
                    >
                      <span
                        className={`size-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold ${avatarColorFor(ticket.userId)}`}
                        aria-hidden="true"
                      >
                        {initialsFor(`Requester ${ticket.userId}`)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs sm:text-[13px] font-semibold text-gray-900 truncate max-w-full sm:max-w-[240px]">
                            {ticket.subject}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              PRIORITY_BADGE_CLASSES[priority] ??
                              "border-gray-200 bg-gray-100 text-gray-600"
                            }`}
                          >
                            {priority}
                          </span>
                          <StatusChip
                            statusId={ticket.statusId}
                            name={ticket.status?.name ?? null}
                          />
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-gray-500 truncate">
                          {ticket.ticketNumber}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3 text-gray-400" />
                            Requester #{ticket.userId}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Folder className="size-3 text-gray-400" />
                            {ticket.category?.name ?? "—"}
                          </span>
                          <span className="ml-auto whitespace-nowrap text-gray-400">
                            {ticket.timeAgo}
                          </span>
                        </span>
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* List footer */}
      {listState === "success" && (
        <div className="border-t border-gray-100 px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Page {pageNumber}
            {tickets.length > 0
              ? ` · Showing ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`
              : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              aria-label="Previous page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasMore}
              aria-label="Next page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
