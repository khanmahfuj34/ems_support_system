"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import { useToast } from "@/components/ui/toaster";
import {
  acceptTicket,
  countTickets,
  listPendingReviewTickets,
  rejectTicket,
} from "@/features/admin/services/admin.service";
import { IN_PROGRESS_STATUS_ID, RESOLVED_STATUS_ID } from "@/features/admin/utils/admin-constants";
import type { AdminTicketRow } from "@/features/admin/types/admin.types";

type QueueSummary = {
  inProgress: number | null;
  resolved: number | null;
  total: number | null;
};

/**
 * Loads the pending-review queue plus the dashboard summary counts and owns
 * the accept/reject review actions (including the reject reason form state).
 */
export function useReviewQueue() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [actingTicketId, setActingTicketId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminTicketRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Summary card counts (all read live from the API; never hardcoded).
  const [stats, setStats] = useState<QueueSummary>({
    inProgress: null,
    resolved: null,
    total: null,
  });

  useEffect(() => {
    let cancelled = false;

    listPendingReviewTickets()
      .then((response) => {
        if (cancelled) return;
        setTickets(response.data);
        setState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(
          getApiErrorMessage(
            err,
            "Failed to load the review queue. Please try again.",
          ),
        );
        setState("error");
      });

    // Summary counts are independent of the queue list; failures only
    // degrade the cards, never the review table.
    Promise.allSettled([
      countTickets({ statusId: IN_PROGRESS_STATUS_ID }),
      countTickets({ statusId: RESOLVED_STATUS_ID }),
      countTickets(),
    ]).then(([inProgress, resolved, total]) => {
      if (cancelled) return;
      setStats({
        inProgress:
          inProgress.status === "fulfilled" ? inProgress.value : null,
        resolved: resolved.status === "fulfilled" ? resolved.value : null,
        total: total.status === "fulfilled" ? total.value : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const handleAccept = async (ticket: AdminTicketRow) => {
    if (actingTicketId) return;
    setActingTicketId(ticket.id);
    try {
      const response = await acceptTicket(ticket.id);
      setTickets((current) => current.filter((row) => row.id !== ticket.id));
      showSuccessToast({
        title: "Ticket accepted",
        description: `Ticket ${response.data.ticketNumber} is now ${response.data.status.toLowerCase()}.`,
      });
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to accept the ticket. Please try again.",
      );
      showErrorToast({ title: "Accept failed", description: message });
    } finally {
      setActingTicketId(null);
    }
  };

  const startReject = (ticket: AdminTicketRow) => {
    setRejectTarget(ticket);
    setRejectReason("");
    setRejectError(null);
  };

  const cancelReject = () => {
    setRejectTarget(null);
    setRejectReason("");
    setRejectError(null);
  };

  const handleReject = async () => {
    if (!rejectTarget || isRejecting) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("A rejection reason is required.");
      return;
    }

    setIsRejecting(true);
    setRejectError(null);
    try {
      const response = await rejectTicket(rejectTarget.id, reason);
      setTickets((current) => current.filter((row) => row.id !== response.data.id));
      showSuccessToast({
        title: "Ticket rejected",
        description: `Ticket ${response.data.ticketNumber} was rejected and the requester has been notified.`,
      });
      cancelReject();
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

  const retry = () => {
    setState("loading");
    setErrorMsg(null);
    setRetryCount((count) => count + 1);
  };

  const clearRejectError = () => setRejectError(null);

  return {
    state,
    tickets,
    errorMsg,
    stats,
    actingTicketId,
    rejectTarget,
    rejectReason,
    rejectError,
    isRejecting,
    setRejectReason,
    clearRejectError,
    handleAccept,
    startReject,
    cancelReject,
    handleReject,
    retry,
  };
}
