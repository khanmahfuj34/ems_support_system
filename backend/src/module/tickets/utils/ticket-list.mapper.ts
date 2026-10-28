import type { Prisma } from '@prisma/client';

/** Columns returned by every ticket LIST (no full description). */
export const TICKET_LIST_SELECT = {
  id: true,
  ticketNumber: true,
  subject: true,
  descriptionPreview: true,
  userId: true,
  categoryId: true,
  subCategoryId: true,
  userPriority: true,
  adminPriority: true,
  statusId: true,
  slaStatus: true,
  firstResponseAt: true,
  firstResponseDueAt: true,
  resolutionDueAt: true,
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  subCategory: { select: { id: true, name: true } },
  status: { select: { id: true, name: true } },
  slaPolicy: {
    select: {
      id: true,
      priority: true,
      firstResponseMinutes: true,
      resolutionMinutes: true,
    },
  },
} satisfies Prisma.TicketSelect;

export type TicketListRow = Prisma.TicketGetPayload<{
  select: typeof TICKET_LIST_SELECT;
}>;

/** BigInt is not JSON-serializable, so ids become strings. */
export function serializeTicketListRow(ticket: TicketListRow) {
  return {
    ...ticket,
    id: ticket.id.toString(),
    userId: ticket.userId.toString(),
    categoryId: ticket.categoryId.toString(),
    subCategoryId: ticket.subCategoryId?.toString() ?? null,
    category: ticket.category
      ? { ...ticket.category, id: ticket.category.id.toString() }
      : null,
    subCategory: ticket.subCategory
      ? { ...ticket.subCategory, id: ticket.subCategory.id.toString() }
      : null,
    slaPolicy: ticket.slaPolicy
      ? { ...ticket.slaPolicy, id: ticket.slaPolicy.id.toString() }
      : null,
  };
}

export type SerializedTicketListRow = ReturnType<typeof serializeTicketListRow>;

export interface TicketListPagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}

export interface TicketListResult {
  message: string;
  data: SerializedTicketListRow[];
  pagination: TicketListPagination;
}