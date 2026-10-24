import { TicketReviewDashboard } from "@/features/admin/components/dashboard/ticket-review-dashboard";

export const instant = false;

/**
 * Admin dashboard: the server-side-guarded review queue entry point.
 * Permission is enforced by the backend (`@Roles(ADMIN)`); routing-level RBAC
 * lives in the (admin) layout. This page stays presentational.
 */
export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <TicketReviewDashboard />
    </div>
  );
}
