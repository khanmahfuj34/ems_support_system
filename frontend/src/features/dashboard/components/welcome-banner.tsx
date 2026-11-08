"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Ticket, Sparkles, ArrowRight } from "lucide-react";

interface WelcomeBannerProps {
  userName?: string | null;
}

export function WelcomeBanner({ userName }: WelcomeBannerProps) {
  const displayName = userName?.trim() || "Mahfuj Khan";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#172554] via-[#1e1b4b] to-[#2e1065] text-white shadow-sm">
      {/* Smooth ambient background glow to blend with the illustration palette */}
      <div className="pointer-events-none absolute -right-10 -top-20 size-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-1/3 size-64 rounded-full bg-purple-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-between gap-6 p-6 sm:p-8 md:flex-row">
        {/* Left Column: Greeting & Actions */}
        <div className="max-w-xl flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur-sm border border-white/10">
            <Sparkles className="size-3.5 text-indigo-300" />
            <span>Employee Support Portal</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Welcome back, {displayName} 👋
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-indigo-100/90 sm:text-base">
            Track your open tickets, respond promptly to technician updates,
            and create new support requests anytime.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link
              href="/support-desk/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              <Plus className="size-4 text-blue-600" />
              <span>Create Support Request</span>
            </Link>

            <Link
              href="/tickets"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-0 active:scale-[0.98]"
            >
              <Ticket className="size-4 text-indigo-200" />
              <span>View All Tickets</span>
              <ArrowRight className="size-3.5 text-indigo-200" />
            </Link>
          </div>
        </div>

        {/* Right Column: Hero Illustration (Clean, borderless, smoothly integrated with gentle float) */}
        <div className="relative flex shrink-0 items-center justify-center">
          <div className="relative h-44 w-64 overflow-hidden rounded-2xl shadow-lg sm:h-48 sm:w-72 animate-float-gentle transition-shadow duration-300 hover:shadow-xl">
            <Image
              src="/images/Dashboard/Animated Purple Task Card Workflow.gif"
              alt="Support Task Workflow"
              fill
              unoptimized
              sizes="(max-width: 640px) 256px, 288px"
              className="object-cover object-center"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

