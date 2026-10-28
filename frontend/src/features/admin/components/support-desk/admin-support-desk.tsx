"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Loader2,
  MoreVertical,
  Plus,
} from "lucide-react";

import { useToast } from "@/components/ui/toaster";
import { useAdminQueue } from "../../hooks/use-admin-queue";
import { useAdminTicketDetail } from "../../hooks/use-ticket-detail";
import { useTicketReviewActions } from "../../hooks/use-ticket-review-actions";
import { QUEUE_TABS } from "../../utils/admin-constants";
import type { AdminDetailTab, AdminTicketRow } from "../../types/admin.types";
import { SLA_STATUS_ON_TRACK } from "../../utils/admin-constants";
import { formatSlaRemaining } from "../../utils/admin-format";
import { TicketSummaryCards } from "./ticket-summary-cards";
import { TicketQueue } from "./ticket-queue";
import { TicketDetailsPanel } from "./ticket-details-panel";

export function AdminSupportDesk() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const {
    pageNumber,
    canGoPrevious,
    hasMore,
    goNext,
    goPrevious,
    listState,
    listError,
    tickets,
    retryList,
    refreshQueue,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    counts,
    categories,
    selectedId,
    selectTicket,
  } = useAdminQueue();

  const [showFilters, setShowFilters] = useState(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<AdminDetailTab>("details");

  /* --- detail panel wiring --- */
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const reloadDetail = () => setDetailReloadKey((count) => count + 1);

  const {
    detail,
    detailLoadedId,
    detailError,
    detailErrorId,
    fetchedAt,
    retryDetail,
  } = useAdminTicketDetail(selectedId, detailReloadKey);

  const review = useTicketReviewActions(detail, () => {
    refreshQueue();
    setDetailReloadKey((count) => count + 1);
  });

  /* Detail-derived values. */
  const requesterName =
    detail?.statusHistory.filter((entry) => entry.oldStatusId === null)[0]
      ?.actor?.name ?? null;
  const effectivePriority = detail
    ? (detail.adminPriority ?? detail.userPriority)
    : null;

  const sla = useMemo(() => {
    if (!detail?.slaPolicy || !detail.firstResponseDueAt || fetchedAt === null) {
      return null;
    }
    const createdAtMs = new Date(detail.createdAt).getTime();
    const dueMs = new Date(detail.firstResponseDueAt).getTime();
    const span = Math.max(dueMs - createdAtMs, 1);
    const remaining = dueMs - fetchedAt;
    const percent = Math.round(Math.min(Math.max(1 - remaining / span, 0), 1) * 100);
    return {
      withinSla: detail.slaStatus === SLA_STATUS_ON_TRACK,
      percent,
      remainingText: formatSlaRemaining(remaining),
    };
  }, [detail, fetchedAt]);

  /* Derived panel state: the fetch effect never synchronously writes state,
     so loading/idle/error/success are computed from the current selection and
     the last fetch result. */
  const detailPanelState: "idle" | "loading" | "success" | "error" =
    !selectedId
      ? "idle"
      : detailErrorId === selectedId
        ? "error"
        : detailLoadedId === selectedId && detail
          ? "success"
          : "loading";

  const handleRetryDetail = () => {
    retryDetail();
    setDetailReloadKey((count) => count + 1);
  };

  const copyTicketNumber = (ticketNumber: string) => {
    navigator.clipboard
      .writeText(ticketNumber)
      .then(() =>
        showSuccessToast({
          title: "Copied",
          description: `Ticket ID ${ticketNumber} copied to clipboard.`,
        }),
      )
      .catch(() =>
        showErrorToast({
          title: "Copy failed",
          description: "The ticket ID could not be copied.",
        }),
      );
  };

  const showNotWiredToast = (label: string) => {
    showErrorToast({
      title: "Not available yet",
      description: `"${label}" is not wired to the API yet.`,
    });
  };

  const handleSelectTicket = (ticket: AdminTicketRow) => {
    selectTicket(ticket.id);
    setSelectedTab("details");
    setDetailMenuOpen(false);
    review.cancelReject();
  };

  const handleStatusTab = (statusId: number | undefined) => {
    setStatusFilter(statusId ?? "ALL");
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
        <span className="font-semibold text-gray-900">Support Desk</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="size-9 mt-0.5 rounded-lg bg-[#EFF6FF] border border-blue-100 flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563EB"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
              <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
              <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
              <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
              Support Desk
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500 max-w-2xl">
              Manage and respond to support tickets. Review, assign, and resolve
              issues to provide better support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/support-desk/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors shadow-xs"
          >
            <Plus className="size-4" />
            New Ticket
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="More page options"
              aria-expanded={pageMenuOpen}
              onClick={() => setPageMenuOpen((open) => !open)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MoreVertical className="size-4" />
            </button>
            {pageMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  role="presentation"
                  onClick={() => setPageMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-40 mt-1.5 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setPageMenuOpen(false);
                      refreshQueue();
                      showSuccessToast({
                        title: "Refreshed",
                        description: "Queue and summary counts reloaded.",
                      });
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Loader2 className="size-3.5 text-gray-400" />
                    Refresh data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <TicketSummaryCards counts={counts} />

      {/* Queue tabs + advanced filters toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {QUEUE_TABS.map((tab) => {
            const active =
              tab.statusId === undefined
                ? statusFilter === "ALL"
                : statusFilter === tab.statusId;
            const count = counts[tab.countKey] ?? null;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusTab(tab.statusId)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-blue-300 bg-[#EFF6FF] text-[#2563EB] font-semibold"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count ?? "–"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Advanced Filters
        </button>
      </div>

      {/* Two-column workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 sm:gap-5 items-start">
        {/* ------------------------------ Ticket list ------------------------------ */}
        <TicketQueue
          showFilters={showFilters}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          dateCutoff={dateRange}
          onDateCutoffChange={setDateRange}
          categories={categories}
          listState={listState}
          listError={listError}
          retryList={retryList}
          tickets={tickets}
          selectedId={selectedId}
          onSelect={handleSelectTicket}
          checkedIds={checkedIds}
          onCheckedIdsChange={setCheckedIds}
          pageNumber={pageNumber}
          canGoPrevious={canGoPrevious}
          hasMore={hasMore}
          onPrevious={goPrevious}
          onNext={goNext}
        />

        {/* ------------------------------ Detail panel ------------------------------ */}
        <TicketDetailsPanel
          panelState={detailPanelState}
          detail={detail}
          detailError={detailError}
          onRetryDetail={handleRetryDetail}
          onRequestDetailReload={reloadDetail}
          requesterName={requesterName}
          effectivePriority={effectivePriority}
          sla={sla}
          selectedTab={selectedTab}
          onTabChange={(tab) => {
            setSelectedTab(tab);
            setDetailMenuOpen(false);
          }}
          copyTicketNumber={copyTicketNumber}
          detailMenuOpen={detailMenuOpen}
          onToggleDetailMenu={() => setDetailMenuOpen((open) => !open)}
          showNotWiredToast={showNotWiredToast}
          review={review}
        />
      </div>
    </div>
  );
}
