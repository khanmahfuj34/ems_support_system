"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { USER_ROLE } from "@/features/auth/types/auth.types";

function dashboardForRole(roleId: number) {
  if (roleId === USER_ROLE.USER) return "/dashboard";
  if (roleId === USER_ROLE.ADMIN) return "/admin/dashboard";
  return "/login";
}

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: number;
}) {
  const { user, status, logout, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && user && user.roleId !== requiredRole) {
      router.replace(dashboardForRole(user.roleId));
    }
  }, [requiredRole, router, status, user]);

  if (status === "checking") {
    return <main className="min-h-screen p-8 text-[#47464f]">Checking your session…</main>;
  }

  if (status === "error") {
    return (
      <main className="min-h-screen p-8 text-[#47464f]">
        <p>We couldn’t verify your session because the SupportDesk API is unavailable.</p>
        <button className="mt-4 underline" onClick={() => void refreshUser().catch(() => undefined)}>
          Try again
        </button>
        <button className="ml-4 underline" onClick={logout}>Sign out</button>
      </main>
    );
  }

  if (status !== "authenticated" || !user || user.roleId !== requiredRole) return null;

  return <>{children}</>;
}
