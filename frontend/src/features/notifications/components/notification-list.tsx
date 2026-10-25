"use client";

import Link from "next/link";
import {
  Bell,
  Check,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildPageItemsWithGaps,
} from "@/features/admin/utils/pagination";
import {
  formatDate,
  formatRelative,
} from "@/features/admin/utils/admin-format";
import { useNotifications } from "../hooks/use-notifications";
import type { NotificationItem } from "../types/notification.types";

const TYPE_ICONS: Record<string, typeof Bell> = {
  TICKET_ACCEPTED: CheckCircle2,
  TICKET_REJECTED: XCircle,
  TICKET_STATUS_CHANGED: RefreshCw,
};

const TYPE_STYLES: Record<string, string> = {
  TICKET_ACCEPTED: "bg-emerald-100 text-emerald-600",
  TICKET_REJECTED: "bg-red-100 text-red-600",
  TICKET_STATUS_CHANGED: "bg-blue-100 text-[#2563EB]",
};

function notificationHref(item: NotificationItem) {
  return item.ticketId ? `/support-desk/${item.ticketId}` : null;
}

export function NotificationList() {
  const {
    state,
    items,
    page,
    totalPages,
    total,
    unreadCount,
    fetchedAt,
    errorMsg,
    actingId,
    isMarkingAll,
    markAsRead,
    markAllAsRead,
    retry,
    goToPage,
  } = useNotifications(false);

  const pageItems = buildPageItemsWithGaps(page, totalPages);

  return (
    <section
      aria-labelledby="notifications-heading"
      className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            id="notifications-heading"
            className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl"
          >
            Notifications
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You are all caught up"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void markAllAsRead()}
          disabled={isMarkingAll || unreadCount === 0}
          aria-label="Mark all notifications as read"
        >
          {isMarkingAll ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Mark all as read
        </Button>
      </header>

      {state === "error" ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700"
        >
          {errorMsg}
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void retry()}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : state === "loading" ? (
        <ul className="space-y-3" aria-busy="true" aria-label="Loading notifications">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <div className="flex gap-3 rounded-lg border border-gray-100 p-4">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white px-4 py-12 text-center">
          <Inbox className="mx-auto size-10 text-gray-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            No notifications yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Updates about your tickets will appear here.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? Bell;
              const iconStyles = TYPE_STYLES[item.type] ?? "bg-gray-100 text-gray-500";
              const href = notificationHref(item);
              const unread = !item.isRead;

              return (
                <li key={item.id}>
                  <div
                    className={`flex gap-3 rounded-lg border p-4 transition-colors sm:gap-4 ${
                      unread
                        ? "border-blue-200 bg-blue-50/40"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconStyles}`}
                      aria-hidden="true"
                    >
                      <Icon className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`text-sm ${
                            unread
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {item.title}
                        </span>
                        {unread ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                            aria-label="Unread notification"
                          >
                            <span
                              className="size-1.5 rounded-full bg-blue-600"
                              aria-hidden="true"
                            />
                            New
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-gray-600">
                        {item.message}
                      </p>

                      <time
                        dateTime={item.createdAt}
                        title={formatDate(item.createdAt)}
                        className="mt-2 block text-[11px] text-gray-400"
                      >
                        {formatRelative(item.createdAt, fetchedAt)}
                      </time>
                    </div>

                    <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                      {unread ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => void markAsRead(item)}
                          disabled={actingId !== null}
                          aria-label={`Mark "${item.title}" as read`}
                        >
                          {actingId === item.id && (
                            <Loader2 className="animate-spin" aria-hidden="true" />
                          )}
                          Mark as read
                        </Button>
                      ) : null}

                      {href ? (
                        <Link
                          href={href}
                          onClick={
                            unread
                              ? () => void markAsRead(item)
                              : undefined
                          }
                          className="text-xs font-semibold text-[#2563EB] hover:underline"
                          aria-label={`${unread ? "Open linked ticket and mark as read: " : "Open linked ticket: "}${item.title}`}
                        >
                          View ticket
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav
              aria-label="Notification pages"
              className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
            >
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => void goToPage(page - 1)}
                aria-label="Previous page"
              >
                Previous
              </Button>

              {pageItems.map((item, index) =>
                item === "gap" ? (
                  <span
                    key={`gap-${index}`}
                    className="px-1 text-xs text-gray-400"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void goToPage(item)}
                    aria-current={item === page ? "page" : undefined}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      item === page
                        ? "bg-[#2563EB] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={page >= totalPages}
                onClick={() => void goToPage(page + 1)}
                aria-label="Next page"
              >
                Next
              </Button>
            </nav>
          ) : null}

          <p className="sr-only" aria-live="polite">
            {items.length} notifications shown, {unreadCount} unread, page {page} of{" "}
            {totalPages}, {total} total.
          </p>
        </>
      )}
    </section>
  );
}
