"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronDown,
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
  UserRound,
} from "lucide-react";

import { RichTextContent } from "@/features/tickets/components/rich-text-content";
import { TicketComments } from "@/features/comments/components/ticket-comments";
import { PRIORITY_BADGE_CLASSES } from "@/features/tickets/utils/ticket-badges";
import type { TicketAttachmentData, TicketDetailData } from "@/features/tickets/types/ticket.types";
import type { AdminDetailTab } from "../../types/admin.types";
import {
  PRIORITY_DOT_CLASSES,
  TICKET_STATUS_ID,
} from "../../utils/admin-constants";
import {
  avatarColorFor,
  formatBytes,
  formatDayOnly,
  formatDate,
  initialsFor,
  statusLabel,
} from "../../utils/admin-format";
import { StatusChip } from "./ticket-status-chip";
import { TicketReviewActions, TicketRejectForm } from "./ticket-review-actions";

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

export function TicketDetailsPanel({
  panelState,
  detail,
  detailError,
  onRetryDetail,
  onRequestDetailReload,
  requesterName,
  effectivePriority,
  sla,
  selectedTab,
  onTabChange,
  copyTicketNumber,
  detailMenuOpen,
  onToggleDetailMenu,
  showNotWiredToast,
  review,
}: {
  panelState: "idle" | "loading" | "success" | "error";
  detail: TicketDetailData | null;
  detailError: string | null;
  onRetryDetail: () => void;
  onRequestDetailReload: () => void;
  requesterName: string | null;
  effectivePriority: TicketDetailData["userPriority"] | null;
  sla: {
    withinSla: boolean;
    percent: number;
    remainingText: string;
  } | null;
  selectedTab: AdminDetailTab;
  onTabChange: (tab: AdminDetailTab) => void;
  copyTicketNumber: (ticketNumber: string) => void;
  detailMenuOpen: boolean;
  onToggleDetailMenu: () => void;
  showNotWiredToast: (label: string) => void;
  review: {
    rejectOpen: boolean;
    openRejectForm: () => void;
    cancelReject: () => void;
    rejectReason: string;
    changeRejectReason: (value: string) => void;
    rejectError: string | null;
    isRejecting: boolean;
    isAccepting: boolean;
    handleAccept: () => void;
    handleReject: () => void;
  };
}) {
  const detailTabs: {
    key: AdminDetailTab;
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
    <section
      aria-label="Ticket details"
      className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden flex flex-col"
    >
      {panelState === "idle" && <EmptyPanel message="Select a ticket to view its details." />}

      {panelState === "loading" && (
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

      {panelState === "error" && (
        <div className="m-4 sm:m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 animate-in fade-in-50">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-red-900">Could not load ticket</p>
            <p className="mt-0.5">{detailError}</p>
            <button
              type="button"
              onClick={onRetryDetail}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
            >
              <Loader2 className="size-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {panelState === "success" && detail && (
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
              <TicketReviewActions
                detail={detail}
                rejectOpen={review.rejectOpen}
                onOpenReject={review.openRejectForm}
                isRejecting={review.isRejecting}
                isAccepting={review.isAccepting}
                onAccept={review.handleAccept}
              />
              <div className="relative">
                <button
                  type="button"
                  aria-label="More ticket options"
                  aria-expanded={detailMenuOpen}
                  onClick={onToggleDetailMenu}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <MoreVertical className="size-4" />
                </button>
                {detailMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      role="presentation"
                      onClick={onToggleDetailMenu}
                    />
                    <div className="absolute right-0 top-full z-40 mt-1.5 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-in fade-in-50 zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleDetailMenu();
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
                          onToggleDetailMenu();
                          onRequestDetailReload();
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
          {review.rejectOpen && (
            <TicketRejectForm
              detail={detail}
              rejectReason={review.rejectReason}
              onReasonChange={review.changeRejectReason}
              rejectError={review.rejectError}
              isRejecting={review.isRejecting}
              onCancelReject={review.cancelReject}
              onConfirmReject={review.handleReject}
            />
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
                    onClick={() => onTabChange(tab.key)}
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
                            detail.statusId === TICKET_STATUS_ID.PENDING_REVIEW
                              ? "bg-blue-500"
                              : detail.statusId === TICKET_STATUS_ID.REJECTED
                                ? "bg-red-500"
                                : detail.statusId === TICKET_STATUS_ID.RESOLVED
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
                            onClick={() => showNotWiredToast(action.label)}
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
  );
}
