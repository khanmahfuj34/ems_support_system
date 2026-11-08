import { HeroSection } from "@/features/landing/components/hero-section";
import { HighlightCards } from "@/features/landing/components/highlight-cards";
import { AboutSection } from "@/features/landing/components/about-section";
import { PlatformFeatures } from "@/features/landing/components/platform-features";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { CtaSection } from "@/features/landing/components/cta-section";
import { SiteFooter } from "@/features/landing/components/site-footer";
import { SiteNavbar } from "@/components/layout/public-layout/site-navbar";

export default function Home() {
  return (
    <>
      <SiteNavbar />
      <main className="bg-[#f8f9ff] dark:bg-[#070235]">
        <HeroSection />
        <HighlightCards />
        <AboutSection />
        <PlatformFeatures />
        <HowItWorks />
      </main>
      <CtaSection />
      <SiteFooter />
    </>
  );
}
