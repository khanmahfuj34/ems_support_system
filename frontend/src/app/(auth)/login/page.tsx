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
  title: "Sign In — Aethel Academy",
  description: "Sign in to continue your scholarly inquiry and coursework.",
};

export default function LoginPage() {
  return (
    <main
      className={`${inter.variable} ${jakarta.variable} font-[family-name:var(--font-auth-inter)] min-h-screen w-full flex flex-col lg:flex-row bg-[#f8f9ff] text-[#0d1c2e] antialiased`}
    >
      <AuthBrandPanel />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
