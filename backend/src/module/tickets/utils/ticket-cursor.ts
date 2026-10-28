import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { Prisma } from '@prisma/client';

export const TICKET_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
export const TICKET_SORT_ORDERS = ['asc', 'desc'] as const;

export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];
export type TicketSortOrder = (typeof TICKET_SORT_ORDERS)[number];

/**
 * Everything that changes which rows belong to a page sequence. The value is
 * hashed into the cursor so a cursor from a different search/filter/sort/scope
 * is rejected instead of silently skipping matches.
 */
export interface TicketCursorScope {
  sortBy: TicketSortField;
  sortOrder: TicketSortOrder;
  search?: string;
  statusId?: number;
  priority?: string;
  categoryId?: string;
  createdFrom?: string;
  createdTo?: string;
  userId?: string;
  roleId: number;
}

interface TicketCursorPayload {
  v: 1;
  fingerprint: string;
  sortBy: TicketSortField;
  sortOrder: TicketSortOrder;
  value: string;
  id: string;
}

export interface DecodedTicketCursor {
  value: Date;
  id: bigint;
}

export function buildCursorFingerprint(scope: TicketCursorScope): string {
  const normalized = {
    sortBy: scope.sortBy,
    sortOrder: scope.sortOrder,
    search: scope.search?.trim() ?? '',
    statusId: scope.statusId ?? null,
    priority: scope.priority ?? null,
    categoryId: scope.categoryId ?? null,
    createdFrom: scope.createdFrom ?? null,
    createdTo: scope.createdTo ?? null,
    userId: scope.userId ?? null,
    roleId: scope.roleId,
  };

  return createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('base64url');
}

export function encodeTicketCursor(input: {
  sortBy: TicketSortField;
  sortOrder: TicketSortOrder;
  value: Date;
  id: bigint;
  fingerprint: string;
}): string {
  const payload: TicketCursorPayload = {
    v: 1,
    fingerprint: input.fingerprint,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    value: input.value.toISOString(),
    id: input.id.toString(),
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeTicketCursor(
  cursor: string,
  expected: TicketCursorScope,
): DecodedTicketCursor {
  let parsed: unknown;

  try {
    parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as unknown;
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  const payload = parsed as Partial<TicketCursorPayload>;

  if (
    payload.v !== 1 ||
    typeof payload.fingerprint !== 'string' ||
    typeof payload.value !== 'string' ||
    typeof payload.id !== 'string' ||
    !/^[1-9]\d*$/.test(payload.id)
  ) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  if (
    payload.sortBy !== expected.sortBy ||
    payload.sortOrder !== expected.sortOrder
  ) {
    throw new BadRequestException(
      'Cursor does not match the current sort order',
    );
  }

  if (payload.fingerprint !== buildCursorFingerprint(expected)) {
    throw new BadRequestException(
      'Cursor does not match the current search or filters',
    );
  }

  const value = new Date(payload.value);
  if (Number.isNaN(value.getTime())) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  return { value, id: BigInt(payload.id) };
}

/**
 * Builds a keyset predicate for the composite (sort field, id) ordering. The
 * direction of both parts matches the requested sort order so the cursor is
 * deterministic even when the sort field is not unique.
 */
export function buildCursorWhere(
  sortBy: TicketSortField,
  sortOrder: TicketSortOrder,
  cursor: DecodedTicketCursor,
): Prisma.TicketWhereInput {
  const idFilter =
    sortOrder === 'desc' ? { lt: cursor.id } : { gt: cursor.id };

  if (sortBy === 'createdAt') {
    return {
      OR: [
        {
          createdAt:
            sortOrder === 'desc'
              ? { lt: cursor.value }
              : { gt: cursor.value },
        },
        { createdAt: cursor.value, id: idFilter },
      ],
    };
  }

  return {
    OR: [
      {
        updatedAt:
          sortOrder === 'desc'
            ? { lt: cursor.value }
            : { gt: cursor.value },
      },
      { updatedAt: cursor.value, id: idFilter },
    ],
  };
}
