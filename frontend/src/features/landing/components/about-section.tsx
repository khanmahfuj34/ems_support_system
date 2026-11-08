import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check } from "lucide-react";

const CAPABILITIES = [
  {
    title: "Unified Syllabus & Course Sequencing",
    description:
      "Centralize deadlines, lecture modules, and reading schedules in a synchronized calendar.",
  },
  {
    title: "Peer-to-Peer Study Hubs",
    description:
      "Facilitate real-time group inquiries, annotation sharing, and collaborative lab review sessions.",
  },
  {
    title: "Integrated Faculty Office Hours",
    description:
      "Book direct consultations, receive substantive paper critiques, and review feedback easily.",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="py-8 lg:py-24 max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Image side */}
        <div className="lg:col-span-6 relative">
          <div className="relative rounded-2xl overflow-hidden border border-[#c8c5d0]/40 dark:border-[#787680]/40 shadow-lg">
            <Image
              src="/images/LandingPage/library-study-group.jpg"
              alt="University students engaged in academic study around wooden library table"
              width={1200}
              height={800}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full h-[420px] md:h-[480px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#140f35]/70 via-transparent to-transparent" />
            {/* Inset Milestone Tag */}
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-white/95 dark:bg-[#1e1b4b]/95 backdrop-blur-md border border-[#c8c5d0]/30 dark:border-[#787680]/30 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] text-white flex items-center justify-center shrink-0">
                <BadgeCheck className="size-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm leading-6 font-semibold text-[#140f35] dark:text-[#f8f9ff]">
                  Institutional Excellence
                </p>
                <p className="text-xs leading-4 text-[#47464f] dark:text-[#d5e3fc]">
                  Validated academic infrastructure supporting multi-departmental curricula.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative side */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="text-xs leading-4 uppercase tracking-wider font-bold text-[#5b3df0] dark:text-[#c4b5fd]">
              Academic Mission &amp; Purpose
            </span>
            <h2 className="text-[24px] leading-8 md:text-[36px] md:leading-[44px] font-bold tracking-[-0.015em] md:tracking-[-0.02em] text-[#140f35] dark:text-[#f8f9ff] mt-2">
              Building a Better Learning Experience
            </h2>
          </div>
          <p className="text-base leading-6 text-[#47464f] dark:text-[#d5e3fc] leading-relaxed">
            EduLearn helps students and educational communities access information, manage
            their academic coursework and schedules, and stay connected with peers and
            instructors. Designed with scholarly discipline, our system strips away
            administrative friction to reveal focused intellectual discovery.
          </p>
          {/* Key capabilities list */}
          <div className="space-y-4 pt-2">
            {CAPABILITIES.map((capability) => (
              <div key={capability.title} className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-[#ede9fe] dark:bg-[#c4b5fd]/20 text-[#5b3df0] dark:text-[#c4b5fd] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3.5" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-sm leading-5 font-semibold text-[#140f35] dark:text-[#f8f9ff]">
                    {capability.title}
                  </h3>
                  <p className="text-xs leading-4 text-[#47464f] dark:text-[#d5e3fc]">
                    {capability.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <Link
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-white dark:bg-[#1e1b4b] text-[#140f35] dark:text-[#f8f9ff] border border-[#c8c5d0]/60 dark:border-[#787680]/40 hover:bg-[#f5f3ff] dark:hover:bg-[#2a265e] transition-all duration-200 text-sm leading-5 font-semibold shadow-sm"
              href="#features"
            >
              <span>Learn More</span>
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
