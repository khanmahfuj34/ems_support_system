"use client";

import Link from "next/link";
import { Bell, Check, Inbox, Loader2, XCircle, CheckCircle2, RefreshCw } from "lucide-react";

import {
  formatDate,
  formatRelative,
} from "@/features/admin/utils/admin-format";
import type { NotificationsLoadState } from "../hooks/use-notifications";
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

/**
 * Compact recent-notifications panel shown from the workspace bell.
 * Presentational only: data and mutations come from useNotifications.
 */
export function NotificationDropdown({
  state,
  items,
  unreadCount,
  fetchedAt,
  actingId,
  isMarkingAll,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: {
  state: NotificationsLoadState;
  items: NotificationItem[];
  unreadCount: number;
  fetchedAt: number;
  actingId: string | null;
  isMarkingAll: boolean;
  onMarkAsRead: (item: NotificationItem) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Notifications dropdown"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-40 animate-in fade-in-50 zoom-in-95 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-xs font-semibold text-gray-900">
            Notifications
          </p>
          <p className="text-[11px] text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={isMarkingAll || unreadCount === 0}
            title="Mark all as read"
            aria-label="Mark all notifications as read"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {isMarkingAll ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
          </button>
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-[11px] font-semibold text-[#2563EB] hover:underline"
          >
            View all
          </Link>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
        {state === "loading" && items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400">
            Loading notifications…
          </p>
        ) : state === "error" ? (
          <p className="px-4 py-6 text-center text-xs text-red-500">
            Failed to load notifications.
          </p>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Inbox className="mx-auto size-8 text-gray-300" aria-hidden="true" />
            <p className="mt-2 text-xs text-gray-500">
              No notifications yet
            </p>
          </div>
        ) : (
          items.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? Bell;
            const iconStyles =
              TYPE_STYLES[item.type] ?? "bg-gray-100 text-gray-500";
            const unread = !item.isRead;

            const rowClassName = `flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
              unread ? "bg-blue-50/50" : ""
            } hover:bg-gray-50`;

            const unreadDot = unread ? (
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-[#2563EB]"
                aria-hidden="true"
              />
            ) : null;

            const meta = (
              <>
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${iconStyles}`}
                  aria-hidden="true"
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs ${
                      unread
                        ? "font-semibold text-gray-900"
                        : "font-medium text-gray-700"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                    {item.message}
                  </span>
                  <time
                    dateTime={item.createdAt}
                    title={formatDate(item.createdAt)}
                    className="mt-1 block text-[10px] text-gray-400"
                  >
                    {fetchedAt
                      ? formatRelative(item.createdAt, fetchedAt)
                      : ""}
                  </time>
                </span>
                {unread && actingId === null ? (
                  <span
                    className="shrink-0 rounded-md p-1 text-gray-300"
                    title="Unread"
                    aria-hidden="true"
                  >
                    <Bell className="size-3.5" />
                  </span>
                ) : null}
              </>
            );

            const markThis =
              unread && actingId === null
                ? () => onMarkAsRead(item)
                : undefined;

            return item.ticketId ? (
              <Link
                key={item.id}
                href={`/support-desk/${item.ticketId}`}
                onClick={() => {
                  if (markThis) onMarkAsRead(item);
                  onClose();
                }}
                className={rowClassName}
                aria-label={`Open ticket for notification: ${item.title}`}
              >
                {meta}
                {unreadDot}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (markThis) onMarkAsRead(item);
                }}
                className={rowClassName}
              >
                {meta}
                {unreadDot}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
