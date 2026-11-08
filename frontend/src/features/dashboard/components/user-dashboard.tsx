"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { useAuth } from "@/providers/auth-provider";
import { WelcomeBanner } from "./welcome-banner";
import { TicketSummaryCards } from "./ticket-summary-cards";
import { ActionRequiredPanel } from "./action-required-panel";
import { MyRecentTicketsTable } from "./my-recent-tickets-table";
import { QuickAccessPanel } from "./quick-access-panel";
import { RecentNotificationsPanel } from "./recent-notifications-panel";
import { useUserDashboard } from "../hooks/use-user-dashboard";

export function UserDashboard() {
  const { user } = useAuth();
  const { state, data, errorMessage, retry } = useUserDashboard();

  const isInitialLoading = state === "loading" && !data;

  return (
    <ProtectedRoute requiredRole={USER_ROLE.USER}>
      <div className="space-y-6 pb-8">
        {/* Welcome Hero Banner with Animated Workflow Illustration */}
        <div className="animate-fade-in-up [animation-delay:0ms]">
          <WelcomeBanner userName={user?.name} />
        </div>

        {/* Error notification banner if fetch failed */}
        {state === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in-up">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4.5 text-red-600 shrink-0" />
              <span>{errorMessage || "Failed to load latest dashboard updates."}</span>
            </div>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-all duration-200 active:scale-95"
            >
              <RefreshCw className="size-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Ticket KPI Summary Cards */}
        <div className="animate-fade-in-up [animation-delay:100ms]">
          <TicketSummaryCards stats={data?.stats} loading={isInitialLoading} />
        </div>

        {/* Two-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Main Column (2 spans on desktop) */}
          <div className="space-y-6 lg:col-span-2 animate-fade-in-up [animation-delay:200ms]">
            {/* Urgent / Action Needed Tickets */}
            <ActionRequiredPanel
              tickets={data?.actionRequiredTickets ?? []}
              loading={isInitialLoading}
              now={data?.fetchedAt}
            />

            {/* Recent Tickets Table */}
            <MyRecentTicketsTable
              tickets={data?.recentTickets ?? []}
              loading={isInitialLoading}
            />
          </div>

          {/* Side Column (1 span on desktop) */}
          <div className="space-y-6 lg:col-span-1 animate-fade-in-up [animation-delay:300ms]">
            {/* Quick Access Shortcuts */}
            <QuickAccessPanel />

            {/* Notifications Feed */}
            <RecentNotificationsPanel
              notifications={data?.notifications ?? []}
              unreadCount={data?.unreadNotificationsCount}
              loading={isInitialLoading}
              now={data?.fetchedAt}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
