import type { Metadata } from "next";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { AdminSupportDesk } from "@/features/admin/components/support-desk/admin-support-desk";

export const instant = false;

export const metadata: Metadata = {
  title: "Support Desk | EMS Support",
  description:
    "Review, assign, and resolve employee support tickets from a single workspace.",
};

/**
 * Admin support desk console.
 *
 * Permission to see every ticket and to accept/reject them is enforced by the
 * backend API (`@Roles(ADMIN)` + owner-or-admin scoping); this route guard only
 * redirects non-admins for convenience. Regular users submit and track tickets
 * at `/support-desk/new` instead.
 */
export default function SupportDeskPage() {
  return (
    <ProtectedRoute requiredRole={USER_ROLE.ADMIN}>
      <AdminSupportDesk />
    </ProtectedRoute>
  );
}
