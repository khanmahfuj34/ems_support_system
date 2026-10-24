"use client";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { WorkspaceShell } from "@/components/layout/workspace-layout/workspace-shell";

/**
 * Shell for all authenticated workspace pages (/dashboard, /support-desk/*).
 * Route-level access only requires any support role; individual pages keep
 * their narrower guards (e.g. the admin queue view requires ADMIN).
 */
export default function UserWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole={[USER_ROLE.USER, USER_ROLE.ADMIN]}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </ProtectedRoute>
  );
}
