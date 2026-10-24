import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Admin Sign In | EMS Support",
  description: "Administrator sign in for the EMS SupportDesk team.",
};

/**
 * Dedicated entry point for support administrators.
 *
 * There is no public admin registration: this page reuses the same secure
 * login API as regular users; after authentication the account's role stored
 * in the database is verified and non-admin accounts are rejected locally.
 * All admin routes also remain guarded server-side.
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm adminOnly />
    </Suspense>
  );
}
