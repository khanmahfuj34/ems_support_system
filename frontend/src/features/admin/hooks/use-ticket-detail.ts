"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/api-errors";
import { getTicket } from "@/features/tickets/services/ticket.service";
import type { TicketDetailData } from "@/features/tickets/types/ticket.types";

/**
 * Loads the detail data of the currently selected ticket. Panel state is
 * derived in the consumer (see adminSupportDesk detailPanelState), so this
 * hook only writes state from async callbacks.
 */
export function useAdminTicketDetail(
  selectedId: string | null,
  reloadKey: number,
) {
  const [detail, setDetail] = useState<TicketDetailData | null>(null);
  const [detailLoadedId, setDetailLoadedId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

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
          getApiErrorMessage(
            err,
            "Failed to load this ticket. It may have been removed.",
          ),
        );
        setDetailErrorId(selectedId);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);

  const retryDetail = () => {
    setDetailError(null);
    setDetailErrorId(null);
  };

  return {
    detail,
    detailLoadedId,
    detailError,
    detailErrorId,
    fetchedAt,
    retryDetail,
  };
}
