import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative w-full overflow-hidden min-h-[640px] lg:min-h-[720px] flex items-center justify-center"
    >
      {/* Campus image + dual tonal navy overlay for legibility */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/LandingPage/screen%20copy.png"
          alt="Collegiate brick and glass university campus library in golden evening sunlight"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070235]/95 via-[#1e1b4b]/85 to-[#070235]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070235] via-transparent to-[#070235]/40" />
      </div>

      {/* Hero content canvas */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-16 pt-8 pb-16 lg:py-28 w-full text-center md:text-left">
        <div className="max-w-3xl mx-auto md:mx-0">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ffddb8] animate-pulse" />
            <span className="text-xs leading-4 uppercase tracking-wider font-semibold text-[#ffddb8]">
              Your academic journey starts here
            </span>
          </div>
          {/* Main headline */}
          <h1 className="font-[family-name:var(--font-landing-jakarta)] text-[28px] leading-9 md:text-5xl md:leading-none font-bold text-white tracking-tight md:tracking-[-0.025em] mb-6">
            Empowering Education, <br className="hidden sm:inline" />
            Inspiring Futures
          </h1>
          {/* Supporting text */}
          <p className="text-base leading-6 text-[#dce9ff]/90 max-w-2xl mx-auto md:mx-0 mb-10 leading-relaxed font-normal">
            A connected learning environment designed to help students and educational
            communities learn, grow, and succeed together with scholarly rigor and
            intuitive technology.
          </p>
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row sm:justify-start items-center gap-4">
            <Link
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#ffddb8] text-[#2a1700] hover:bg-[#ffb95f] transition-all duration-200 text-sm leading-5 font-bold shadow-lg shadow-black/20"
              href="/register"
            >
              <span>Get Started</span>
              <ArrowRight className="size-[18px]" strokeWidth={2} />
            </Link>
            <a
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/25 text-white transition-all duration-200 text-sm leading-5 font-semibold"
              href="#features"
            >
              <BookOpen className="size-[18px] text-[#c9e6ff]" strokeWidth={2} />
              <span>Explore Our Platform</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
