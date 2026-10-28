import { Prisma, Priority } from '@prisma/client';

import type {
  TicketSortField,
  TicketSortOrder,
} from '../../tickets/utils/ticket-cursor.js';
import {
  containsPattern,
  prefixPattern,
  wordPrefixPattern,
} from '../common/search-normalization.js';
import { intSql } from '../common/search-sql.js';
import { LOOKUP_ID_LIMIT, REQUESTER_ID_LIMIT } from '../search.constants.js';
import type {
  TicketLookupIds,
  TicketRef,
  TicketScopeFilters,
} from './ticket-search.types.js';

type Db = Prisma.TransactionClient;

type RawRef = {
  id: bigint | number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const toRef = (row: RawRef): TicketRef => ({
  id: BigInt(row.id),
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
});

// Only fixed strings go through Prisma.raw, never user input.
const sortColumn = (sortBy: TicketSortField) =>
  Prisma.raw(sortBy === 'updatedAt' ? 't.updated_at' : 't.created_at');
const direction = (order: TicketSortOrder) =>
  Prisma.raw(order === 'desc' ? 'DESC' : 'ASC');
export const refValue = (ref: TicketRef, sortBy: TicketSortField): Date =>
  sortBy === 'updatedAt' ? ref.updatedAt : ref.createdAt;

const joinAnd = (conditions: Prisma.Sql[]) =>
  conditions.length > 0
    ? Prisma.join(conditions, ' AND ')
    : Prisma.sql`1 = 1`;

// ---------------------------------------------------------------- scope

/** Ownership + filters. Used by every ticket search query. */
export function buildScopeConditions(f: TicketScopeFilters): Prisma.Sql[] {
  const c: Prisma.Sql[] = [];
  if (f.ownerId !== undefined) c.push(Prisma.sql`t.user_id = ${f.ownerId}`);
  if (f.statusId !== undefined) c.push(Prisma.sql`t.status_id = ${f.statusId}`);
  if (f.categoryId !== undefined) {
    c.push(Prisma.sql`t.category_id = ${f.categoryId}`);
  }
  if (f.priority) {
    c.push(Prisma.sql`COALESCE(t.admin_priority, t.user_priority) = ${f.priority}`);
  }
  if (f.createdFrom) c.push(Prisma.sql`t.created_at >= ${f.createdFrom}`);
  if (f.createdTo) c.push(Prisma.sql`t.created_at <= ${f.createdTo}`);
  return c;
}

/** Keyset predicate in index-friendly form (no row-value comparison). */
export function cursorCondition(
  sortBy: TicketSortField,
  order: TicketSortOrder,
  value: Date,
  id: bigint,
): Prisma.Sql {
  const col = sortColumn(sortBy);
  const op = Prisma.raw(order === 'desc' ? '<' : '>');
  return Prisma.sql`(${col} ${op} ${value} OR (${col} = ${value} AND t.id ${op} ${id}))`;
}

/** Rows from the cursor up to and including the scan boundary. */
function windowCondition(
  sortBy: TicketSortField,
  order: TicketSortOrder,
  boundary: TicketRef,
): Prisma.Sql {
  const col = sortColumn(sortBy);
  const value = refValue(boundary, sortBy);
  const strict = Prisma.raw(order === 'desc' ? '>' : '<');
  const inclusive = Prisma.raw(order === 'desc' ? '>=' : '<=');
  return Prisma.sql`(${col} ${strict} ${value} OR (${col} = ${value} AND t.id ${inclusive} ${boundary.id}))`;
}

// ---------------------------------------------------------------- lookups

/**
 * Small tables are searched first, so the big ticket query never joins them.
 * Categories, sub-categories, statuses, priorities, and (admin) requesters.
 */
export async function resolveTicketLookups(
  db: Db,
  term: string,
  includeRequesters: boolean,
): Promise<TicketLookupIds> {
  const contains = containsPattern(term);
  const prefix = prefixPattern(term);
  const wordPrefix = wordPrefixPattern(term);

  const categories = await db.$queryRaw<{ id: bigint | number }[]>`
    SELECT id FROM ticket_categories
    WHERE name LIKE ${contains} ESCAPE '!'
    LIMIT ${intSql(LOOKUP_ID_LIMIT)}`;

  const subCategories = await db.$queryRaw<{ id: bigint | number }[]>`
    SELECT id FROM ticket_sub_categories
    WHERE name LIKE ${contains} ESCAPE '!'
    LIMIT ${intSql(LOOKUP_ID_LIMIT)}`;

  const statuses = await db.$queryRaw<{ id: number | bigint }[]>`
    SELECT id FROM ticket_statuses
    WHERE name LIKE ${contains} ESCAPE '!'`;

  const lowered = term.toLowerCase();
  const priorities = Object.values(Priority).filter((p) =>
    p.toLowerCase().startsWith(lowered),
  );

  let requesters: { id: bigint | number }[] = [];
  if (includeRequesters) {
    requesters = await db.$queryRaw<{ id: bigint | number }[]>`
      SELECT id FROM users
      WHERE name LIKE ${prefix} ESCAPE '!'
         OR name LIKE ${wordPrefix} ESCAPE '!'
         OR email LIKE ${prefix} ESCAPE '!'
      LIMIT ${intSql(REQUESTER_ID_LIMIT)}`;
  }

  return {
    categoryIds: categories.map((r) => BigInt(r.id)),
    subCategoryIds: subCategories.map((r) => BigInt(r.id)),
    statusIds: statuses.map((r) => Number(r.id)),
    priorities,
    requesterIds: requesters.map((r) => BigInt(r.id)),
  };
}

// ---------------------------------------------------------------- matching

/** The OR of everything a keyword may match. No joins. */
export function buildMatchCondition(
  term: string,
  numericId: bigint | null,
  lookups: TicketLookupIds,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`t.subject LIKE ${containsPattern(term)} ESCAPE '!'`,
    Prisma.sql`t.description LIKE ${containsPattern(term)} ESCAPE '!'`,
    Prisma.sql`t.ticket_number LIKE ${prefixPattern(term)} ESCAPE '!'`,
  ];
  if (numericId !== null) parts.push(Prisma.sql`t.id = ${numericId}`);
  if (lookups.categoryIds.length > 0) {
    parts.push(Prisma.sql`t.category_id IN (${Prisma.join(lookups.categoryIds)})`);
  }
  if (lookups.subCategoryIds.length > 0) {
    parts.push(
      Prisma.sql`t.sub_category_id IN (${Prisma.join(lookups.subCategoryIds)})`,
    );
  }
  if (lookups.statusIds.length > 0) {
    parts.push(Prisma.sql`t.status_id IN (${Prisma.join(lookups.statusIds)})`);
  }
  if (lookups.priorities.length > 0) {
    parts.push(
      Prisma.sql`COALESCE(t.admin_priority, t.user_priority) IN (${Prisma.join(lookups.priorities)})`,
    );
  }
  if (lookups.requesterIds.length > 0) {
    parts.push(Prisma.sql`t.user_id IN (${Prisma.join(lookups.requesterIds)})`);
  }
  return Prisma.sql`(${Prisma.join(parts, ' OR ')})`;
}

// ---------------------------------------------------------------- queries

/**
 * Where does the scan stop? The row at position `budget` in sort order.
 * OFFSET is used only here, with a fixed constant, never from the user.
 * Returns null when fewer than `budget` rows remain (we reach the end).
 */
export async function fetchScanBoundary(
  db: Db,
  scope: Prisma.Sql[],
  sortBy: TicketSortField,
  order: TicketSortOrder,
  budget: number,
): Promise<TicketRef | null> {
  const rows = await db.$queryRaw<RawRef[]>`
    SELECT t.id AS id, t.created_at AS createdAt, t.updated_at AS updatedAt
    FROM tickets t
    WHERE ${joinAnd(scope)}
    ORDER BY ${sortColumn(sortBy)} ${direction(order)}, t.id ${direction(order)}
    LIMIT 1 OFFSET ${intSql(budget - 1)}`;
  return rows.length > 0 ? toRef(rows[0]) : null;
}

/** Matching ids inside the window. Stops early once `take` matches are found. */
export async function fetchCandidates(
  db: Db,
  scope: Prisma.Sql[],
  match: Prisma.Sql,
  boundary: TicketRef | null,
  sortBy: TicketSortField,
  order: TicketSortOrder,
  take: number,
): Promise<TicketRef[]> {
  const conditions = [...scope, match];
  if (boundary) conditions.push(windowCondition(sortBy, order, boundary));

  const rows = await db.$queryRaw<RawRef[]>`
    SELECT t.id AS id, t.created_at AS createdAt, t.updated_at AS updatedAt
    FROM tickets t
    WHERE ${joinAnd(conditions)}
    ORDER BY ${sortColumn(sortBy)} ${direction(order)}, t.id ${direction(order)}
    LIMIT ${intSql(take)}`;
  return rows.map(toRef);
}

/** Short input (< 3 chars): only an exact id or exact ticket number. */
export async function fetchIdentifierMatches(
  db: Db,
  scope: Prisma.Sql[],
  term: string,
  numericId: bigint | null,
): Promise<TicketRef[]> {
  const parts: Prisma.Sql[] = [Prisma.sql`t.ticket_number = ${term}`];
  if (numericId !== null) parts.push(Prisma.sql`t.id = ${numericId}`);

  const rows = await db.$queryRaw<RawRef[]>`
    SELECT t.id AS id, t.created_at AS createdAt, t.updated_at AS updatedAt
    FROM tickets t
    WHERE ${joinAnd(scope)} AND (${Prisma.join(parts, ' OR ')})
    LIMIT 2`;
  return rows.map(toRef);
}
