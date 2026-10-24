"use client";

import { Loader2, X } from "lucide-react";

import type { AdminTicketRow } from "../../types/admin.types";

export function ReviewRejectForm({
  target,
  reason,
  error,
  isRejecting,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  target: AdminTicketRow;
  reason: string;
  error: string | null;
  isRejecting: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="border-t border-red-100 bg-red-50/50 p-4 sm:p-6 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-900">
          Reject {target.ticketNumber} — a reason is required and will be
          visible to the requester.
        </p>
        <button
          type="button"
          onClick={onCancel}
          disabled={isRejecting}
          className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
          aria-label="Cancel rejection"
        >
          <X className="size-4" />
        </button>
      </div>
      <textarea
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        rows={3}
        maxLength={2000}
        disabled={isRejecting}
        placeholder="Explain why this request cannot be fulfilled right now..."
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
        } disabled:opacity-60`}
      />
      {error && (
        <p className="text-[11px] text-red-500 font-medium" role="alert">
          {error}
        </p>
      )}
      <p className="text-[11px] text-gray-400">{reason.length}/2000</p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isRejecting || reason.trim() === ""}
          className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRejecting && <Loader2 className="size-3.5 animate-spin" />}
          Confirm Rejection
        </button>
      </div>
    </div>
  );
}
