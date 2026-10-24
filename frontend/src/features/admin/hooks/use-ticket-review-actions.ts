"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import { useToast } from "@/components/ui/toaster";
import {
  acceptTicket,
  rejectTicket,
} from "@/features/admin/services/admin.service";
import type { TicketDetailData } from "@/features/tickets/types/ticket.types";

/**
 * Accept/reject review actions for the ticket shown in the detail panel.
 * `onUpdated` fires after a successful review so the queue and detail panel
 * can refresh themselves.
 */
export function useTicketReviewActions(
  detail: TicketDetailData | null,
  onUpdated: () => void,
) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const openRejectForm = () => {
    setRejectOpen(true);
    setRejectReason("");
    setRejectError(null);
  };

  const cancelReject = () => {
    setRejectOpen(false);
    setRejectError(null);
  };

  const changeRejectReason = (value: string) => {
    setRejectReason(value);
    if (rejectError) setRejectError(null);
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
      onUpdated();
    } catch (err) {
      showErrorToast({
        title: "Accept failed",
        description: getApiErrorMessage(
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
      onUpdated();
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to reject the ticket. Please try again.",
      );
      setRejectError(message);
      showErrorToast({ title: "Reject failed", description: message });
    } finally {
      setIsRejecting(false);
    }
  };

  return {
    rejectOpen,
    openRejectForm,
    cancelReject,
    rejectReason,
    changeRejectReason,
    rejectError,
    isRejecting,
    isAccepting,
    handleAccept,
    handleReject,
  };
}
