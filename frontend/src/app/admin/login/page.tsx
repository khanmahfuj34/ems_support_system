import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";
import { LoginForm } from "@/features/auth/components/login-form";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-auth-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-auth-jakarta",
});

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
    <main
      className={`${inter.variable} ${jakarta.variable} font-[family-name:var(--font-auth-inter)] min-h-screen w-full flex flex-col lg:flex-row bg-[#f8f9ff] text-[#0d1c2e] antialiased`}
    >
      <AuthBrandPanel />
      <Suspense fallback={null}>
        <LoginForm adminOnly />
      </Suspense>
    </main>
  );
}
