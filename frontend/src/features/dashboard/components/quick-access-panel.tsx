"use client";

import Link from "next/link";
import { Plus, Ticket, BookOpen, Headphones, ChevronRight, Zap } from "lucide-react";

interface QuickAccessItem {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  iconName: "Plus" | "Ticket" | "BookOpen" | "Headphones";
}

const DEFAULT_ITEMS: QuickAccessItem[] = [
  {
    id: "qa-1",
    title: "Create Request",
    description: "Submit a new IT, HR, or equipment ticket",
    href: "/support-desk/new",
    badge: "Fast Track",
    iconName: "Plus",
  },
  {
    id: "qa-2",
    title: "My Tickets",
    description: "Track live status and conversation history",
    href: "/tickets",
    iconName: "Ticket",
  },
  {
    id: "qa-3",
    title: "Knowledge Base",
    description: "Find instant answers in guides & FAQs",
    href: "/support-desk#knowledge-base",
    badge: "Self-help",
    iconName: "BookOpen",
  },
  {
    id: "qa-4",
    title: "Contact Support",
    description: "Direct assistance & emergency support line",
    href: "mailto:support@ems.internal",
    iconName: "Headphones",
  },
];

const ICONS = {
  Plus,
  Ticket,
  BookOpen,
  Headphones,
};

export function QuickAccessPanel() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Zap className="size-4.5 text-blue-600" />
          Quick Access
        </h2>
        <span className="text-xs text-slate-400">Shortcuts</span>
      </div>

      <div className="space-y-2.5">
        {DEFAULT_ITEMS.map((item) => {
          const Icon = ICONS[item.iconName] || Plus;
          const isPrimary = item.iconName === "Plus";

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`group flex items-center justify-between rounded-xl border p-3.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md ${
                isPrimary
                  ? "border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 hover:border-blue-400"
                  : "border-slate-200/70 bg-white hover:border-blue-300 hover:bg-slate-50/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 ease-out group-hover:scale-105 ${
                    isPrimary
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <Icon className="size-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-medium text-blue-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>

              <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
