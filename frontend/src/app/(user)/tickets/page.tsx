import type { Metadata } from "next";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { MyTickets } from "@/features/tickets/components/my-tickets/my-tickets";

export const instant = false;

export const metadata: Metadata = {
  title: "My Tickets | EMS Support",
  description:
    "Track and manage your support requests in a single workspace.",
};

/**
 * USER "My Tickets" listing page. The workspace shell renders automatically
 * through the (user) layout; this page is guarded to regular users since the
 * sidebar only shows this entry for them (admins use /support-desk instead).
 */
export default function MyTicketsPage() {
  return (
    <ProtectedRoute requiredRole={USER_ROLE.USER}>
      <MyTickets />
    </ProtectedRoute>
  );
}
