"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  Loader2,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { SupportDeskLayout } from "@/features/tickets/components/support-desk-layout";
import { useToast } from "@/components/ui/toaster";
import {
  acceptTicket,
  countTickets,
  getAdminApiErrorMessage,
  IN_PROGRESS_STATUS_ID,
  listPendingReviewTickets,
  rejectTicket,
  RESOLVED_STATUS_ID,
} from "@/features/admin/services/admin.service";
import type { AdminTicketRow } from "@/features/admin/types/admin.types";

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-sky-200 bg-sky-50 text-sky-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

const PRIORITY_FILTERS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "ALL", label: "All Time", days: null },
  { value: "TODAY", label: "Today", days: 1 },
  { value: "LAST_7_DAYS", label: "Last 7 days", days: 7 },
  { value: "LAST_30_DAYS", label: "Last 30 days", days: 30 },
];

const PAGE_SIZE = 10;

type StatTone = "blue" | "amber" | "green" | "gray";

const STAT_TONES: Record<
  StatTone,
  { border: string; iconBg: string; iconColor: string }
> = {
  blue: {
    border: "border-blue-200/70",
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#2563EB]",
  },
  amber: {
    border: "border-amber-200/70",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-amber-600",
  },
  green: {
    border: "border-emerald-200/70",
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-emerald-600",
  },
  gray: {
    border: "border-gray-200",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
};

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  tone: StatTone;
  icon: LucideIcon;
}) {
  const classes = STAT_TONES[tone];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 sm:px-5 py-4 shadow-xs transition-shadow hover:shadow-sm ${
        classes.border
      }`}
    >
      <div
        className={`size-10 sm:size-11 shrink-0 rounded-lg flex items-center justify-center ${classes.iconBg}`}
      >
        <Icon className={`size-5 ${classes.iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          {value === null ? "—" : value}
        </p>
      </div>
      <ChevronRight className="ml-auto size-4 text-gray-400 shrink-0" />
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function TicketReviewDashboard() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [actingTicketId, setActingTicketId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminTicketRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Summary card counts (all read live from the API; never hardcoded).
  const [stats, setStats] = useState<{
    inProgress: number | null;
    resolved: number | null;
    total: number | null;
  }>({ inProgress: null, resolved: null, total: null });

  // Toolbar filters + pagination (client-side over the fetched queue).
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<{
    value: string;
    cutoff: number | null;
  }>({ value: "ALL", cutoff: null });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    listPendingReviewTickets()
      .then((response) => {
        if (cancelled) return;
        setTickets(response.data);
        setState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(
          getAdminApiErrorMessage(
            err,
            "Failed to load the review queue. Please try again.",
          ),
        );
        setState("error");
      });

    // Summary counts are independent of the queue list; failures only
    // degrade the cards, never the review table.
    Promise.allSettled([
      countTickets({ statusId: IN_PROGRESS_STATUS_ID }),
      countTickets({ statusId: RESOLVED_STATUS_ID }),
      countTickets(),
    ]).then(([inProgress, resolved, total]) => {
      if (cancelled) return;
      setStats({
        inProgress:
          inProgress.status === "fulfilled" ? inProgress.value : null,
        resolved: resolved.status === "fulfilled" ? resolved.value : null,
        total: total.status === "fulfilled" ? total.value : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const pendingCount = useMemo(
    () => tickets.length,
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const cutoff = dateFilter.cutoff;

    return tickets.filter((ticket) => {
      const priority = ticket.adminPriority ?? ticket.userPriority;
      if (priorityFilter !== "ALL" && priority !== priorityFilter) {
        return false;
      }

      if (cutoff !== null && new Date(ticket.createdAt).getTime() < cutoff) {
        return false;
      }

      if (term) {
        const haystack = [
          ticket.ticketNumber,
          ticket.subject,
          ticket.category?.name ?? "",
          ticket.subCategory?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [tickets, searchTerm, priorityFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));

  // Clamp a stored page (e.g. after tickets resolve out of the queue) during
  // render instead of via an effect.
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(
    () =>
      filteredTickets.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredTickets, currentPage],
  );

  const rangeStart =
    filteredTickets.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredTickets.length);

  // Small centered window of page numbers, like the reference pager.
  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const result: number[] = [];
    for (let index = start; index <= end; index += 1) result.push(index);
    return result;
  }, [currentPage, totalPages]);

  const handleAccept = async (ticket: AdminTicketRow) => {
    if (actingTicketId) return;
    setActingTicketId(ticket.id);
    try {
      const response = await acceptTicket(ticket.id);
      setTickets((current) => current.filter((row) => row.id !== ticket.id));
      showSuccessToast({
        title: "Ticket accepted",
        description: `Ticket ${response.data.ticketNumber} is now ${response.data.status.toLowerCase()}.`,
      });
    } catch (err) {
      const message = getAdminApiErrorMessage(
        err,
        "Failed to accept the ticket. Please try again.",
      );
      showErrorToast({ title: "Accept failed", description: message });
    } finally {
      setActingTicketId(null);
    }
  };

  const startReject = (ticket: AdminTicketRow) => {
    setRejectTarget(ticket);
    setRejectReason("");
    setRejectError(null);
  };

  const cancelReject = () => {
    setRejectTarget(null);
    setRejectReason("");
    setRejectError(null);
  };

  const handleReject = async () => {
    if (!rejectTarget || isRejecting) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("A rejection reason is required.");
      return;
    }

    setIsRejecting(true);
    setRejectError(null);
    try {
      const response = await rejectTicket(rejectTarget.id, reason);
      setTickets((current) => current.filter((row) => row.id !== response.data.id));
      showSuccessToast({
        title: "Ticket rejected",
        description: `Ticket ${response.data.ticketNumber} was rejected and the requester has been notified.`,
      });
      cancelReject();
    } catch (err) {
      const message = getAdminApiErrorMessage(
        err,
        "Failed to reject the ticket. Please try again.",
      );
      setRejectError(message);
      showErrorToast({ title: "Reject failed", description: message });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link
          href="/admin/dashboard"
          className="hover:text-gray-800 transition-colors"
        >
          Admin
        </Link>
        <ChevronRight className="size-3.5 text-gray-400 stroke-[2.5]" />
        <span className="font-semibold text-gray-900">Ticket Review</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
          <ShieldCheck className="size-7 text-[#2563EB] shrink-0" />
          Ticket Review
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-2xl">
          Review newly submitted support requests. Accept a ticket to start
          working on it, or reject it with a reason.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Pending Review"
          value={pendingCount}
          tone="blue"
          icon={FileText}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          tone="amber"
          icon={Clock3}
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          tone="green"
          icon={CheckCircle2}
        />
        <StatCard
          label="Total Tickets"
          value={stats.total}
          tone="gray"
          icon={BarChart3}
        />
      </div>

      {/* Review Queue Card */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        {/* Toolbar: search + filters */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search tickets by ID, subject or category..."
              aria-label="Search tickets"
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Priority filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="priority-filter"
                className="text-xs font-medium text-gray-500 shrink-0"
              >
                Priority
              </label>
              <div className="relative w-full sm:w-40">
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(event) => {
                    setPriorityFilter(event.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                >
                  {PRIORITY_FILTERS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority === "ALL" ? "All Priorities" : priority}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <ChevronDown className="size-3.5" />
                </div>
              </div>
            </div>

            {/* Date range filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="date-range-filter"
                className="text-xs font-medium text-gray-500 shrink-0"
              >
                Date Range
              </label>
              <div className="relative w-full sm:w-40">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                <select
                  id="date-range-filter"
                  value={dateFilter.value}
                  onChange={(event) => {
                    const value = event.target.value;
                    const range = DATE_RANGES.find(
                      (entry) => entry.value === value,
                    );
                    const days = range?.days;
                    setDateFilter({
                      value,
                      cutoff:
                        days === null || days === undefined
                          ? null
                          : Date.now() - days * 86_400_000,
                    });
                    setPage(1);
                  }}
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
        </div>

        {/* Loading State */}
        {state === "loading" && (
          <div
            className="space-y-3 px-4 sm:px-6 pb-6 animate-pulse"
            role="status"
            aria-label="Loading review queue"
          >
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-12 rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="m-4 sm:m-6 mt-0 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3 animate-in fade-in-50">
            <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-red-900">
                Could not load review queue
              </p>
              <p className="mt-0.5">{errorMsg}</p>
              <button
                type="button"
                onClick={() => {
                  setState("loading");
                  setErrorMsg(null);
                  setRetryCount((count) => count + 1);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
              >
                <Loader2 className="size-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty Queue State */}
        {state === "success" && tickets.length === 0 && (
          <div className="px-6 py-12 text-center border-t border-gray-100">
            <Inbox className="mx-auto size-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-600">
              The review queue is empty.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              New tickets will appear here as soon as users submit them.
            </p>
          </div>
        )}

        {/* Queue Table */}
        {state === "success" && tickets.length > 0 && (
          <>
            <div className="border-t border-gray-100 overflow-x-auto">
              <table className="w-full text-xs sm:text-[13px] min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 sm:px-6 py-3 font-semibold">Ticket</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">
                      Created
                    </th>
                    <th className="px-4 sm:px-6 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 sm:px-6 py-10 text-center text-xs text-gray-400"
                      >
                        No tickets match your filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="align-middle hover:bg-gray-50/60"
                      >
                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/support-desk/${ticket.id}`}
                            className="font-mono font-semibold text-[#2563EB] hover:underline"
                          >
                            {ticket.ticketNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-gray-900 max-w-[180px] sm:max-w-[240px] truncate">
                            {ticket.subject}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-gray-600 whitespace-nowrap">
                          {ticket.category?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              PRIORITY_BADGE_CLASSES[
                                ticket.adminPriority ?? ticket.userPriority
                              ] ?? "border-gray-200 bg-gray-100 text-gray-600"
                            }`}
                          >
                            {ticket.adminPriority ?? ticket.userPriority}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-gray-400" />
                            {formatDate(ticket.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {rejectTarget?.id === ticket.id ? (
                              <span className="text-[11px] text-gray-400">
                                Rejection form below
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={actingTicketId !== null || isRejecting}
                                  onClick={() => handleAccept(ticket)}
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-[#DCFCE7] px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-emerald-700 hover:bg-emerald-100/70 transition-colors disabled:opacity-50"
                                >
                                  {actingTicketId === ticket.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-3.5" />
                                  )}
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={actingTicketId !== null || isRejecting}
                                  onClick={() => startReject(ticket)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-[#FEE2E2] px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-red-700 hover:bg-red-100/70 transition-colors disabled:opacity-50"
                                >
                                  <X className="size-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Reject reason form */}
            {rejectTarget && (
              <div className="border-t border-red-100 bg-red-50/50 p-4 sm:p-6 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-gray-900">
                    Reject {rejectTarget.ticketNumber} — a reason is required and
                    will be visible to the requester.
                  </p>
                  <button
                    type="button"
                    onClick={cancelReject}
                    disabled={isRejecting}
                    className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
                    aria-label="Cancel rejection"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    if (rejectError) setRejectError(null);
                  }}
                  rows={3}
                  maxLength={2000}
                  disabled={isRejecting}
                  placeholder="Explain why this request cannot be fulfilled right now..."
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                    rejectError
                      ? "border-red-400 focus:ring-red-200"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                  } disabled:opacity-60`}
                />
                {rejectError && (
                  <p className="text-[11px] text-red-500 font-medium" role="alert">
                    {rejectError}
                  </p>
                )}
                <p className="text-[11px] text-gray-400">
                  {rejectReason.length}/2000
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isRejecting || rejectReason.trim() === ""}
                    className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRejecting && <Loader2 className="size-3.5 animate-spin" />}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {/* Card footer: count + pagination */}
            <div className="border-t border-gray-100 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {totalPages === 1
                  ? `Showing ${filteredTickets.length} of ${filteredTickets.length} tickets`
                  : `Showing ${rangeStart}–${rangeEnd} of ${filteredTickets.length} tickets`}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (current) => Math.max(1, Math.min(current, currentPage) - 1),
                    )
                  }
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                      pageNumber === currentPage
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          Math.max(1, Math.min(current, currentPage)) + 1,
                        ),
                    )
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Admin dashboard: the server-side-guarded review queue entry point.
 * Permission is enforced by the backend (`@Roles(ADMIN)`); this route guard
 * only redirects for convenience.
 */
export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole={USER_ROLE.ADMIN}>
      <SupportDeskLayout>
        <div className="mx-auto w-full max-w-7xl">
          <TicketReviewDashboard />
        </div>
      </SupportDeskLayout>
    </ProtectedRoute>
  );
}
