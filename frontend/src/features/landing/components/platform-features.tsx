import {
  FolderOpen,
  Headset,
  LayoutDashboard,
  Library,
  LifeBuoy,
  MessagesSquare,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PlatformFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  metric: string;
  metricIcon: LucideIcon;
};

const PLATFORM_FEATURES: PlatformFeature[] = [
  {
    icon: LayoutDashboard,
    title: "Personalized Dashboard",
    description:
      "Manage coursework, monitor learning milestones, and organize daily academic schedules in a distraction-free, prioritized workspace.",
    metric: "Coursework Tracking",
    metricIcon: TrendingUp,
  },
  {
    icon: Library,
    title: "Learning Resources",
    description:
      "Curated peer-reviewed texts, interactive study modules, and recorded faculty lectures assembled into searchable repository trees.",
    metric: "Scholarly Archives",
    metricIcon: FolderOpen,
  },
  {
    icon: MessagesSquare,
    title: "Community & Communication",
    description:
      "Collaborative study circles, department discussion forums, and direct peer inquiry mechanisms designed to foster collective insight.",
    metric: "Active Discourse",
    metricIcon: MessageSquare,
  },
  {
    icon: LifeBuoy,
    title: "Support Desk",
    description:
      "Dedicated academic assistance, platform guidance, and rapid help whenever students or educators encounter issues or administrative bottlenecks.",
    metric: "24/7 Academic Desk",
    metricIcon: Headset,
  },
];

export function PlatformFeatures() {
  return (
    <section
      id="features"
      className="py-8 lg:py-24 bg-[#f5f3ff]/70 dark:bg-[#1e1b4b]/40 border-y border-[#d6d1f5]/50 dark:border-[#787680]/20"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs leading-4 uppercase tracking-wider font-bold text-[#5b3df0] dark:text-[#c4b5fd]">
            System Capabilities
          </span>
          <h2 className="text-[24px] leading-8 md:text-[36px] md:leading-[44px] font-bold tracking-[-0.015em] md:tracking-[-0.02em] text-[#140f35] dark:text-[#f8f9ff] mt-2 mb-4">
            Comprehensive Tools for Scholars and Educators
          </h2>
          <p className="text-sm leading-5 text-[#47464f] dark:text-[#d5e3fc]">
            Purpose-built modules architected to support scholarly excellence, research
            productivity, and structured collaboration across academia.
          </p>
        </div>

        {/* 4-Card Polished Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PLATFORM_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white dark:bg-[#1e1b4b] rounded-xl p-6 md:p-8 border border-[#c8c5d0]/40 dark:border-[#787680]/20 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] text-white flex items-center justify-center mb-6 shadow-[0_4px_14px_rgba(122,90,248,0.35)]">
                  <feature.icon className="size-6" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl leading-7 tracking-[-0.01em] font-semibold text-[#140f35] dark:text-[#f8f9ff] mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm leading-5 text-[#47464f] dark:text-[#d5e3fc] leading-relaxed mb-6">
                  {feature.description}
                </p>
              </div>
              <div className="pt-4 border-t border-[#d6d1f5]/60 dark:border-[#787680]/20 flex items-center justify-between text-[#5b3df0] dark:text-[#c4b5fd]">
                <span className="text-xs leading-4 font-semibold">{feature.metric}</span>
                <feature.metricIcon className="size-4" strokeWidth={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
