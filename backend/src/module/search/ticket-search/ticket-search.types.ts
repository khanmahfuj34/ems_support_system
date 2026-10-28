import type { Priority } from '@prisma/client';

import type {
  TicketSortField,
  TicketSortOrder,
} from '../../tickets/utils/ticket-cursor.js';

/** What the search needs. ListTicketsQueryDto is assignable to this. */
export interface TicketSearchInput {
  search?: string;
  limit?: number;
  cursor?: string;
  sortBy?: TicketSortField;
  sortOrder?: TicketSortOrder;
  statusId?: number;
  categoryId?: string;
  priority?: Priority;
  createdFrom?: string;
  createdTo?: string;
}

export interface TicketSearchOptions {
  /** Max rows scanned per request. Default: TICKET_SEARCH_SCAN_BUDGET. */
  budget?: number;
}

export interface TicketScopeFilters {
  /** Set for normal users: they only ever see their own tickets. */
  ownerId?: bigint;
  statusId?: number;
  categoryId?: bigint;
  priority?: Priority;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface TicketRef {
  id: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketLookupIds {
  categoryIds: bigint[];
  subCategoryIds: bigint[];
  statusIds: number[];
  priorities: string[];
  requesterIds: bigint[];
}