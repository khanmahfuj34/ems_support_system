"use client";

import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  Inbox,
  LifeBuoy,
  Loader2,
  Plus,
  Search,
  Ticket,
} from "lucide-react";

import { PRIORITY_BADGE_CLASSES } from "@/features/tickets/utils/ticket-badges";
import { useMyTickets } from "@/features/tickets/hooks/use-my-tickets";
import type { TicketListRow } from "@/features/tickets/types/ticket.types";

/** Seeded ticket_statuses lookup ids (see backend prisma/seed.ts). */
const TICKET_STATUS_ID = {
  OPEN: 1,
  PENDING_REVIEW: 2,
  ACCEPTED: 3,
  IN_PROGRESS: 4,
  WAITING_FOR_USER: 5,
  RESOLVED: 6,
  CLOSED: 7,
  REJECTED: 8,
  REOPENED: 9,
} as const;

const STATUS_BADGE_CLASSES: Record<number, string> = {
  [TICKET_STATUS_ID.OPEN]: "border-blue-200 bg-blue-50 text-blue-700",
  [TICKET_STATUS_ID.PENDING_REVIEW]: "border-blue-200 bg-blue-50 text-blue-700",
  [TICKET_STATUS_ID.ACCEPTED]: "border-sky-200 bg-sky-50 text-sky-700",
  [TICKET_STATUS_ID.IN_PROGRESS]: "border-amber-200 bg-amber-50 text-amber-700",
  [TICKET_STATUS_ID.WAITING_FOR_USER]:
    "border-amber-200 bg-amber-50 text-amber-700",
  [TICKET_STATUS_ID.RESOLVED]:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  [TICKET_STATUS_ID.CLOSED]: "border-gray-200 bg-gray-100 text-gray-600",
  [TICKET_STATUS_ID.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [TICKET_STATUS_ID.REOPENED]: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const STATUS_BADGE_FALLBACK = "border-gray-200 bg-gray-100 text-gray-600";

const PRIORITY_FILTER_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function statusLabel(name: string) {
  return name
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function CountCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconBg,
  iconColor,
  active,
  onClick,
}: {
  label: string;
  value: number | null;
  sublabel: string;
  icon: typeof Ticket;
  iconBg: string;
  iconColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 sm:px-5 py-4 text-left shadow-xs transition-colors ${
        active
          ? "border-blue-300 bg-[#F5F8FF]"
          : "border-gray-200/80 hover:bg-gray-50/70"
      }`}
    >
      <span
        className={`size-10 sm:size-11 shrink-0 rounded-lg flex items-center justify-center ${iconBg}`}
      >
        <Icon className={`size-5 ${iconColor}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs sm:text-sm font-medium text-gray-700 truncate">
          {label}
        </span>
        <span className="block text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          {value === null ? "—" : value}
        </span>
        <span className="block text-[10px] sm:text-[11px] text-gray-400 truncate">
          {sublabel}
        </span>
      </span>
    </button>
  );
}

function StatusBadge({
  statusId,
  name,
}: {
  statusId: number;
  name: string | null;
}) {
  const icon =
    statusId === TICKET_STATUS_ID.RESOLVED ? (
      <CheckCircle2 className="size-3" />
    ) : statusId === TICKET_STATUS_ID.IN_PROGRESS ? (
      <Clock3 className="size-3" />
    ) : null;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        STATUS_BADGE_CLASSES[statusId] ?? STATUS_BADGE_FALLBACK
      }`}
    >
      {icon}
      {statusLabel(name ?? "unknown")}
    </span>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="m-4 sm:m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 animate-in fade-in-50">
      <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <p className="font-semibold text-red-900">Could not load tickets</p>
        <p className="mt-0.5">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
        >
          <Loader2 className="size-3" />
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
}) {
  if (hasActiveFilters) {
    return (
      <div className="px-6 py-12 text-center">
        <Inbox className="mx-auto size-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">
          No tickets match your search or filters.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Try a different keyword, or reset the filters below.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-12 text-center">
      <LifeBuoy className="mx-auto size-8 text-gray-300" />
      <p className="mt-2 text-sm font-medium text-gray-600">
        No support requests yet.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        When you submit a request, it will appear here.
      </p>
      <Link
        href="/support-desk/new"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors shadow-xs"
      >
        <Plus className="size-4" />
        Create Support Request
      </Link>
    </div>
  );
}

function DesktopTable({ tickets }: { tickets: TicketListRow[] }) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {[
              "Ticket ID",
              "Subject",
              "Category",
              "Priority",
              "Status",
              "Created",
              "Last Updated",
              "",
            ].map((heading, index) => (
              <th
                key={heading || "actions"}
                scope="col"
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap ${
                  index === 1 ? "min-w-[220px]" : ""
                }`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => {
            const priority = ticket.adminPriority ?? ticket.userPriority;
            return (
              <tr
                key={ticket.id}
                className="text-xs text-gray-700 transition-colors hover:bg-gray-50/70"
              >
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-mono text-[11px] font-medium text-[#2563EB]">
                    {ticket.ticketNumber}
                  </span>
                </td>
                <td className="px-4 py-3.5 max-w-[260px]">
                  <span className="block font-semibold text-gray-900 truncate">
                    {ticket.subject}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                  {ticket.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      PRIORITY_BADGE_CLASSES[priority] ??
                      "border-gray-200 bg-gray-100 text-gray-600"
                    }`}
                  >
                    {priority}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge
                    statusId={ticket.statusId}
                    name={ticket.status?.name ?? null}
                  />
                </td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3 text-gray-400" />
                    {formatDate(ticket.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                  {formatDate(ticket.updatedAt)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <Link
                    href={`/support-desk/${ticket.id}`}
                    className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                  >
                    View Details
                    <ChevronRight className="size-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({ tickets }: { tickets: TicketListRow[] }) {
  return (
    <ul className="md:hidden divide-y divide-gray-100">
      {tickets.map((ticket) => {
        const priority = ticket.adminPriority ?? ticket.userPriority;
        return (
          <li key={ticket.id} className="px-4 py-3.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-[#2563EB]">
                {ticket.ticketNumber}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  PRIORITY_BADGE_CLASSES[priority] ??
                  "border-gray-200 bg-gray-100 text-gray-600"
                }`}
              >
                {priority}
              </span>
              <StatusBadge
                statusId={ticket.statusId}
                name={ticket.status?.name ?? null}
              />
            </div>
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">
              {ticket.subject}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="size-3 text-gray-400" />
                {ticket.category?.name ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3 text-gray-400" />
                Created {formatDate(ticket.createdAt)}
              </span>
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400">
                Updated {formatDate(ticket.updatedAt)}
              </span>
              <Link
                href={`/support-desk/${ticket.id}`}
                className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
              >
                View Details
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MyTickets() {
  const {
    tickets,
    listState,
    listError,
    retryList,
    pageNumber,
    canGoPrevious,
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
  } = useMyTickets();

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    categoryIdFilter !== "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryIdFilter("ALL");
  };

  const selectClass =
    "w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link
          href="/dashboard"
          className="hover:text-gray-800 transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-3.5 text-gray-400 stroke-[2.5]" />
        <span className="font-semibold text-gray-900">My Tickets</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="size-9 mt-0.5 rounded-lg bg-[#EFF6FF] border border-blue-100 flex items-center justify-center shrink-0">
            <Ticket className="size-5 text-[#2563EB]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
              My Tickets
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500 max-w-2xl">
              Track and manage your support requests.
            </p>
          </div>
        </div>

        <Link
          href="/support-desk/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors shadow-xs"
        >
          <Plus className="size-4" />
          New Ticket
        </Link>
      </div>

      {/* Summary cards: click a card to filter the list by that exact status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <CountCard
          label="Total Tickets"
          value={counts.total}
          sublabel="All time"
          icon={FolderOpen}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
          active={statusFilter === "ALL"}
          onClick={() => setStatusFilter("ALL")}
        />
        <CountCard
          label="Pending Review"
          value={counts.pending}
          sublabel="Awaiting first action"
          icon={FileText}
          iconBg="bg-[#DBEAFE]"
          iconColor="text-[#2563EB]"
          active={statusFilter === TICKET_STATUS_ID.PENDING_REVIEW}
          onClick={() =>
            setStatusFilter(
              statusFilter === TICKET_STATUS_ID.PENDING_REVIEW
                ? "ALL"
                : TICKET_STATUS_ID.PENDING_REVIEW,
            )
          }
        />
        <CountCard
          label="In Progress"
          value={counts.inProgress}
          sublabel="Being handled"
          icon={Clock3}
          iconBg="bg-[#FEF3C7]"
          iconColor="text-amber-600"
          active={statusFilter === TICKET_STATUS_ID.IN_PROGRESS}
          onClick={() =>
            setStatusFilter(
              statusFilter === TICKET_STATUS_ID.IN_PROGRESS
                ? "ALL"
                : TICKET_STATUS_ID.IN_PROGRESS,
            )
          }
        />
        <CountCard
          label="Resolved"
          value={counts.resolved}
          sublabel="Completed"
          icon={CheckCircle2}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-emerald-600"
          active={statusFilter === TICKET_STATUS_ID.RESOLVED}
          onClick={() =>
            setStatusFilter(
              statusFilter === TICKET_STATUS_ID.RESOLVED
                ? "ALL"
                : TICKET_STATUS_ID.RESOLVED,
            )
          }
        />
      </div>

      {/* Ticket list */}
      <section
        aria-label="My tickets"
        aria-busy={listState === "loading"}
        className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden"
      >
        {/* Search + filters */}
        <div className="p-4 sm:p-5 space-y-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by ticket ID or subject..."
              aria-label="Search tickets by ID or subject"
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <select
                id="my-tickets-status"
                value={statusFilter === "ALL" ? "ALL" : statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value === "ALL"
                      ? "ALL"
                      : Number(event.target.value),
                  )
                }
                aria-label="Filter by status"
                className={selectClass}
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(TICKET_STATUS_ID).map(([key, statusId]) => (
                  <option key={statusId} value={statusId}>
                    {statusLabel(key)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown className="size-3.5" />
              </div>
            </div>
            <div className="relative">
              <select
                id="my-tickets-priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filter by priority"
                className={selectClass}
              >
                <option value="ALL">All Priorities</option>
                {PRIORITY_FILTER_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0) + priority.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown className="size-3.5" />
              </div>
            </div>
            <div className="relative">
              <select
                id="my-tickets-category"
                value={categoryIdFilter}
                onChange={(event) => setCategoryIdFilter(event.target.value)}
                aria-label="Filter by category"
                className={selectClass}
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
          </div>
        </div>

        {/* Body states */}
        <div aria-live="polite">
          {listState === "loading" ? (
            <div
              className="p-4 sm:p-5 space-y-4 animate-pulse"
              role="status"
              aria-label="Loading tickets"
            >
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="h-10 rounded-md bg-gray-100" />
              ))}
            </div>
          ) : listState === "error" ? (
            <ErrorState message={listError ?? ""} onRetry={retryList} />
          ) : tickets.length === 0 ? (
            <EmptyState
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
            />
          ) : (
            <>
              <DesktopTable tickets={tickets} />
              <MobileCards tickets={tickets} />
            </>
          )}
        </div>

        {/* Pagination: keyset cursors support Prev/Next only */}
        {listState === "success" && tickets.length > 0 && (
          <div className="border-t border-gray-100 px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Page {pageNumber} · Showing {tickets.length} ticket
              {tickets.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrevious}
                disabled={!canGoPrevious}
                aria-label="Previous page"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
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
    </div>
  );
}
