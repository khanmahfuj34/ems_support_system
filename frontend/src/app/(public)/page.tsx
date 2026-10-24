import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { HeroSection } from "@/features/landing/components/hero-section";
import { HighlightCards } from "@/features/landing/components/highlight-cards";
import { SiteNavbar } from "@/components/layout/public-layout/site-navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-landing-jakarta",
});

export default function Home() {
  return (
    <>
      <SiteNavbar />
      <main
        className={`${inter.variable} ${jakarta.variable} font-[family-name:var(--font-landing-inter)] bg-[#f8f9ff] dark:bg-[#070235]`}
      >
        <HeroSection />
        <HighlightCards />
      </main>
    </>
  );
}
