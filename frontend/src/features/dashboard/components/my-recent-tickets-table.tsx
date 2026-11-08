"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Inbox, Ticket as TicketIcon } from "lucide-react";
import type { TicketListRow } from "@/features/tickets/types/ticket.types";
import { PRIORITY_BADGE_CLASSES } from "@/features/tickets/utils/ticket-badges";
import { formatDayOnly } from "@/features/admin/utils/admin-format";

const TICKET_STATUS_ID = {
  OPEN: 1,
  PENDING_REVIEW: 2,
  ACCEPTED: 3,
  IN_PROGRESS: 4,
  WAITING_FOR_USER: 5,
  RESOLVED: 6,
  CLOSED: 7,
  REJECTED: 8,
  REOPENED: 9,
} as const;

const STATUS_BADGE_CLASSES: Record<number, string> = {
  [TICKET_STATUS_ID.OPEN]: "border-sky-200 bg-sky-50 text-sky-700",
  [TICKET_STATUS_ID.PENDING_REVIEW]: "border-blue-200 bg-blue-50 text-blue-700",
  [TICKET_STATUS_ID.ACCEPTED]: "border-sky-200 bg-sky-50 text-sky-700",
  [TICKET_STATUS_ID.IN_PROGRESS]: "border-amber-200 bg-amber-50 text-amber-700",
  [TICKET_STATUS_ID.WAITING_FOR_USER]: "border-indigo-200 bg-indigo-50 text-indigo-700",
  [TICKET_STATUS_ID.RESOLVED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [TICKET_STATUS_ID.CLOSED]: "border-slate-200 bg-slate-100 text-slate-600",
  [TICKET_STATUS_ID.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [TICKET_STATUS_ID.REOPENED]: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const STATUS_LABELS: Record<number, string> = {
  [TICKET_STATUS_ID.OPEN]: "Open",
  [TICKET_STATUS_ID.PENDING_REVIEW]: "Pending Review",
  [TICKET_STATUS_ID.ACCEPTED]: "Accepted",
  [TICKET_STATUS_ID.IN_PROGRESS]: "In Progress",
  [TICKET_STATUS_ID.WAITING_FOR_USER]: "Action Required",
  [TICKET_STATUS_ID.RESOLVED]: "Resolved",
  [TICKET_STATUS_ID.CLOSED]: "Closed",
  [TICKET_STATUS_ID.REJECTED]: "Rejected",
  [TICKET_STATUS_ID.REOPENED]: "Reopened",
};

interface MyRecentTicketsTableProps {
  tickets: TicketListRow[];
  loading?: boolean;
}

export function MyRecentTicketsTable({
  tickets,
  loading = false,
}: MyRecentTicketsTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TicketIcon className="size-4.5 text-blue-600" />
            My Recent Tickets
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time status updates on your recently reported issues
          </p>
        </div>

        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-all duration-200 hover:text-blue-700 hover:translate-x-0.5"
        >
          <span>View All Tickets</span>
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3 py-2">
          <div className="h-10 w-full animate-shimmer rounded-lg" />
          <div className="h-10 w-full animate-shimmer rounded-lg" />
          <div className="h-10 w-full animate-shimmer rounded-lg" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-slate-100 p-3 text-slate-400">
            <Inbox className="size-6" />
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700">No tickets yet</p>
          <p className="text-xs text-slate-400">
            Submit your first ticket using the Create Request button.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-3">Ticket ID</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => {
                  const priority = ticket.adminPriority ?? ticket.userPriority;
                  const priorityClass =
                    PRIORITY_BADGE_CLASSES[priority] ||
                    "border-slate-200 bg-slate-50 text-slate-700";
                  const statusClass =
                    STATUS_BADGE_CLASSES[ticket.statusId] ||
                    "border-slate-200 bg-slate-50 text-slate-700";
                  const statusLabel =
                    ticket.status?.name ??
                    STATUS_LABELS[ticket.statusId] ??
                    "Pending";

                  return (
                    <tr
                      key={ticket.id}
                      className="group transition-all duration-200 hover:bg-blue-50/60 hover:translate-x-0.5"
                    >
                      <td className="py-3.5 pr-3 font-mono font-semibold text-blue-700">
                        <Link
                          href={`/support-desk/${ticket.id}`}
                          className="hover:underline"
                        >
                          {ticket.ticketNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/support-desk/${ticket.id}`}
                          className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 max-w-xs"
                        >
                          {ticket.subject}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 whitespace-nowrap">
                          {ticket.category?.name ?? "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityClass}`}
                        >
                          {priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDayOnly(ticket.createdAt)}
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <Link
                          href={`/support-desk/${ticket.id}`}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                          aria-label={`View ticket ${ticket.ticketNumber}`}
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="space-y-3 md:hidden">
            {tickets.map((ticket) => {
              const priority = ticket.adminPriority ?? ticket.userPriority;
              const priorityClass =
                PRIORITY_BADGE_CLASSES[priority] ||
                "border-slate-200 bg-slate-50 text-slate-700";
              const statusClass =
                STATUS_BADGE_CLASSES[ticket.statusId] ||
                "border-slate-200 bg-slate-50 text-slate-700";
              const statusLabel =
                ticket.status?.name ??
                STATUS_LABELS[ticket.statusId] ??
                "Pending";

              return (
                <Link
                  key={ticket.id}
                  href={`/support-desk/${ticket.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-300 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      {ticket.ticketNumber}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-900 line-clamp-2">
                    {ticket.subject}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">
                        {ticket.category?.name ?? "General"}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${priorityClass}`}
                      >
                        {priority}
                      </span>
                    </div>
                    <span>{formatDayOnly(ticket.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
