"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import {
  getStatusChipClasses,
  TICKET_STATUS_ID,
} from "../../utils/admin-constants";
import { statusLabel } from "../../utils/admin-format";

export function StatusChip({
  statusId,
  name,
}: {
  statusId: number;
  name: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        getStatusChipClasses(statusId)
      }`}
    >
      {statusId === TICKET_STATUS_ID.REJECTED && <XCircle className="size-3" />}
      {statusId === TICKET_STATUS_ID.RESOLVED && <CheckCircle2 className="size-3" />}
      {statusId === TICKET_STATUS_ID.IN_PROGRESS && <Clock3 className="size-3" />}
      {statusLabel(name)}
    </span>
  );
}
