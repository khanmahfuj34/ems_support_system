"use client";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { useAuth } from "@/providers/auth-provider";

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute requiredRole={USER_ROLE.ADMIN}>
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-[#47464f]">Signed in as {user?.name} ({user?.email})</p>
          </div>
          <button className="rounded-lg border px-4 py-2 text-sm" onClick={logout}>Sign out</button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
