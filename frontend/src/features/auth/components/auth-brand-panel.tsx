import Image from "next/image";
import {
  BadgeCheck,
  BookOpen,
  GraduationCap,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";

const BENEFITS = [
  {
    icon: SlidersHorizontal,
    tileClassName: "bg-[#39b8fd]/20 border-[#39b8fd]/30",
    iconClassName: "text-[#89ceff]",
    title: "Personalized Learning Experience",
    description: "Curated curricula adapted to your rigorous research tempo and scholarly aims.",
  },
  {
    icon: TrendingUp,
    tileClassName: "bg-[#ffddb8]/20 border-[#ffddb8]/30",
    iconClassName: "text-[#ffddb8]",
    title: "Track Your Academic Progress",
    description: "Real-time thesis metrics, peer milestone reviews, and verifiable credentials.",
  },
  {
    icon: Users,
    tileClassName: "bg-[#c4c1fb]/20 border-[#c4c1fb]/30",
    iconClassName: "text-[#c4c1fb]",
    title: "Learn and Grow Together",
    description: "Engage dynamically with faculty researchers and dedicated global study circles.",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] bg-gradient-to-br from-[#070235] via-[#110e3d] to-[#1e1b4b] text-white flex-col justify-between p-8 xl:p-14 relative overflow-hidden border-r border-[#c8c5d0]/20">
      {/* Architectural subtle geometric background overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#39b8fd]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ffb95f]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Logo & Emblem */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-sm">
            <BookOpen className="size-6 text-[#ffddb8]" strokeWidth={2} />
          </div>
          <div>
            <span className="block text-lg leading-6 font-bold tracking-tight text-white">
              EduLearn
            </span>
            <span className="block text-xs leading-4 text-[#d5e3fc] tracking-wide opacity-85">
              Scholarly Rigor &nbsp;·&nbsp; Modern Discovery
            </span>
          </div>
        </div>
      </div>

      {/* Central Visual & Academic Narrative */}
      <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
        {/* Hero editorial visual frame with warm amber accent */}
        <div className="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-[#070235]/40 p-2 backdrop-blur-sm group">
          <div className="relative rounded-lg overflow-hidden h-64 xl:h-72 w-full">
            <Image
              src="/images/LoginImg/loginimg.png"
              alt="EduLearn Academy Grand Library"
              fill
              priority
              sizes="(min-width: 1280px) 46vw, 50vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070235]/90 via-[#070235]/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-[#d5e3fc]">
              <span className="flex items-center gap-1.5 font-medium text-white/90">
                <GraduationCap className="size-4 text-[#ffddb8]" strokeWidth={2} />
                The Archival Atrium &amp; Research Guild
              </span>
              <span className="bg-[#070235]/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[11px] font-medium text-[#ffddb8]">
                Cohort Fall 2025
              </span>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl leading-11 font-bold tracking-[-0.02em] text-white font-[family-name:var(--font-auth-jakarta)] mb-2">
            Your Learning Journey Starts Here
          </h1>
          <p className="text-base text-[#dce9ff]/90 font-normal leading-relaxed">
            Access your personalized scholarly workspace and cultivate mastery through peer
            collaboration, empirical inquiry, and world-class faculty.
          </p>
        </div>

        {/* Three benefit badges */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="flex items-start gap-3.5 p-3.5 rounded-lg bg-white/[0.06] border border-white/10 backdrop-blur-sm transition hover:bg-white/[0.09]"
            >
              <div className={`mt-0.5 w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${benefit.tileClassName}`}>
                <benefit.icon className={`size-5 ${benefit.iconClassName}`} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[15px] leading-5 font-semibold text-white leading-tight">
                  {benefit.title}
                </h2>
                <p className="text-xs leading-4 text-[#d5e3fc] mt-0.5">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#d5e3fc]">
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-[#ffddb8]" strokeWidth={2} />
          <span className="text-xs leading-4 text-[#d5e3fc]">
            Accredited by the Global Higher Education Consortium
          </span>
        </div>
        <span className="text-xs leading-4 text-[#ffddb8] font-semibold tracking-wider bg-white/5 px-2.5 py-1 rounded">
          120,000+ SCHOLARS
        </span>
      </div>
    </div>
  );
}
