"use client";

import Link from "next/link";
import {
  Clock,
  ArrowRight,
  MessageSquareReply,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import type { TicketListRow } from "@/features/tickets/types/ticket.types";
import { PRIORITY_BADGE_CLASSES } from "@/features/tickets/utils/ticket-badges";
import { formatDayOnly, formatRelative } from "@/features/admin/utils/admin-format";

interface ActionRequiredPanelProps {
  tickets: TicketListRow[];
  loading?: boolean;
  now?: number;
}

export function ActionRequiredPanel({
  tickets,
  loading = false,
  now,
}: ActionRequiredPanelProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="size-8 animate-shimmer rounded-lg" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-shimmer rounded" />
            <div className="h-3 w-48 animate-shimmer rounded" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-20 animate-shimmer rounded-xl" />
          <div className="h-20 animate-shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <ShieldAlert className="size-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Action Required
              {tickets.length > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {tickets.length} waiting
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Support engineers are waiting for your response to continue work
            </p>
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-4 rounded-xl border border-blue-200/60 bg-white/90 p-4 text-center">
          <div className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-1.5">
            <CheckCircle2 className="size-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            All caught up!
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            No tickets currently require your response. You will see updates here when action is needed.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {tickets.map((ticket) => {
            const priority = ticket.adminPriority ?? ticket.userPriority;
            const priorityClass =
              PRIORITY_BADGE_CLASSES[priority] ||
              "border-slate-200 bg-slate-50 text-slate-700";

            return (
              <div
                key={ticket.id}
                className="group relative flex flex-col justify-between gap-3 rounded-xl border border-blue-200/80 bg-white p-4 shadow-2xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-300 hover:shadow-md md:flex-row md:items-center"
              >
                {/* Left Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      {ticket.ticketNumber}
                    </span>
                    {ticket.category?.name && (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {ticket.category.name}
                      </span>
                    )}
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${priorityClass}`}
                    >
                      {priority}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {ticket.subject}
                  </h3>

                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    <span className="font-medium text-slate-700">Status: </span>
                    {ticket.descriptionPreview ||
                      "Awaiting your reply to the technician inquiry."}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-slate-400" />
                      Updated {now ? formatRelative(ticket.updatedAt, now) : formatDayOnly(ticket.updatedAt)}
                    </span>
                    {ticket.resolutionDueAt && (
                      <span className="flex items-center gap-1 font-medium text-amber-600">
                        Due: {formatDayOnly(ticket.resolutionDueAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0 self-end md:self-center">
                  <Link
                    href={`/support-desk/${ticket.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                  >
                    <MessageSquareReply className="size-3.5" />
                    <span>Respond Now</span>
                    <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
