"use client";

import { CheckCircle2, Loader2, X } from "lucide-react";

import { TICKET_STATUS_ID } from "../../utils/admin-constants";
import type { TicketDetailData } from "@/features/tickets/types/ticket.types";

/** Accept/Reject buttons for the detail panel header. */
export function TicketReviewActions({
  detail,
  rejectOpen,
  onOpenReject,
  isRejecting,
  isAccepting,
  onAccept,
}: {
  detail: TicketDetailData;
  rejectOpen: boolean;
  onOpenReject: () => void;
  isRejecting: boolean;
  isAccepting: boolean;
  onAccept: () => void;
}) {
  if (detail.statusId !== TICKET_STATUS_ID.PENDING_REVIEW || rejectOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={onAccept}
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
        onClick={onOpenReject}
        disabled={isAccepting || isRejecting}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition-colors disabled:opacity-60"
      >
        <X className="size-3.5" />
        Reject
      </button>
    </>
  );
}

/** Inline reject reason form, rendered below the detail panel header. */
export function TicketRejectForm({
  detail,
  rejectReason,
  onReasonChange,
  rejectError,
  isRejecting,
  onCancelReject,
  onConfirmReject,
}: {
  detail: TicketDetailData;
  rejectReason: string;
  onReasonChange: (value: string) => void;
  rejectError: string | null;
  isRejecting: boolean;
  onCancelReject: () => void;
  onConfirmReject: () => void;
}) {
  if (detail.statusId !== TICKET_STATUS_ID.PENDING_REVIEW) return null;

  return (
    <div className="mx-4 sm:mx-5 mt-3 rounded-lg border border-red-200 bg-red-50/60 p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-900">
          Reject {detail.ticketNumber} — the reason is required and will be
          visible to the requester.
        </p>
        <button
          type="button"
          onClick={onCancelReject}
          disabled={isRejecting}
          aria-label="Cancel rejection"
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
      <textarea
        value={rejectReason}
        onChange={(event) => onReasonChange(event.target.value)}
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
          onClick={onConfirmReject}
          disabled={isRejecting || rejectReason.trim() === ""}
          className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRejecting && <Loader2 className="size-3.5 animate-spin" />}
          Confirm Rejection
        </button>
      </div>
    </div>
  );
}
