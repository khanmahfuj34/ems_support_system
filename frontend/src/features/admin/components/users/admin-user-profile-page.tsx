"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  RefreshCw,
  Ticket as TicketIcon,
  UserRound,
} from "lucide-react";

import {
  getAdminUserProfile,
  listAdminUserTickets,
} from "@/features/admin/services/admin.service";
import type {
  AdminUserProfile,
  AdminUserTicketHistoryItem,
} from "@/features/admin/types/admin.types";
import { StatusChip } from "@/features/admin/components/support-desk/ticket-status-chip";
import { getApiErrorMessage } from "@/lib/api/api-errors";
import { initialsFor, formatDate } from "@/features/admin/utils/admin-format";
import type { TicketPriority } from "@/features/tickets/types/ticket.types";

const PAGE_SIZE = 10;
const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-sky-200 bg-sky-50 text-sky-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

function responseStatus(error: unknown): number | null {
  return (error as { response?: { status?: number } }).response?.status ?? null;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : formatDate(value);
}

function ErrorPanel({
  status,
  message,
  onRetry,
}: {
  status: number | null;
  message: string;
  onRetry: () => void;
}) {
  const notFound = status === 404;
  const unauthorized = status === 401 || status === 403;
  const invalidInput = status === 400;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-semibold text-red-900">
          {notFound
            ? "User not found"
            : invalidInput
              ? "Invalid user ID"
            : unauthorized
              ? "Admin access required"
              : "Could not load user data"}
        </p>
        <p className="mt-1">
          {notFound
            ? "This account may have been removed or the profile URL is incorrect."
            : invalidInput
              ? message
            : status === 401
              ? "Your session is no longer valid. Sign in again to continue."
              : status === 403
                ? "Your account is not authorized to view user profiles."
                : message}
        </p>
        {!notFound && !invalidInput && !unauthorized && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

function TicketHistory({ userId }: { userId: string }) {
  const [tickets, setTickets] = useState<AdminUserTicketHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>();
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [retryKey, setRetryKey] = useState(0);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null, currentPage: number) => {
      controller.current?.abort();
      const abortController = new AbortController();
      controller.current = abortController;
      const id = ++requestId.current;

      try {
        const response = await listAdminUserTickets(
          userId,
          { limit: PAGE_SIZE, cursor },
          abortController.signal,
        );
        if (abortController.signal.aborted || id !== requestId.current) return;
        setTickets(response.data);
        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
        if (response.pagination.total !== undefined) {
          setTotal(response.pagination.total);
        }
        setPageIndex(currentPage);
        setLoading(false);
      } catch (err: unknown) {
        if (abortController.signal.aborted || id !== requestId.current) return;
        setTickets([]);
        setError(getApiErrorMessage(err, "Failed to load ticket history."));
        setErrorStatus(responseStatus(err));
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    const timer = setTimeout(() => void fetchPage(null, 0), 0);
    return () => {
      clearTimeout(timer);
      requestId.current += 1;
      controller.current?.abort();
    };
  }, [fetchPage, retryKey]);

  const goNext = () => {
    if (!hasMore || !nextCursor || loading) return;
    const nextIndex = pageIndex + 1;
    setCursors((current) => [...current.slice(0, nextIndex), nextCursor]);
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    void fetchPage(nextCursor, nextIndex);
  };

  const goPrevious = () => {
    if (pageIndex === 0 || loading) return;
    const previousIndex = pageIndex - 1;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    void fetchPage(cursors[previousIndex] ?? null, previousIndex);
  };

  const retryHistory = () => {
    setCursors([null]);
    setPageIndex(0);
    setTotal(undefined);
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setRetryKey((value) => value + 1);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Ticket history</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {total !== undefined ? `${total} total tickets` : "Tickets submitted by this user"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>Page {pageIndex + 1}</span>
          <button
            type="button"
            onClick={goPrevious}
            disabled={pageIndex === 0 || loading}
            aria-label="Previous ticket history page"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasMore || loading}
            aria-label="Next ticket history page"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-12 text-xs text-gray-500" role="status">
          <Loader2 className="size-4 animate-spin text-blue-600" /> Loading ticket history...
        </div>
      ) : error ? (
        <div className="p-4">
          <ErrorPanel
            status={errorStatus}
            message={error}
            onRetry={retryHistory}
          />
        </div>
      ) : tickets.length === 0 ? (
        <div className="px-5 py-12 text-center text-xs text-gray-500">
          <TicketIcon className="mx-auto mb-2 size-5 text-gray-300" />
          No tickets found for this user.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-gray-50/70 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 sm:px-6">Ticket</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-5 py-3 sm:px-6">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => {
                const priority = ticket.adminPriority ?? ticket.userPriority;
                return (
                  <tr key={ticket.id} className="text-xs hover:bg-gray-50/60">
                    <td className="max-w-[420px] px-5 py-3 sm:px-6">
                      <Link
                        href={`/support-desk/${ticket.id}`}
                        className="block truncate font-medium text-gray-900 hover:text-blue-700"
                      >
                        <span className="font-mono text-[11px] text-blue-600">{ticket.ticketNumber}</span>
                        <span className="mx-2 text-gray-300" aria-hidden="true">·</span>
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip statusId={ticket.statusId} name={ticket.status?.name ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${PRIORITY_CLASSES[priority]}`}>
                        {priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500 sm:px-6">
                      {displayDate(ticket.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdminUserProfilePage({ userId }: { userId: string }) {
  if (!/^[1-9]\d*$/.test(userId)) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <Link href="/admin/dashboard" className="text-xs font-medium text-blue-700 hover:underline">← Admin dashboard</Link>
        <ErrorPanel status={400} message="User IDs must be positive numbers." onRetry={() => undefined} />
      </div>
    );
  }

  return <ValidAdminUserProfilePage key={userId} userId={userId} />;
}

function ValidAdminUserProfilePage({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    const abortController = new AbortController();
    controller.current = abortController;
    const id = ++requestId.current;

    getAdminUserProfile(userId, abortController.signal)
      .then((response) => {
        if (abortController.signal.aborted || id !== requestId.current) return;
        setProfile(response.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted || id !== requestId.current) return;
        setProfile(null);
        setError(getApiErrorMessage(err, "Failed to load the user profile."));
        setErrorStatus(responseStatus(err));
        setLoading(false);
      });

    return () => {
      requestId.current += 1;
      abortController.abort();
    };
  }, [userId, retryKey]);

  const retryProfile = () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setRetryKey((value) => value + 1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/dashboard" className="hover:text-gray-900">Admin dashboard</Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-gray-900">User profile</span>
      </nav>

      {loading ? (
        <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs" role="status" aria-label="Loading user profile">
          <div className="flex animate-pulse items-center gap-4">
            <div className="size-14 rounded-full bg-gray-100" />
            <div className="space-y-2"><div className="h-4 w-40 rounded bg-gray-100" /><div className="h-3 w-56 rounded bg-gray-100" /></div>
          </div>
        </section>
      ) : error ? (
        <ErrorPanel status={errorStatus} message={error} onRetry={retryProfile} />
      ) : profile ? (
        <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">
                {initialsFor(profile.name)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 sm:text-xl">{profile.name}</h1>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                  <Mail className="size-3.5 shrink-0" /><span className="truncate">{profile.email}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{profile.role.name}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {profile.isActive ? "Active" : "Inactive"}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-[11px] text-gray-600">ID {profile.id}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-xl bg-gray-50/70 px-3.5 py-3">
              <CalendarDays className="mt-0.5 size-4 text-gray-400" />
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Account created</p><p className="mt-1 text-xs font-semibold text-gray-800">{displayDate(profile.createdAt)}</p></div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-gray-50/70 px-3.5 py-3">
              <UserRound className="mt-0.5 size-4 text-gray-400" />
              <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Last login</p><p className="mt-1 text-xs font-semibold text-gray-800">{displayDate(profile.lastLoginAt)}</p></div>
            </div>
          </div>
        </section>
      ) : null}

      <TicketHistory key={userId} userId={userId} />
    </div>
  );
}
