import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";

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

/**
 * Shared shell for every auth entry point (/login, /register,
 * /forgot-password, /admin/login): page fonts, brand panel and the page
 * wrapper live here so auth pages stay thin.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className={`${inter.variable} ${jakarta.variable} font-[family-name:var(--font-auth-inter)] min-h-screen w-full flex flex-col lg:flex-row bg-[#f8f9ff] text-[#0d1c2e] antialiased`}
    >
      <AuthBrandPanel />
      {children}
    </main>
  );
}
