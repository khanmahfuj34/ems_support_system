"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, Loader2, X } from "lucide-react";

import { PRIORITY_BADGE_CLASSES } from "@/features/tickets/utils/ticket-badges";
import { formatDate } from "../../utils/admin-format";
import type { AdminTicketRow } from "../../types/admin.types";

export function ReviewQueueTable({
  pageRows,
  actingTicketId,
  isRejecting,
  rejectTargetId,
  onAccept,
  onReject,
}: {
  pageRows: AdminTicketRow[];
  actingTicketId: string | null;
  isRejecting: boolean;
  rejectTargetId: string | null;
  onAccept: (ticket: AdminTicketRow) => void;
  onReject: (ticket: AdminTicketRow) => void;
}) {
  return (
    <div className="border-t border-gray-100 overflow-x-auto">
      <table className="w-full text-xs sm:text-[13px] min-w-[640px]">
        <thead>
          <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
            <th className="px-4 sm:px-6 py-3 font-semibold">Ticket</th>
            <th className="px-4 py-3 font-semibold">Subject</th>
            <th className="px-4 py-3 font-semibold hidden md:table-cell">
              Category
            </th>
            <th className="px-4 py-3 font-semibold">Priority</th>
            <th className="px-4 py-3 font-semibold hidden lg:table-cell">
              Created
            </th>
            <th className="px-4 sm:px-6 py-3 font-semibold text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pageRows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 sm:px-6 py-10 text-center text-xs text-gray-400"
              >
                No tickets match your filters.
              </td>
            </tr>
          ) : (
            pageRows.map((ticket) => (
              <tr
                key={ticket.id}
                className="align-middle hover:bg-gray-50/60"
              >
                <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <Link
                    href={`/support-desk/${ticket.id}`}
                    className="font-mono font-semibold text-[#2563EB] hover:underline"
                  >
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-gray-900 max-w-[180px] sm:max-w-[240px] truncate">
                    {ticket.subject}
                  </p>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell text-gray-600 whitespace-nowrap">
                  {ticket.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      PRIORITY_BADGE_CLASSES[
                        ticket.adminPriority ?? ticket.userPriority
                      ] ?? "border-gray-200 bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ticket.adminPriority ?? ticket.userPriority}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-gray-400" />
                    {formatDate(ticket.createdAt)}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {rejectTargetId === ticket.id ? (
                      <span className="text-[11px] text-gray-400">
                        Rejection form below
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={actingTicketId !== null || isRejecting}
                          onClick={() => onAccept(ticket)}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-[#DCFCE7] px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-emerald-700 hover:bg-emerald-100/70 transition-colors disabled:opacity-50"
                        >
                          {actingTicketId === ticket.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3.5" />
                          )}
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={actingTicketId !== null || isRejecting}
                          onClick={() => onReject(ticket)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-[#FEE2E2] px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-red-700 hover:bg-red-100/70 transition-colors disabled:opacity-50"
                        >
                          <X className="size-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
