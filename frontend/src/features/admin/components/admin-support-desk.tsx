"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Flag,
  Folder,
  Inbox,
  Loader2,
  MessageCircle,
  MoreVertical,
  NotebookPen,
  Paperclip,
  Plus,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import {
  acceptTicket,
  countTickets,
  getAdminApiErrorMessage,
  listTickets,
  rejectTicket,
} from "@/features/admin/services/admin.service";
import type { AdminTicketRow } from "@/features/admin/types/admin.types";
import { getTicket } from "@/features/tickets/services/ticket.service";
import type {
  TicketAttachmentData,
  TicketDetailData,
  TicketPriority,
} from "@/features/tickets/types/ticket.types";
import { RichTextContent } from "@/features/tickets/components/rich-text-content";
import { TicketComments } from "@/features/tickets/components/ticket-comments";
import {
  getCategories,
} from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";

/* ---------------------------------------------------------------- tokens --- */

// Seeded ticket_statuses table ids.
const STATUS_ID = {
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

const SLA_STATUS_ON_TRACK = 1;

const PAGE_SIZE = 10;

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-sky-200 bg-sky-50 text-sky-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

const PRIORITY_DOT_CLASSES: Record<string, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-red-500",
  CRITICAL: "bg-red-600",
};

const STATUS_CHIP_CLASSES: Record<number, string> = {
  [STATUS_ID.OPEN]: "border-gray-200 bg-gray-50 text-gray-600",
  [STATUS_ID.PENDING_REVIEW]: "border-blue-200 bg-blue-50 text-blue-700",
  [STATUS_ID.ACCEPTED]: "border-sky-200 bg-sky-50 text-sky-700",
  [STATUS_ID.IN_PROGRESS]: "border-gray-200 bg-gray-100 text-gray-700",
  [STATUS_ID.WAITING_FOR_USER]: "border-amber-200 bg-amber-50 text-amber-700",
  [STATUS_ID.RESOLVED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [STATUS_ID.CLOSED]: "border-gray-200 bg-gray-100 text-gray-500",
  [STATUS_ID.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [STATUS_ID.REOPENED]: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
];

const QUEUE_TABS: {
  key: string;
  label: string;
  statusId: number | undefined;
  countKey: string;
}[] = [
  { key: "ALL", label: "All Tickets", statusId: undefined, countKey: "total" },
  {
    key: "PENDING_REVIEW",
    label: "Pending Review",
    statusId: STATUS_ID.PENDING_REVIEW,
    countKey: "pending",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    statusId: STATUS_ID.IN_PROGRESS,
    countKey: "inProgress",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    statusId: STATUS_ID.RESOLVED,
    countKey: "resolved",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    statusId: STATUS_ID.REJECTED,
    countKey: "rejected",
  },
  { key: "CLOSED", label: "Closed", statusId: STATUS_ID.CLOSED, countKey: "closed" },
];

const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "ALL", label: "All Time", days: null },
  { value: "TODAY", label: "Today", days: 1 },
  { value: "LAST_7_DAYS", label: "Last 7 days", days: 7 },
  { value: "LAST_30_DAYS", label: "Last 30 days", days: 30 },
];

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

type DetailTab = "details" | "conversation" | "attachments" | "activity";

/* --------------------------------------------------------------- helpers --- */

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatDayOnly(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function initialsFor(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

function avatarColorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Relative time for list rows ("2 hours ago"), computed at fetch time with an
 * injected `now`, so the render pass contains no impure clock reads. */
function formatRelative(iso: string, now: number) {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDayOnly(iso);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatSlaRemaining(ms: number) {
  if (ms <= 0) return "Over due";
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function statusLabel(name: string | null | undefined) {
  if (!name) return "Unknown";
  return name
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Pager items: numbers with gap markers, like 1 2 3 4 5 … 13. */
function buildPageItems(current: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(1, Math.min(current - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const items: (number | "gap")[] = [];
  if (start > 1) {
    items.push(1);
    if (start > 2) items.push("gap");
  }
  for (let index = start; index <= end; index += 1) items.push(index);
  if (end < totalPages) {
    if (end < totalPages - 1) items.push("gap");
    items.push(totalPages);
  }
  return items;
}

/* --------------------------------------------------------------- pieces --- */

function StatCard({
  label,
  value,
  sublabel,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number | null;
  sublabel: string;
  icon: typeof BarChart3;
  iconBg: string;
  iconColor: string;
}) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 sm:px-5 py-4 shadow-xs">
      <div
        className={`size-10 sm:size-11 shrink-0 rounded-lg flex items-center justify-center ${iconBg}`}
      >
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
          {label}
        </p>
        <span className="block text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          {value === null ? "—" : value}
        </span>
        <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">
          {sublabel}
        </p>
      </div>
    </div>
  );
}

function StatusChip({
  statusId,
  name,
}: {
  statusId: number;
  name: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        STATUS_CHIP_CLASSES[statusId] ??
        "border-gray-200 bg-gray-100 text-gray-600"
      }`}
    >
      {statusId === STATUS_ID.REJECTED && <XCircle className="size-3" />}
      {statusId === STATUS_ID.RESOLVED && <CheckCircle2 className="size-3" />}
      {statusId === STATUS_ID.IN_PROGRESS && <Clock3 className="size-3" />}
      {statusLabel(name)}
    </span>
  );
}

function ReadOnlySelect({
  value,
  dotColor,
}: {
  value: string;
  dotColor?: string;
}) {
  return (
    <div className="relative w-full sm:w-48">
      {dotColor && (
        <span
          className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-2 rounded-full ${dotColor}`}
          aria-hidden="true"
        />
      )}
      <select
        disabled
        value={value}
        aria-label={value}
        className="w-full appearance-none rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-7 pr-7 text-xs font-medium text-gray-700 disabled:cursor-not-allowed"
      >
        <option>{value}</option>
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
        <ChevronDown className="size-3.5" />
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <Inbox className="size-8 text-gray-300" />
      <p className="mt-2 text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- main --- */

type ListRow = AdminTicketRow & { timeAgo: string };

export function AdminSupportDesk() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  /* --- list --- */
  const [listState, setListState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<ListRow[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  /* --- filters --- */
  const [statusFilter, setStatusFilter] = useState<number | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<{
    value: string;
    cutoff: number | null;
  }>({ value: "ALL", cutoff: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  /* --- summary counts + categories --- */
  const [counts, setCounts] = useState<{
    total: number | null;
    pending: number | null;
    inProgress: number | null;
    resolved: number | null;
    rejected: number | null;
    closed: number | null;
  }>({
    total: null,
    pending: null,
    inProgress: null,
    resolved: null,
    rejected: null,
    closed: null,
  });
  const [categories, setCategories] = useState<Category[]>([]);

  /* --- selection / detail --- */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [detail, setDetail] = useState<TicketDetailData | null>(null);
  const [detailLoadedId, setDetailLoadedId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<DetailTab>("details");

  /* --- ticket actions --- */
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  /* --- misc UI --- */
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);

  /* Summary counts + categories. Failures degrade to "—" gracefully. */
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      countTickets(),
      countTickets({ statusId: STATUS_ID.PENDING_REVIEW }),
      countTickets({ statusId: STATUS_ID.IN_PROGRESS }),
      countTickets({ statusId: STATUS_ID.RESOLVED }),
      countTickets({ statusId: STATUS_ID.REJECTED }),
      countTickets({ statusId: STATUS_ID.CLOSED }),
      getCategories(),
    ]).then(
      ([
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        closed,
        categoryList,
      ]) => {
        if (cancelled) return;
        setCounts({
          total: total.status === "fulfilled" ? total.value : null,
          pending: pending.status === "fulfilled" ? pending.value : null,
          inProgress: inProgress.status === "fulfilled" ? inProgress.value : null,
          resolved: resolved.status === "fulfilled" ? resolved.value : null,
          rejected: rejected.status === "fulfilled" ? rejected.value : null,
          closed: closed.status === "fulfilled" ? closed.value : null,
        });
        if (categoryList.status === "fulfilled") {
          setCategories(categoryList.value);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* Ticket list: server-side filters + pagination. */
  useEffect(() => {
    let cancelled = false;

    listTickets({
      page,
      statusId: statusFilter === "ALL" ? undefined : statusFilter,
      categoryId: categoryFilter === "ALL" ? undefined : categoryFilter,
      priority:
        priorityFilter === "ALL"
          ? undefined
          : (priorityFilter as TicketPriority),
    })
      .then((response) => {
        if (cancelled) return;
        const now = Date.now();
        setTickets(
          response.data.map((row) => ({
            ...row,
            timeAgo: formatRelative(row.createdAt, now),
          })),
        );
        setServerTotal(response.pagination.total);
        setServerTotalPages(Math.max(1, response.pagination.totalPages));
        setListState("success");
        setListError(null);
        // Open the first ticket automatically until the admin picks one.
        setSelectedId((current) => current ?? response.data[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setListError(
          getAdminApiErrorMessage(
            err,
            "Failed to load tickets. Please try again.",
          ),
        );
        setListState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, categoryFilter, priorityFilter, reloadKey]);

  /* Selected ticket detail. Panel state is derived in render (see
     detailPanelState), so the effect only writes state from async callbacks. */
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    getTicket(selectedId)
      .then((response) => {
        if (cancelled) return;
        setDetail(response.data);
        setDetailLoadedId(selectedId);
        setFetchedAt(Date.now());
        setDetailError(null);
        setDetailErrorId(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDetailError(
          getAdminApiErrorMessage(
            err,
            "Failed to load this ticket. It may have been removed.",
          ),
        );
        setDetailErrorId(selectedId);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, detailReloadKey]);

  const visibleTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const cutoff = dateFilter.cutoff;
    return tickets.filter((ticket) => {
      if (
        cutoff !== null &&
        new Date(ticket.createdAt).getTime() < cutoff
      ) {
        return false;
      }
      if (term) {
        const haystack = [
          ticket.ticketNumber,
          ticket.subject,
          ticket.category?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [tickets, searchTerm, dateFilter]);

  const refreshData = useCallback(() => {
    setReloadKey((count) => count + 1);
  }, []);

  const copyTicketNumber = useCallback(
    (ticketNumber: string) => {
      navigator.clipboard
        .writeText(ticketNumber)
        .then(() =>
          showSuccessToast({
            title: "Copied",
            description: `Ticket ID ${ticketNumber} copied to clipboard.`,
          }),
        )
        .catch(() =>
          showErrorToast({
            title: "Copy failed",
            description: "The ticket ID could not be copied.",
          }),
        );
    },
    [showSuccessToast, showErrorToast],
  );

  const selectTicket = (ticket: AdminTicketRow) => {
    setSelectedId(ticket.id);
    setSelectedTab("details");
    setRejectOpen(false);
    setRejectError(null);
    setDetailMenuOpen(false);
  };

  const handleAccept = async () => {
    if (!detail || isAccepting || isRejecting) return;
    setIsAccepting(true);
    try {
      const response = await acceptTicket(detail.id);
      showSuccessToast({
        title: "Ticket accepted",
        description: `Ticket ${response.data.ticketNumber} is now ${response.data.status.toLowerCase()}.`,
      });
      setRejectOpen(false);
      refreshData();
      setDetailReloadKey((count) => count + 1);
    } catch (err) {
      showErrorToast({
        title: "Accept failed",
        description: getAdminApiErrorMessage(
          err,
          "Failed to accept the ticket. Please try again.",
        ),
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!detail || isRejecting || isAccepting) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("A rejection reason is required.");
      return;
    }
    setIsRejecting(true);
    setRejectError(null);
    try {
      const response = await rejectTicket(detail.id, reason);
      showSuccessToast({
        title: "Ticket rejected",
        description: `Ticket ${response.data.ticketNumber} was rejected and the requester has been notified.`,
      });
      setRejectOpen(false);
      setRejectReason("");
      refreshData();
      setDetailReloadKey((count) => count + 1);
    } catch (err) {
      const message = getAdminApiErrorMessage(
        err,
        "Failed to reject the ticket. Please try again.",
      );
      setRejectError(message);
      showErrorToast({ title: "Reject failed", description: message });
    } finally {
      setIsRejecting(false);
    }
  };

  /* Detail-derived values. */
  const requesterName =
    detail?.statusHistory.filter((entry) => entry.oldStatusId === null)[0]
      ?.actor?.name ?? null;
  const effectivePriority = detail
    ? (detail.adminPriority ?? detail.userPriority)
    : null;

  const sla = useMemo(() => {
    if (!detail?.slaPolicy || !detail.firstResponseDueAt || fetchedAt === null) {
      return null;
    }
    const createdAtMs = new Date(detail.createdAt).getTime();
    const dueMs = new Date(detail.firstResponseDueAt).getTime();
    const span = Math.max(dueMs - createdAtMs, 1);
    const remaining = dueMs - fetchedAt;
    const percent = Math.round(Math.min(Math.max(1 - remaining / span, 0), 1) * 100);
    return {
      withinSla: detail.slaStatus === SLA_STATUS_ON_TRACK,
      percent,
      remainingText: formatSlaRemaining(remaining),
    };
  }, [detail, fetchedAt]);

  const isClientFiltered = searchTerm.trim() !== "" || dateFilter.cutoff !== null;

  /* Derived panel state: the effect above never synchronously resets writes
     state, so loading/idle/error/success are computed from the current
     selection and the last fetch result. */
  const detailPanelState: "idle" | "loading" | "success" | "error" =
    !selectedId
      ? "idle"
      : detailErrorId === selectedId
        ? "error"
        : detailLoadedId === selectedId && detail
          ? "success"
          : "loading";

  const rangeStart = serverTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, serverTotal);

  const detailTabs: {
    key: DetailTab;
    label: string;
    icon: typeof FileText;
    count: number | null;
  }[] = detail
    ? [
        { key: "details", label: "Details", icon: FileText, count: null },
        {
          key: "conversation",
          label: "Conversation",
          icon: MessageCircle,
          count: detail.comments.length,
        },
        {
          key: "attachments",
          label: "Attachments",
          icon: Paperclip,
          count: detail.attachments.length,
        },
        {
          key: "activity",
          label: "Activity",
          icon: Activity,
          count: detail.statusHistory.length,
        },
      ]
    : [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link
          href="/admin/dashboard"
          className="hover:text-gray-800 transition-colors"
        >
          Admin
        </Link>
        <ChevronRight className="size-3.5 text-gray-400 stroke-[2.5]" />
        <span className="font-semibold text-gray-900">Support Desk</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="size-9 mt-0.5 rounded-lg bg-[#EFF6FF] border border-blue-100 flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563EB"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
              <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
              <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
              <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
              Support Desk
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500 max-w-2xl">
              Manage and respond to support tickets. Review, assign, and resolve
              issues to provide better support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/support-desk/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors shadow-xs"
          >
            <Plus className="size-4" />
            New Ticket
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-label="More page options"
              aria-expanded={pageMenuOpen}
              onClick={() => setPageMenuOpen((open) => !open)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MoreVertical className="size-4" />
            </button>
            {pageMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  role="presentation"
                  onClick={() => setPageMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-40 mt-1.5 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setPageMenuOpen(false);
                      refreshData();
                      showSuccessToast({
                        title: "Refreshed",
                        description: "Queue and summary counts reloaded.",
                      });
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Loader2 className="size-3.5 text-gray-400" />
                    Refresh data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Total Tickets"
          value={counts.total}
          sublabel="All time"
          icon={BarChart3}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
        />
        <StatCard
          label="Pending Review"
          value={counts.pending}
          sublabel="Awaiting action"
          icon={FileText}
          iconBg="bg-[#DBEAFE]"
          iconColor="text-[#2563EB]"
        />
        <StatCard
          label="In Progress"
          value={counts.inProgress}
          sublabel="Being handled"
          icon={Clock3}
          iconBg="bg-[#FEF3C7]"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Resolved"
          value={counts.resolved}
          sublabel="Completed"
          icon={CheckCircle2}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Rejected"
          value={counts.rejected}
          sublabel="Not approved"
          icon={XCircle}
          iconBg="bg-[#FEE2E2]"
          iconColor="text-red-500"
        />
      </div>

      {/* Queue tabs + advanced filters toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {QUEUE_TABS.map((tab) => {
            const active =
              tab.statusId === undefined
                ? statusFilter === "ALL"
                : statusFilter === tab.statusId;
            const count = counts[tab.countKey as keyof typeof counts] ?? null;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.statusId ?? "ALL");
                  setPage(1);
                }}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-blue-300 bg-[#EFF6FF] text-[#2563EB] font-semibold"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count ?? "–"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Advanced Filters
        </button>
      </div>

      {/* Two-column workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 sm:gap-5 items-start">
        {/* ------------------------------ Ticket list ------------------------------ */}
        <section
          aria-label="Ticket queue"
          className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden"
        >
          {/* Filters */}
          {showFilters && (
            <div className="p-4 sm:p-5 space-y-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tickets by ID, subject, or requester..."
                  aria-label="Search tickets"
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div className="relative">
                  <select
                    id="filter-category"
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value);
                      setPage(1);
                    }}
                    aria-label="Filter by category"
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="size-3.5" />
                  </div>
                </div>
                {/* Priority */}
                <div className="relative">
                  <select
                    id="filter-priority"
                    value={priorityFilter}
                    onChange={(event) => {
                      setPriorityFilter(event.target.value);
                      setPage(1);
                    }}
                    aria-label="Filter by priority"
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    <option value="ALL">All Priorities</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0) + priority.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="size-3.5" />
                  </div>
                </div>
                {/* Date range */}
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <select
                    id="filter-date"
                    value={dateFilter.value}
                    onChange={(event) => {
                      const value = event.target.value;
                      const range = DATE_RANGES.find(
                        (entry) => entry.value === value,
                      );
                      const days = range?.days;
                      setDateFilter({
                        value,
                        cutoff:
                          days === null || days === undefined
                            ? null
                            : Date.now() - days * 86_400_000,
                      });
                      setPage(1);
                    }}
                    aria-label="Filter by created date"
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-8 pr-8 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    {DATE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List body */}
          <div aria-live="polite">
            {listState === "loading" && (
              <div className="space-y-3 p-4 sm:p-5 animate-pulse" role="status" aria-label="Loading tickets">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-3">
                    <div className="size-3 rounded-sm bg-gray-100 shrink-0 mt-1" />
                    <div className="size-9 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 rounded bg-gray-100" />
                      <div className="h-2.5 w-1/2 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {listState === "error" && (
              <div className="m-4 sm:m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 animate-in fade-in-50">
                <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-red-900">Could not load tickets</p>
                  <p className="mt-0.5">{listError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setListState("loading");
                      setListError(null);
                      refreshData();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
                  >
                    <Loader2 className="size-3" />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {listState === "success" && visibleTickets.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Inbox className="mx-auto size-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-600">
                  {isClientFiltered
                    ? "No tickets on this page match your filters."
                    : "No tickets found."}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {isClientFiltered
                    ? "Try clearing the search or date range."
                    : "Submitted tickets will appear here."}
                </p>
              </div>
            )}

            {listState === "success" && visibleTickets.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {visibleTickets.map((ticket) => {
                  const selected = ticket.id === selectedId;
                  const priority =
                    ticket.adminPriority ?? ticket.userPriority;
                  const checked = checkedIds.has(ticket.id);
                  return (
                    <li key={ticket.id}>
                      <div
                        className={`relative flex items-start gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 transition-colors ${
                          selected
                            ? "bg-[#EFF6FF]"
                            : "hover:bg-gray-50/70"
                        }`}
                      >
                        {selected && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#2563EB]"
                          />
                        )}
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCheckedIds((current) => {
                              const next = new Set(current);
                              if (next.has(ticket.id)) {
                                next.delete(ticket.id);
                              } else {
                                next.add(ticket.id);
                              }
                              return next;
                            })
                          }
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select ticket ${ticket.ticketNumber}`}
                          className="mt-2.5 size-3.5 shrink-0 cursor-pointer rounded-sm border-gray-300 text-[#2563EB] focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => selectTicket(ticket)}
                          aria-current={selected ? "true" : undefined}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-lg"
                        >
                          <span
                            className={`size-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold ${avatarColorFor(ticket.userId)}`}
                            aria-hidden="true"
                          >
                            {initialsFor(`Requester ${ticket.userId}`)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-xs sm:text-[13px] font-semibold text-gray-900 truncate max-w-full sm:max-w-[240px]">
                                {ticket.subject}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  PRIORITY_BADGE_CLASSES[priority] ??
                                  "border-gray-200 bg-gray-100 text-gray-600"
                                }`}
                              >
                                {priority}
                              </span>
                              <StatusChip
                                statusId={ticket.statusId}
                                name={ticket.status?.name ?? null}
                              />
                            </span>
                            <span className="mt-0.5 block font-mono text-[11px] text-gray-500 truncate">
                              {ticket.ticketNumber}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <UserRound className="size-3 text-gray-400" />
                                Requester #{ticket.userId}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Folder className="size-3 text-gray-400" />
                                {ticket.category?.name ?? "—"}
                              </span>
                              <span className="ml-auto whitespace-nowrap text-gray-400">
                                {ticket.timeAgo}
                              </span>
                            </span>
                          </span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* List footer */}
          {listState === "success" && (
            <div className="border-t border-gray-100 px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                {isClientFiltered
                  ? `${visibleTickets.length} match on this page`
                  : `Showing ${rangeStart}–${rangeEnd} of ${serverTotal} tickets`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {buildPageItems(page, serverTotalPages).map(
                  (item, index) =>
                    item === "gap" ? (
                      <span
                        key={`gap-${index}`}
                        className="px-1 text-xs text-gray-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        aria-current={item === page ? "page" : undefined}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                          item === page
                            ? "border-[#2563EB] bg-[#2563EB] text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(serverTotalPages, current + 1),
                    )
                  }
                  disabled={page === serverTotalPages}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------ Detail panel ------------------------------ */}
        <section
          aria-label="Ticket details"
          className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden flex flex-col"
        >
          {detailPanelState === "idle" && <EmptyPanel message="Select a ticket to view its details." />}

          {detailPanelState === "loading" && (
            <div className="p-5 space-y-4 animate-pulse" role="status" aria-label="Loading ticket details">
              <div className="h-4 w-1/3 rounded bg-gray-100" />
              <div className="h-6 w-1/2 rounded bg-gray-100" />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-3 w-full rounded bg-gray-100" />
                  ))}
                </div>
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-3 w-full rounded bg-gray-100" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {detailPanelState === "error" && (
            <div className="m-4 sm:m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 animate-in fade-in-50">
              <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-semibold text-red-900">Could not load ticket</p>
                <p className="mt-0.5">{detailError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDetailError(null);
                    setDetailErrorId(null);
                    setDetailReloadKey((count) => count + 1);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
                >
                  <Loader2 className="size-3" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {detailPanelState === "success" && detail && (
            <>
              {/* Panel header */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5">
                <Link
                  href={`/support-desk/${detail.id}`}
                  className="inline-flex items-center gap-1 font-mono text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline"
                >
                  <span aria-hidden="true" className="text-blue-400">#</span>
                  {detail.ticketNumber}
                </Link>
                <button
                  type="button"
                  onClick={() => copyTicketNumber(detail.ticketNumber)}
                  aria-label="Copy ticket ID"
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Copy className="size-3.5" />
                </button>

                <div className="ml-auto flex items-center gap-2">
                  {detail.statusId === STATUS_ID.PENDING_REVIEW && !rejectOpen && (
                    <>
                      <button
                        type="button"
                        onClick={handleAccept}
                        disabled={isAccepting || isRejecting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#15803D] transition-colors disabled:opacity-60"
                      >
                        {isAccepting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectOpen(true);
                          setRejectReason("");
                          setRejectError(null);
                        }}
                        disabled={isAccepting || isRejecting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition-colors disabled:opacity-60"
                      >
                        <X className="size-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="More ticket options"
                      aria-expanded={detailMenuOpen}
                      onClick={() => setDetailMenuOpen((open) => !open)}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {detailMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          role="presentation"
                          onClick={() => setDetailMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full z-40 mt-1.5 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-in fade-in-50 zoom-in-95">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailMenuOpen(false);
                              copyTicketNumber(detail.ticketNumber);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Copy className="size-3.5 text-gray-400" />
                            Copy Ticket ID
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailMenuOpen(false);
                              setDetailReloadKey((count) => count + 1);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Loader2 className="size-3.5 text-gray-400" />
                            Refresh Ticket
                          </button>
                          <Link
                            href={`/support-desk/${detail.id}`}
                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FileText className="size-3.5 text-gray-400" />
                            Open Full Page
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Reject reason form (inline) */}
              {rejectOpen && detail.statusId === STATUS_ID.PENDING_REVIEW && (
                <div className="mx-4 sm:mx-5 mt-3 rounded-lg border border-red-200 bg-red-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-gray-900">
                      Reject {detail.ticketNumber} — the reason is required and
                      will be visible to the requester.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectOpen(false);
                        setRejectError(null);
                      }}
                      disabled={isRejecting}
                      aria-label="Cancel rejection"
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => {
                      setRejectReason(event.target.value);
                      if (rejectError) setRejectError(null);
                    }}
                    rows={3}
                    maxLength={2000}
                    disabled={isRejecting}
                    placeholder="Explain why this request cannot be fulfilled right now..."
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                      rejectError
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                    } disabled:opacity-60`}
                  />
                  {rejectError && (
                    <p className="text-[11px] text-red-500 font-medium" role="alert">
                      {rejectError}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">{rejectReason.length}/2000</p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isRejecting || rejectReason.trim() === ""}
                      className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isRejecting && <Loader2 className="size-3.5 animate-spin" />}
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Title + meta row */}
              <div className="px-4 sm:px-5 pt-3 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                  {detail.subject}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <div className="flex items-center gap-2.5 min-w-[150px]">
                    <span
                      className={`size-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold ${avatarColorFor(detail.userId)}`}
                      aria-hidden="true"
                    >
                      {initialsFor(requesterName ?? "Requester")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-900 truncate">
                        {requesterName ?? "Unknown requester"}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate">
                        Requester #{detail.userId}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Folder className="size-3.5 text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">
                        {detail.category?.name ?? "—"}
                      </p>
                      <p className="text-[11px] text-gray-400">Category</p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        PRIORITY_BADGE_CLASSES[effectivePriority ?? ""] ??
                        "border-gray-200 bg-gray-100 text-gray-600"
                      }`}
                    >
                      {effectivePriority ?? "—"}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">Priority</p>
                  </div>
                  <div>
                    <StatusChip
                      statusId={detail.statusId}
                      name={detail.status?.name ?? null}
                    />
                    <p className="text-[11px] text-gray-400 mt-0.5">Status</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                        {formatDate(detail.createdAt)}
                      </p>
                      <p className="text-[11px] text-gray-400">Created</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-gray-100 border-b">
                <div
                  role="tablist"
                  aria-label="Ticket detail sections"
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 overflow-x-auto"
                >
                  {detailTabs.map((tab) => {
                    const active = selectedTab === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedTab(tab.key)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                          <span
                            className={`rounded-full px-1.5 text-[10px] font-semibold ${
                              active
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1">
                {selectedTab === "details" && (
                  <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Description + requester (left) */}
                    <div className="space-y-4">
                      <div className="rounded-lg border border-gray-200/80 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">
                          Description
                        </h3>
                        <RichTextContent html={detail.description} className="[&_p]:my-1.5 text-xs" />
                      </div>

                      <div className="rounded-lg border border-gray-200/80 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">
                          Requester Information
                        </h3>
                        <dl className="space-y-2.5 text-xs">
                          <div className="flex items-start gap-2">
                            <dt className="w-24 shrink-0 text-gray-500">Name</dt>
                            <dd className="text-gray-900 font-medium break-words">
                              {requesterName ?? "—"}
                            </dd>
                          </div>
                          <div className="flex items-start gap-2">
                            <dt className="w-24 shrink-0 text-gray-500">Email</dt>
                            <dd className="text-gray-900">—</dd>
                          </div>
                          <div className="flex items-start gap-2">
                            <dt className="w-24 shrink-0 text-gray-500">Phone</dt>
                            <dd className="text-gray-900">—</dd>
                          </div>
                          <div className="flex items-start gap-2">
                            <dt className="w-24 shrink-0 text-gray-500">Organization</dt>
                            <dd className="text-gray-900">—</dd>
                          </div>
                          <div className="flex items-start gap-2">
                            <dt className="w-24 shrink-0 text-gray-500">Role</dt>
                            <dd className="text-gray-900">User</dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-[10px] text-gray-400">
                          Contact details are not provided by the API yet.
                        </p>
                      </div>
                    </div>

                    {/* Status / SLA / actions (right) */}
                    <div className="space-y-4">
                      <div className="rounded-lg border border-gray-200/80 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">
                          Ticket Status
                        </h3>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Status</span>
                            <ReadOnlySelect
                              value={statusLabel(detail.status?.name)}
                              dotColor={
                                detail.statusId === STATUS_ID.PENDING_REVIEW
                                  ? "bg-blue-500"
                                  : detail.statusId === STATUS_ID.REJECTED
                                    ? "bg-red-500"
                                    : detail.statusId === STATUS_ID.RESOLVED
                                      ? "bg-emerald-500"
                                      : "bg-gray-400"
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Priority</span>
                            <ReadOnlySelect
                              value={effectivePriority ?? "—"}
                              dotColor={
                                effectivePriority
                                  ? PRIORITY_DOT_CLASSES[effectivePriority]
                                  : undefined
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Category</span>
                            <ReadOnlySelect
                              value={detail.category?.name ?? "—"}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Subcategory</span>
                            <ReadOnlySelect
                              value={detail.subCategory?.name ?? "None"}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Created</span>
                            <span className="text-gray-900 font-medium whitespace-nowrap">
                              {formatDate(detail.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Last Updated</span>
                            <span className="text-gray-900 font-medium whitespace-nowrap">
                              {formatDate(detail.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SLA card */}
                      {sla ? (
                        <div className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-4">
                          <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-700 mb-3">
                            <Clock3 className="size-4" />
                            SLA Information
                          </h3>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] text-amber-700/80">
                                Response Due
                              </p>
                              <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                {formatDate(detail.firstResponseDueAt ?? detail.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                sla.withinSla
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {sla.withinSla ? "Within SLA" : "Breached"}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                sla.withinSla ? "bg-emerald-500" : "bg-red-500"
                              }`}
                              style={{ width: `${sla.percent}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-gray-500">
                            {sla.remainingText}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-4">
                          <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-700 mb-2">
                            <Clock3 className="size-4" />
                            SLA Information
                          </h3>
                          <p className="text-xs text-gray-500">
                            SLA policy or due dates are not configured for this
                            ticket.
                          </p>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="rounded-lg border border-gray-200/80 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">
                          Quick Actions
                        </h3>
                        <div className="space-y-1.5">
                          {[
                            { label: "Assign to Me", icon: UserRound },
                            { label: "Change Priority", icon: Flag },
                            { label: "Add Internal Note", icon: NotebookPen },
                          ].map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.label}
                                type="button"
                                onClick={() =>
                                  showErrorToast({
                                    title: "Not available yet",
                                    description: `"${action.label}" is not wired to the API yet.`,
                                  })
                                }
                                title="Not available yet"
                                className="w-full flex items-center justify-between gap-3 rounded-lg border border-gray-200/70 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <span className="inline-flex items-center gap-2.5">
                                  <span className="size-7 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    <Icon className="size-3.5 text-[#2563EB]" />
                                  </span>
                                  {action.label}
                                </span>
                                <ChevronRight className="size-3.5 text-gray-300" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTab === "conversation" && (
                  <div className="p-4 sm:p-5">
                    <TicketComments
                      key={detail.id}
                      ticketId={detail.id}
                      initialComments={detail.comments}
                    />
                  </div>
                )}

                {selectedTab === "attachments" && (
                  <div className="p-4 sm:p-5">
                    {detail.attachments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
                        <Paperclip className="mx-auto size-6 text-gray-300" />
                        <p className="mt-2 text-xs font-medium text-gray-500">
                          No attachments were added to this ticket.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {detail.attachments.map((attachment: TicketAttachmentData) => (
                          <li
                            key={attachment.id}
                            className="flex items-center gap-3 rounded-lg border border-gray-200/70 px-3.5 py-2.5"
                          >
                            <span className="size-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                              <FileText className="size-4 text-[#2563EB]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium text-gray-900 truncate">
                                {attachment.fileName}
                              </span>
                              <span className="block text-[11px] text-gray-400">
                                {formatBytes(Number(attachment.fileSize))} ·{" "}
                                {formatDayOnly(attachment.createdAt)}
                              </span>
                            </span>
                            <a
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Open
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {selectedTab === "activity" && (
                  <div className="p-4 sm:p-5">
                    <ol className="space-y-4">
                      {detail.statusHistory.map((entry) => (
                        <li key={entry.id} className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                            <Activity className="size-3 text-[#2563EB]" />
                          </span>
                          <span className="min-w-0">
                            {entry.oldStatusId === null ? (
                              <span className="block text-xs font-semibold text-gray-900">
                                Ticket created
                              </span>
                            ) : (
                              <span className="block text-xs font-semibold text-gray-900">
                                {statusLabel(entry.oldStatus?.name)} →{" "}
                                {statusLabel(entry.newStatus?.name)}
                              </span>
                            )}
                            <span className="mt-0.5 block text-[11px] text-gray-400">
                              by {entry.actor?.name ?? "System"} ·{" "}
                              {formatDate(entry.createdAt)}
                            </span>
                            {entry.reason && (
                              <span className="mt-1 block text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1">
                                {entry.reason}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
