import { Suspense } from "react";
import type { Metadata } from "next";

import { CreateTicketForm } from "@/features/tickets/components/ticket-form/create-ticket-form";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";

export const instant = false;

export const metadata: Metadata = {
  title: "Create Support Request | EMS Support",
  description: "Create and submit a new support request to our helpdesk team.",
};

export default function CreateSupportRequestPage() {
  return (
    <ProtectedRoute requiredRole={USER_ROLE.USER}>
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8 lg:p-10">
        <Suspense
          fallback={
            <div className="py-12 flex items-center justify-center text-xs text-gray-400">
              Loading support request form...
            </div>
          }
        >
          <CreateTicketForm />
        </Suspense>
      </div>
    </ProtectedRoute>
  );
}
