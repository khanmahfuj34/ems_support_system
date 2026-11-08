import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

/**
 * Shared shell for every auth entry point (/login, /register,
 * /forgot-password, /admin/login): brand panel and the page
 * wrapper live here so auth pages stay thin.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8f9ff] text-[#0d1c2e] antialiased">
      <AuthBrandPanel />
      {children}
    </main>
  );
}
