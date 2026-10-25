import Link from "next/link";
import { ArrowRight, Clock, Inbox } from "lucide-react";

import { StatusChip } from "@/features/admin/components/support-desk/ticket-status-chip";
import { formatRelative } from "@/features/admin/utils/admin-format";

export interface RecentTicketRow {
  id: string;
  ticketNumber: string;
  subject: string;
  statusId: number;
  statusName: string | null;
  createdAt: string;
}

/**
 * Recent Tickets panel: the latest support tickets from users.
 * `rows === null` means live data is not connected; an empty array means
 * there are no tickets yet. Rows reuse the shared StatusChip styling.
 */
export function RecentTicketsPanel({
  rows,
  now,
  loading = false,
}: {
  rows: RecentTicketRow[] | null;
  now: number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 sm:gap-4">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
            aria-hidden="true"
          >
            <Clock className="size-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
              Recent Tickets
            </h2>
            <p className="text-xs text-gray-500">
              Latest support tickets from users.
            </p>
          </div>
        </div>
        <Link
          href="/support-desk"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
        >
          View All Tickets
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <ul className="mt-5 space-y-3 border-t border-gray-100 pt-4" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-gray-100" />
              <span className="h-3.5 min-w-0 flex-1 animate-pulse rounded bg-gray-100" />
              <span className="h-3.5 w-14 shrink-0 animate-pulse rounded bg-gray-100" />
              <span className="h-3.5 w-12 shrink-0 animate-pulse rounded bg-gray-100" />
            </li>
          ))}
        </ul>
      ) : rows === null ? (
        <div className="mt-5 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-600">
            No live data yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            The latest tickets appear once the dashboard is connected to the
            API.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5 rounded-lg px-4 py-8 text-center">
          <Inbox className="mx-auto size-8 text-gray-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-gray-600">
            No tickets yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            New tickets will appear here as soon as users submit them.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/support-desk/${row.id}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 transition-colors hover:bg-gray-50/60 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto_auto]"
              >
                {/* Column 1: ticket ID (fixed track; truncates only if pathological) */}
                <span
                  className="min-w-0 max-w-32 truncate font-mono text-xs font-semibold text-[#2563EB] sm:text-[13px]"
                >
                  {row.ticketNumber}
                </span>
                {/* Column 4 (mobile col 3): right-aligned tabular timestamp */}
                <span
                  className="col-start-3 row-start-1 min-w-16 whitespace-nowrap text-right text-[11px] tabular-nums text-gray-400 sm:min-w-20 sm:col-start-4"
                >
                  {now > 0 ? formatRelative(row.createdAt, now) : "\u2014"}
                </span>
                {/* Mobile row 2 / desktop col 3: status chip, right-aligned on desktop */}
                <span className="col-start-3 row-start-2 justify-self-start sm:row-start-1 sm:justify-self-end">
                  <StatusChip statusId={row.statusId} name={row.statusName} />
                </span>
                {/* Mobile row 2 span / desktop col 2: subject uses min-w-0 + truncate */}
                <span className="col-span-2 col-start-1 row-start-2 min-w-0 truncate text-xs text-gray-700 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-[13px]">
                  {row.subject}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
