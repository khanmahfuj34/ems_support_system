"use client";

import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  RefreshCw,
  Ticket,
} from "lucide-react";

import { OverviewStatCard } from "./overview-stat-card";
import {
  TicketStatusOverview,
  type StatusOverviewData,
} from "./ticket-status-overview";
import { TicketTrendPanel, type TrendSeries } from "./ticket-trend-panel";
import {
  NeedsAttentionPanel,
} from "./needs-attention-panel";
import {
  RecentTicketsPanel,
} from "./recent-tickets-panel";
import { useAdminOverview } from "@/features/admin/hooks/use-admin-overview";

// No backend endpoint provides previous-period or historical trend data yet,
// so the trend pills and the trend chart stay in their explicit empty state.
const TREND_SERIES: TrendSeries = null;

/**
 * Admin Overview dashboard (reference: design.md/AdminDeshboard), wired to
 * the verified `GET /api/v1/tickets` contract through the admin service:
 * KPIs are server-side pagination totals, Needs Attention lists actual
 * pending-review tickets, and Recent Tickets lists the latest real tickets.
 */
export function AdminOverviewDashboard() {
  const { state, data, errorMessage, retry, refresh } = useAdminOverview();
  const initialLoading = state === "loading" && data === null;

  const stats = data?.stats ?? {
    total: null,
    pendingReview: null,
    inProgress: null,
    resolved: null,
  };

  // Transparent, complete status split: the three reference statuses plus
  // every remaining ticket status grouped as "Other" (total minus the three).
  let statusOverview: StatusOverviewData = null;
  if (
    stats.total !== null &&
    stats.pendingReview !== null &&
    stats.inProgress !== null &&
    stats.resolved !== null
  ) {
    const otherCount = Math.max(
      0,
      stats.total - (stats.pendingReview + stats.inProgress + stats.resolved),
    );
    statusOverview = [
      {
        label: "Pending Review",
        count: stats.pendingReview,
        ringClass: "stroke-amber-400",
        dotClass: "bg-amber-400",
      },
      {
        label: "In Progress",
        count: stats.inProgress,
        ringClass: "stroke-blue-500",
        dotClass: "bg-blue-500",
      },
      {
        label: "Resolved",
        count: stats.resolved,
        ringClass: "stroke-emerald-500",
        dotClass: "bg-emerald-500",
      },
      {
        label: "Other",
        count: otherCount,
        ringClass: "stroke-gray-300",
        dotClass: "bg-gray-300",
      },
    ];
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
            Admin Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Monitor support operations at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-disabled="true"
            title="Range filtering is enabled once date-filtered statistics are available."
            className="inline-flex cursor-not-allowed select-none items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 opacity-70"
          >
            <Calendar className="size-3.5 text-gray-400" aria-hidden="true" />
            Last 7 Days
            <ChevronDown className="size-3.5 text-gray-400" aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={state === "loading"}
            aria-label="Refresh dashboard data"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`size-3.5 text-gray-400 ${state === "loading" ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      {state === "error" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            {errorMessage ?? "Failed to load the dashboard data."}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        <OverviewStatCard
          label="Total Tickets"
          icon={Ticket}
          iconClasses="bg-indigo-50 text-indigo-600"
          value={data === null ? null : stats.total}
          loading={initialLoading}
        />
        <OverviewStatCard
          label="Pending Review"
          icon={Clock}
          iconClasses="bg-amber-50 text-amber-600"
          value={data === null ? null : stats.pendingReview}
          loading={initialLoading}
        />
        <OverviewStatCard
          label="In Progress"
          icon={Activity}
          iconClasses="bg-blue-50 text-[#2563EB]"
          value={data === null ? null : stats.inProgress}
          loading={initialLoading}
        />
        <OverviewStatCard
          label="Resolved"
          icon={CheckCircle2}
          iconClasses="bg-emerald-50 text-emerald-600"
          value={data === null ? null : stats.resolved}
          loading={initialLoading}
        />
      </div>

      {/* Status donut + trend chart */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
        <TicketStatusOverview data={statusOverview} />
        <TicketTrendPanel series={TREND_SERIES} />
      </div>

      {/* Attention + recent lists */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
        <NeedsAttentionPanel
          rows={data?.attentionRows ?? null}
          now={data?.fetchedAt ?? 0}
          loading={initialLoading}
        />
        <RecentTicketsPanel
          rows={data?.recentRows ?? null}
          now={data?.fetchedAt ?? 0}
          loading={initialLoading}
        />
      </div>
    </div>
  );
}
