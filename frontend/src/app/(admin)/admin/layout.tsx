"use client";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { WorkspaceShell } from "@/components/layout/workspace-layout/workspace-shell";

/**
 * Admin console layout: every /admin/* route is guarded by the ADMIN role and
 * wrapped in the shared workspace shell. Ticket permissions themselves are
 * enforced by the backend (`@Roles(ADMIN)`); this guard only redirects for
 * convenience.
 */
export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole={USER_ROLE.ADMIN}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </ProtectedRoute>
  );
}
