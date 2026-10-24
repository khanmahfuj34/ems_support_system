"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  Loader2,
  Paperclip,
  Ticket as TicketIcon,
} from "lucide-react";

import { getTicket } from "../../services/ticket.service";
import { stripHtmlTags } from "../../utils/sanitize-html";
import { getApiErrorMessage } from "@/lib/api/api-errors";
import { RichTextContent } from "../rich-text-content";
import { TicketComments } from "@/features/comments/components/ticket-comments";
import type { TicketDetailData } from "../../types/ticket.types";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  OPEN: "border-sky-200 bg-sky-50 text-sky-700",
  PENDING_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-gray-200 bg-gray-100 text-gray-600",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  REOPENED: "border-violet-200 bg-violet-50 text-violet-700",
};

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-sky-200 bg-sky-50 text-sky-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatBytes(size: string) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type LoadState = "loading" | "success" | "error";

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getTicket(ticketId)
      .then((response) => {
        if (cancelled) return;
        setTicket(response.data);
        setState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const axiosError = err as {
          response?: { status?: number };
        };
        setHttpStatus(axiosError.response?.status ?? null);
        setErrorMsg(
          getApiErrorMessage(
            err,
            "Failed to load the ticket. Please try again.",
          ),
        );
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId, retryCount]);

  const statusBadgeClass =
    (ticket?.status?.name &&
      (STATUS_BADGE_CLASSES[ticket.status.name] ??
        "border-gray-200 bg-gray-100 text-gray-600")) ??
    "border-gray-200 bg-gray-100 text-gray-600";

  const effectivePriority = ticket?.adminPriority ?? ticket?.userPriority ?? "MEDIUM";
  const priorityBadgeClass =
    PRIORITY_BADGE_CLASSES[effectivePriority] ??
    "border-gray-200 bg-gray-100 text-gray-600";

  const descriptionIsEmpty =
    !ticket || stripHtmlTags(ticket.description) === "";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/support-desk/new" className="hover:text-gray-800 transition-colors">
          Support Desk
        </Link>
        <ChevronRight className="size-3.5 text-gray-400 stroke-[2.5]" />
        <span className="font-semibold text-gray-900">
          {state === "success" && ticket ? ticket.ticketNumber : "Ticket Details"}
        </span>
      </nav>

      {/* Loading State */}
      {state === "loading" && (
        <div className="space-y-4 animate-pulse" role="status" aria-label="Loading ticket">
          <div className="h-7 w-1/2 rounded-lg bg-gray-100" />
          <div className="h-4 w-1/3 rounded bg-gray-100" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-16 rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3 animate-in fade-in-50">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            {httpStatus === 404 ? (
              <>
                <p className="font-semibold text-red-900">Ticket not found</p>
                <p className="mt-0.5">
                  This ticket does not exist or was moved. It may have been created
                  with a different account.
                </p>
              </>
            ) : httpStatus === 403 ? (
              <>
                <p className="font-semibold text-red-900">Access restricted</p>
                <p className="mt-0.5">
                  You can only open tickets that you created yourself.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-red-900">Could not load ticket</p>
                <p className="mt-0.5">{errorMsg}</p>
              </>
            )}
            {httpStatus !== null && httpStatus >= 500 && (
              <button
                type="button"
                onClick={() => {
                  setState("loading");
                  setErrorMsg(null);
                  setHttpStatus(null);
                  setRetryCount((count) => count + 1);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100/50 transition-colors"
              >
                <Loader2 className="size-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success State */}
      {state === "success" && ticket && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight break-words">
                {ticket.subject}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <TicketIcon className="size-3.5 text-gray-400" />
                <span className="font-mono font-semibold text-gray-700">
                  {ticket.ticketNumber}
                </span>
                <span aria-hidden="true">Â·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3 text-gray-400" />
                  Created {formatDateTime(ticket.createdAt)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass}`}
              >
                {ticket.status?.name ?? `STATUS ${ticket.statusId}`}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityBadgeClass}`}
              >
                {effectivePriority}
                {ticket.adminPriority && ticket.adminPriority !== ticket.userPriority
                  ? " (admin)"
                  : ""}
              </span>
            </div>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <Folder className="size-3 text-gray-400" />
                Category
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {ticket.category?.name ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <Folder className="size-3 text-gray-400" />
                Subcategory
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {ticket.subCategory?.name ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <Calendar className="size-3 text-gray-400" />
                Resolution due
              </p>
              <p className="mt-1 text-xs font-semibold text-gray-900">
                {formatDateTime(ticket.resolutionDueAt)}
              </p>
            </div>
          </div>

          {/* Description */}
          <section aria-label="Ticket description" className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">Description</h2>
            {descriptionIsEmpty ? (
              <p className="text-xs text-gray-500">No description provided.</p>
            ) : (
              /* Rendered through DOMPurify — saved rich text is never injected raw. */
              <RichTextContent html={ticket.description} />
            )}
          </section>

          {/* Attachments */}
          <section aria-label="Ticket attachments" className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Paperclip className="size-4 text-gray-500" />
              Attachments
              <span className="font-medium text-gray-400">
                ({ticket.attachments.length})
              </span>
            </h2>
            {ticket.attachments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-6 text-center text-xs text-gray-500">
                No attachments were added to this ticket.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ticket.attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3"
                  >
                    <div className="size-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                      {attachment.mimeType.startsWith("image/") ? (
                        /* Image previews are served by the authenticated Cloudinary channel. */
                        <Paperclip className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {attachment.fileName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatBytes(attachment.fileSize)}
                        {" Â· "}
                        {formatDateTime(attachment.createdAt)}
                      </p>
                    </div>
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-medium text-[#2563EB] hover:bg-blue-50/60 transition-colors"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Comments / Replies */}
          <TicketComments ticketId={ticket.id} initialComments={ticket.comments} />
        </div>
      )}
    </div>
  );
}
