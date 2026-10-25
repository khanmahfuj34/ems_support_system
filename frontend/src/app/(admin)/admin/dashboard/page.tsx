import { AdminOverviewDashboard } from "@/features/admin/components/dashboard/admin-overview-dashboard";

export const instant = false;

/**
 * Admin dashboard: the server-side-guarded overview entry point.
 * Permission is enforced by the backend (`@Roles(ADMIN)`); routing-level RBAC
 * lives in the (admin) layout. This page stays presentational.
 */
export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminOverviewDashboard />
    </div>
  );
}
