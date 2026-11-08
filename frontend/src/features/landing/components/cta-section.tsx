import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function CtaSection() {
  return (
    <section className="bg-[#140f35] text-white py-20 px-4 md:px-8 relative overflow-hidden">
      {/* Subtle Geometric / Academic Architectural Accents */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="w-96 h-96 rounded-full border-8 border-white absolute -top-20 -left-20" />
        <div className="w-[500px] h-[500px] rounded-full border border-white absolute -bottom-32 -right-20" />
      </div>
      <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-[#c9b8ff] mb-2">
          <GraduationCap className="size-6" strokeWidth={1.8} />
        </div>
        <h2 className="text-[28px] leading-9 md:text-[36px] md:leading-[44px] font-bold tracking-[-0.015em] md:tracking-[-0.02em]">
          Take the Next Step in Your Learning Journey
        </h2>
        <p className="text-base leading-6 text-[#dce9ff]/80 max-w-2xl mx-auto">
          Join a connected educational environment built around learning and progress.
          Experience precision academia today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-white bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] hover:from-[#8b6dfa] hover:to-[#6a4cf5] shadow-[0_4px_16px_rgba(122,90,248,0.4)] transition-all duration-200 text-sm leading-5 font-bold"
            href="/register"
          >
            Get Started Today
          </Link>
          <Link
            className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-200 text-sm leading-5 font-medium"
            href="#contact"
          >
            Contact Admissions &amp; Inquiries
          </Link>
        </div>
      </div>
    </section>
  );
}
