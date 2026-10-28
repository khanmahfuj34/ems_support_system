import { Suspense } from "react";

import { AdminUserProfilePage } from "@/features/admin/components/users/admin-user-profile-page";

export const instant = false;

export default function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-gray-400" role="status">
          Loading user profile...
        </div>
      }
    >
      <AdminUserPageContent params={params} />
    </Suspense>
  );
}

async function AdminUserPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserProfilePage userId={id} />;
}
