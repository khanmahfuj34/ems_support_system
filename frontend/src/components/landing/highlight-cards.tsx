import { BookOpen, Headset, PartyPopper, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type HighlightCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const HIGHLIGHT_CARDS: HighlightCard[] = [
  {
    icon: PartyPopper,
    title: "Student-Centered Experience",
    description:
      "Tailored pathways designed around individual study priorities and graduation goals.",
  },
  {
    icon: BookOpen,
    title: "Digital Learning Resources",
    description:
      "Instant access to comprehensive institutional archives, journals, and digitized course reserves.",
  },
  {
    icon: Users,
    title: "Academic Community",
    description:
      "Collaborative circles connecting scholars, mentors, and faculty across departments.",
  },
  {
    icon: Headset,
    title: "Accessible Assistance",
    description:
      "Responsive academic advising and platform guidance available at every turn.",
  },
];

export function HighlightCards() {
  return (
    <section className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {HIGHLIGHT_CARDS.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-[#1e1b4b] p-6 rounded-xl border border-[#c8c5d0]/40 dark:border-[#787680]/20 shadow-[0_1px_3px_rgba(23,19,65,0.08),0_8px_24px_rgba(23,19,65,0.10)] hover:shadow-md transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-lg bg-[#eff4ff] dark:bg-white/10 text-[#006591] dark:text-[#89ceff] flex items-center justify-center mb-4 group-hover:bg-[#006591] dark:group-hover:bg-[#006591] group-hover:text-white transition-colors">
              <card.icon className="size-6" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg leading-6 font-semibold tracking-[-0.005em] text-[#070235] dark:text-[#f8f9ff] mb-1.5">
              {card.title}
            </h2>
            <p className="text-xs leading-4 text-[#47464f] dark:text-[#d5e3fc] leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
