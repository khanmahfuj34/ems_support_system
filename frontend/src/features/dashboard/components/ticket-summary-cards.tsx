"use client";

import Link from "next/link";
import { Ticket, Clock, Activity, CheckCircle2, ArrowUpRight } from "lucide-react";
import type { UserDashboardStats } from "../hooks/use-user-dashboard";
import { AnimatedCounter } from "./animated-counter";

interface TicketSummaryCardsProps {
  stats?: UserDashboardStats | null;
  loading?: boolean;
}

export function TicketSummaryCards({
  stats,
  loading = false,
}: TicketSummaryCardsProps) {
  const cards = [
    {
      label: "Total Tickets",
      value: stats?.total ?? null,
      sublabel: "Submitted overall",
      icon: Ticket,
      iconBg: "bg-blue-50 text-blue-600",
      borderHover: "hover:border-blue-300",
      accentDot: "bg-blue-500",
      href: "/tickets",
    },
    {
      label: "Open Tickets",
      value: stats?.open ?? null,
      sublabel: "Awaiting resolution",
      icon: Clock,
      iconBg: "bg-sky-50 text-sky-600",
      borderHover: "hover:border-sky-300",
      accentDot: "bg-sky-500",
      href: "/tickets",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? null,
      sublabel: "Under active work",
      icon: Activity,
      iconBg: "bg-indigo-50 text-indigo-600",
      borderHover: "hover:border-indigo-300",
      accentDot: "bg-indigo-500",
      href: "/tickets",
    },
    {
      label: "Resolved",
      value: stats?.resolved ?? null,
      sublabel: "Successfully solved",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      borderHover: "hover:border-emerald-300",
      accentDot: "bg-emerald-500",
      href: "/tickets",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${card.borderHover}`}
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2.5 transition-transform duration-300 ease-out group-hover:scale-105 ${card.iconBg}`}>
                <Icon className="size-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors duration-200">
                View
                <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="h-9 w-20 animate-shimmer rounded-md" />
              ) : (
                <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  <AnimatedCounter value={card.value} />
                </div>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {card.label}
                </span>
                <span className="text-xs text-slate-400">{card.sublabel}</span>
              </div>
            </div>

            {/* Bottom accent pill line */}
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${card.accentDot} transition-all duration-500 ease-out group-hover:w-full`}
                style={{ width: "35%" }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
