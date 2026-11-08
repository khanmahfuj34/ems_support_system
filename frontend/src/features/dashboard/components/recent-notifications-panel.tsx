"use client";

import Link from "next/link";
import {
  Bell,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  Info,
  Clock,
} from "lucide-react";
import type { NotificationItem } from "@/features/notifications/types/notification.types";
import { formatRelative } from "@/features/admin/utils/admin-format";

interface RecentNotificationsPanelProps {
  notifications: NotificationItem[];
  unreadCount?: number;
  loading?: boolean;
  now?: number;
}

export function RecentNotificationsPanel({
  notifications,
  unreadCount = 0,
  loading = false,
  now,
}: RecentNotificationsPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Bell className="size-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <Link
          href="/notifications"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-all duration-200 hover:text-blue-700 hover:translate-x-0.5"
        >
          <span>View All</span>
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          <div className="h-12 w-full animate-shimmer rounded-lg" />
          <div className="h-12 w-full animate-shimmer rounded-lg" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No recent notifications
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((notif) => {
            let Icon = Info;
            let iconColor = "bg-blue-50 text-blue-600";

            if (notif.type === "TICKET_ACCEPTED") {
              Icon = CheckCircle2;
              iconColor = "bg-emerald-50 text-emerald-600";
            } else if (notif.type === "TICKET_REJECTED") {
              Icon = XCircle;
              iconColor = "bg-red-50 text-red-600";
            } else if (notif.type === "TICKET_STATUS_CHANGED") {
              Icon = RefreshCw;
              iconColor = "bg-sky-50 text-sky-600";
            } else if (notif.type === "TICKET_COMMENT") {
              Icon = MessageSquare;
              iconColor = "bg-indigo-50 text-indigo-600";
            }

            const isUnread = !notif.isRead;

            const content = (
              <div className="flex items-start gap-3 py-3 group">
                <div
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${iconColor}`}
                >
                  <Icon className="size-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs ${
                        isUnread
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-700"
                      }`}
                    >
                      {notif.title}
                    </span>
                    {isUnread && (
                      <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                    )}
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                    {notif.message}
                  </p>

                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="size-3" />
                    <span>{now ? formatRelative(notif.createdAt, now) : notif.createdAt}</span>
                  </div>
                </div>
              </div>
            );

            if (notif.ticketId) {
              return (
                <Link
                  key={notif.id}
                  href={`/support-desk/${notif.ticketId}`}
                  className="block transition-all duration-200 hover:bg-slate-50/90 hover:translate-x-0.5 -mx-2 px-2 rounded-lg"
                >
                  {content}
                </Link>
              );
            }

            return <div key={notif.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
