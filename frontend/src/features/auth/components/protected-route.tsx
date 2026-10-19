"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, LogIn, UserPlus } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { dashboardForRole } from "@/features/auth/utils/role-redirect";

function currentRelativeUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  // A scalar grants exactly one role; an array grants either role access.
  requiredRole: number | number[];
}) {
  const { user, status, logout, refreshUser } = useAuth();
  const router = useRouter();

  const requiredRoles = useMemo(
    () => (Array.isArray(requiredRole) ? requiredRole : [requiredRole]),
    [requiredRole],
  );

  useEffect(() => {
    if (
      status === "authenticated" &&
      user &&
      !requiredRoles.includes(user.roleId)
    ) {
      router.replace(dashboardForRole(user.roleId));
    }
  }, [requiredRoles, router, status, user]);

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

  if (status === "unauthenticated") {
    const next = encodeURIComponent(currentRelativeUrl());
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-[#f8f9ff]">
        <div className="w-full max-w-md text-center bg-white rounded-2xl border border-[#c8c5d0]/40 shadow-sm p-10">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#eff4ff] text-[#006591] flex items-center justify-center border border-[#c8c5d0]/30">
            <LifeBuoy className="size-6" strokeWidth={2} />
          </div>
          <h1 className="mt-4 text-xl leading-7 font-bold text-[#070235]">
            Sign in to access the Support Desk
          </h1>
          <p className="mt-2 text-sm leading-5 text-[#47464f]">
            This area is available to registered members. Please sign in to your account, or create
            one to continue to this page.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              className="px-5 py-2.5 text-sm leading-5 font-medium text-[#070235] hover:text-[#006591] border border-[#c8c5d0]/60 rounded-lg bg-white inline-flex items-center gap-2 transition-colors duration-150"
              href={`/login?next=${next}`}
            >
              <LogIn className="size-4" strokeWidth={2} />
              Sign In
            </Link>
            <Link
              className="px-5 py-2.5 text-sm leading-5 font-medium text-white bg-[#1e1b4b] hover:bg-[#070235] rounded-lg shadow-sm inline-flex items-center gap-2 transition-all duration-150 hover:shadow-md"
              href={`/register?next=${next}`}
            >
              <UserPlus className="size-4" strokeWidth={2} />
              Register
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (status !== "authenticated" || !user || !requiredRoles.includes(user.roleId)) return null;

  return <>{children}</>;
}
