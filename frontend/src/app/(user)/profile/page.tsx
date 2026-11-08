import type { Metadata } from "next";

import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { USER_ROLE } from "@/features/auth/types/auth.types";
import { MyProfile } from "@/features/profile/components/my-profile";

export const instant = false;

export const metadata: Metadata = {
  title: "My Profile | EMS Support",
  description:
    "Manage your personal information, account details, and security.",
};

/**
 * USER "My Profile" page. The workspace shell renders automatically through
 * the (user) layout; this page is guarded to regular users since the sidebar
 * only shows this entry for them (admins use the admin console instead).
 */
export default function ProfilePage() {
  return (
    <ProtectedRoute requiredRole={USER_ROLE.USER}>
      <MyProfile />
    </ProtectedRoute>
  );
}
