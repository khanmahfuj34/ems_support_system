"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { useReviewQueue } from "../../hooks/use-review-queue";
import { ADMIN_PAGE_SIZE, DATE_RANGES, type DateRangeValue } from "../../utils/admin-constants";
import { buildPageItems } from "../../utils/pagination";
import { ReviewSummaryCards } from "./review-summary-cards";
import { ReviewQueueToolbar } from "./review-queue-toolbar";
import { ReviewQueueTable } from "./review-queue-table";
import { ReviewRejectForm } from "./review-reject-form";

export function TicketReviewDashboard() {
  const {
    state,
    tickets,
    errorMsg,
    stats,
    actingTicketId,
    rejectTarget,
    rejectReason,
    rejectError,
    isRejecting,
    setRejectReason,
    clearRejectError,
    handleAccept,
    startReject,
    cancelReject,
    handleReject,
    retry,
  } = useReviewQueue();

  // Toolbar filters + pagination (client-side over the fetched queue).
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>("ALL");
  const [dateCutoff, setDateCutoff] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const handleDateRangeChange = (value: DateRangeValue) => {
    const days = DATE_RANGES.find((range) => range.value === value)?.days;
    setDateRangeValue(value);
    // Freeze the cutoff at selection time, exactly like the original form.
    setDateCutoff(
      days === null || days === undefined
        ? null
        : Date.now() - days * 86_400_000,
    );
    setPage(1);
  };

  const pendingCount = useMemo(
    () => tickets.length,
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const priority = ticket.adminPriority ?? ticket.userPriority;
      if (priorityFilter !== "ALL" && priority !== priorityFilter) {
        return false;
      }

      if (dateCutoff !== null && new Date(ticket.createdAt).getTime() < dateCutoff) {
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
  }, [tickets, searchTerm, priorityFilter, dateCutoff]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ADMIN_PAGE_SIZE));

  // Clamp a stored page (e.g. after tickets resolve out of the queue) during
  // render instead of via an effect.
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(
    () =>
      filteredTickets.slice(
        (currentPage - 1) * ADMIN_PAGE_SIZE,
        currentPage * ADMIN_PAGE_SIZE,
      ),
    [filteredTickets, currentPage],
  );

  const rangeStart =
    filteredTickets.length === 0
      ? 0
      : (currentPage - 1) * ADMIN_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * ADMIN_PAGE_SIZE, filteredTickets.length);

  const pageNumbers = buildPageItems(currentPage, totalPages);

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
      <ReviewSummaryCards
        pendingCount={pendingCount}
        inProgress={stats.inProgress}
        resolved={stats.resolved}
        total={stats.total}
      />

      {/* Review Queue Card */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        {/* Toolbar: search + filters */}
        <ReviewQueueToolbar
          searchTerm={searchTerm}
          onSearchTermChange={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={(value) => {
            setPriorityFilter(value);
            setPage(1);
          }}
          dateCutoff={dateRangeValue}
          onDateCutoffChange={handleDateRangeChange}
        />

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
                onClick={retry}
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
            <ReviewQueueTable
              pageRows={pageRows}
              actingTicketId={actingTicketId}
              isRejecting={isRejecting}
              rejectTargetId={rejectTarget?.id ?? null}
              onAccept={handleAccept}
              onReject={startReject}
            />

            {/* Reject reason form */}
            {rejectTarget && (
              <ReviewRejectForm
                target={rejectTarget}
                reason={rejectReason}
                error={rejectError}
                isRejecting={isRejecting}
                onReasonChange={(value) => {
                  setRejectReason(value);
                  clearRejectError();
                }}
                onCancel={cancelReject}
                onConfirm={handleReject}
              />
            )}

            {/* Card footer: count + pagination */}
            <div className="border-t border-gray-100 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {totalPages === 1
                  ? `Showing ${filteredTickets.length} of ${filteredTickets.length} tickets`
                  : `Showing ${rangeStart}\u2013${rangeEnd} of ${filteredTickets.length} tickets`}
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
