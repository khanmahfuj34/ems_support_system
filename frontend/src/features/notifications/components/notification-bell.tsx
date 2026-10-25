"use client";

import { useEffect, useRef, useState } from "react";

import { Bell } from "lucide-react";

import { useNotifications } from "../hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

/** How often the workspace bell refreshes unread notifications. */
const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

/**
 * Workspace bell: live unread badge, a compact recent-notifications dropdown,
 * a refresh on open plus periodic background polling. The hook runs on the
 * first page of the list so its data is reused for the dropdown panel.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    state,
    items,
    unreadCount,
    fetchedAt,
    actingId,
    isMarkingAll,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications(false);

  // Close on outside clicks and Escape while the dropdown is open.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Fresh data every time the dropdown opens (silent; keeps old rows until
  // the response arrives).
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Periodic polling while the authenticated workspace is mounted.
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refresh();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [refresh]);

  // Stay in sync when another notification UI (e.g. the /notifications
  // page) performs a mark-read mutation.
  useEffect(() => {
    const handleUpdated = () => refresh();
    window.addEventListener(
      "supportdesk:notifications-updated",
      handleUpdated,
    );
    return () => {
      window.removeEventListener(
        "supportdesk:notifications-updated",
        handleUpdated,
      );
    };
  }, [refresh]);

  const badgeLabel =
    unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#EF4444] text-[10px] font-bold leading-4 text-white ring-2 ring-white text-center">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationDropdown
          state={state}
          items={items}
          unreadCount={unreadCount}
          fetchedAt={fetchedAt}
          actingId={actingId}
          isMarkingAll={isMarkingAll}
          onMarkAsRead={(item) => void markAsRead(item)}
          onMarkAllAsRead={() => void markAllAsRead()}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
