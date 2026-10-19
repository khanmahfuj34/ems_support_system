import { Suspense } from "react";
import type { Metadata } from "next";

import { SupportDeskLayout } from "@/features/tickets/components/support-desk-layout";
import { TicketDetail } from "@/features/tickets/components/ticket-detail";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";

export const metadata: Metadata = {
  title: "Ticket Details | EMS Support",
  description: "View the details, attachments, and conversation of a support ticket.",
};

/**
 * Renders the ticket details view for an authenticated user or admin.
 *
 * Access rules are enforced by the backend API: users can only open tickets
 * they own; admins can open any ticket.
 */
export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ProtectedRoute requiredRole={[USER_ROLE.USER, USER_ROLE.ADMIN]}>
      <SupportDeskLayout>
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8 lg:p-10">
          <Suspense
            fallback={
              <div className="py-12 flex items-center justify-center text-xs text-gray-400">
                Loading ticket details...
              </div>
            }
          >
            {/* The dynamic params await must stay inside this Suspense boundary
                so the route can still be prerendered (cacheComponents). */}
            <TicketDetailContent params={params} />
          </Suspense>
        </div>
      </SupportDeskLayout>
    </ProtectedRoute>
  );
}

async function TicketDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TicketDetail ticketId={id} />;
}
