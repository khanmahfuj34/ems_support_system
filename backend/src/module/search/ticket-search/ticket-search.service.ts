import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { UserRoleId } from '../../../common/decorators/roles.decorator.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import {
  buildCursorFingerprint,
  decodeTicketCursor,
  encodeTicketCursor,
  type DecodedTicketCursor,
  type TicketCursorScope,
  type TicketSortField,
  type TicketSortOrder,
} from '../../tickets/utils/ticket-cursor.js';
import {
  serializeTicketListRow,
  TICKET_LIST_SELECT,
  type TicketListResult,
} from '../../tickets/utils/ticket-list.mapper.js';
import { SearchExecutor } from '../common/search-executor.service.js';
import {
  normalizeSearchTerm,
  parsePositiveBigInt,
} from '../common/search-normalization.js';
import { clampLimit } from '../common/search-pagination.js';
import {
  SEARCH_MIN_TEXT_LENGTH,
  TICKET_SEARCH_SCAN_BUDGET,
} from '../search.constants.js';
import type { SearchActor } from '../search.types.js';
import {
  buildMatchCondition,
  buildScopeConditions,
  cursorCondition,
  fetchCandidates,
  fetchIdentifierMatches,
  fetchScanBoundary,
  refValue,
  resolveTicketLookups,
} from './ticket-search.query.js';
import type {
  TicketRef,
  TicketScopeFilters,
  TicketSearchInput,
  TicketSearchOptions,
} from './ticket-search.types.js';

interface ScanContext {
  term: string;
  limit: number;
  sortBy: TicketSortField;
  sortOrder: TicketSortOrder;
  isAdmin: boolean;
  filters: TicketScopeFilters;
  cursor?: DecodedTicketCursor;
  budget: number;
  fingerprint: string;
}

@Injectable()
export class TicketSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: SearchExecutor,
  ) {}

  /**
   * Keyword search over tickets.
   * - User: own tickets only (user_id index).
   * - Admin: every ticket, newest first, scanned in budgeted steps.
   *   `hasMore: true` with an empty `data` means "budget used up, keep
   *   going with nextCursor", not "nothing found".
   */
  async search(
    actor: SearchActor,
    input: TicketSearchInput,
    options: TicketSearchOptions = {},
  ): Promise<TicketListResult> {
    if (!/^[1-9]\d*$/.test(actor.id)) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    const term = normalizeSearchTerm(input.search);
    const limit = clampLimit(input.limit);
    const sortBy = input.sortBy ?? 'createdAt';
    const sortOrder = input.sortOrder ?? 'desc';
    const isAdmin = Number(actor.roleId) === UserRoleId.ADMIN;

    if (isAdmin && sortBy !== 'createdAt') {
      // There is no (updated_at) index, so this would sort the whole table.
      throw new BadRequestException(
        'Admin ticket search can only be ordered by createdAt',
      );
    }

    const createdFrom = input.createdFrom ? new Date(input.createdFrom) : undefined;
    const createdTo = input.createdTo ? new Date(input.createdTo) : undefined;

    const filters: TicketScopeFilters = {
      ownerId: isAdmin ? undefined : BigInt(actor.id),
      statusId: input.statusId,
      categoryId:
        input.categoryId !== undefined ? BigInt(input.categoryId) : undefined,
      priority: input.priority,
      createdFrom,
      createdTo,
    };

    const scope: TicketCursorScope = {
      sortBy,
      sortOrder,
      search: term,
      statusId: input.statusId,
      priority: input.priority,
      categoryId: input.categoryId,
      createdFrom: createdFrom?.toISOString(),
      createdTo: createdTo?.toISOString(),
      userId: isAdmin ? undefined : actor.id,
      roleId: actor.roleId,
    };
    const fingerprint = buildCursorFingerprint(scope);
    const cursor = input.cursor
      ? decodeTicketCursor(input.cursor, scope)
      : undefined;

    if (!term) {
      return this.emptyResponse(limit);
    }

    const page = await this.executor.run((tx) =>
      this.scan(tx, {
        term,
        limit,
        sortBy,
        sortOrder,
        isAdmin,
        filters,
        cursor,
        budget: options.budget ?? TICKET_SEARCH_SCAN_BUDGET,
        fingerprint,
      }),
    );

    return {
      message: 'Tickets retrieved successfully',
      data: page.rows.map(serializeTicketListRow),
      pagination: {
        limit,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
      },
    };
  }

  private emptyResponse(limit: number) {
    return {
      message: 'Tickets retrieved successfully',
      data: [] as ReturnType<typeof serializeTicketListRow>[],
      pagination: { limit, hasMore: false, nextCursor: null as string | null },
    };
  }

  private async scan(tx: Prisma.TransactionClient, ctx: ScanContext) {
    const numericId = parsePositiveBigInt(ctx.term);
    const textSearch = ctx.term.length >= SEARCH_MIN_TEXT_LENGTH;
    const baseScope = buildScopeConditions(ctx.filters);

    let refs: TicketRef[];
    let hasMore = false;
    let nextRef: TicketRef | null = null;

    if (!textSearch) {
      // 1-2 characters: exact id / ticket number only, one page.
      refs = ctx.cursor
        ? []
        : await fetchIdentifierMatches(tx, baseScope, ctx.term, numericId);
      refs.sort((a, b) => {
        const left = refValue(a, ctx.sortBy).getTime();
        const right = refValue(b, ctx.sortBy).getTime();
        if (left !== right) {
          return ctx.sortOrder === 'desc' ? right - left : left - right;
        }
        if (a.id === b.id) return 0;
        const leftFirst = a.id < b.id;
        return ctx.sortOrder === 'desc'
          ? leftFirst
            ? 1
            : -1
          : leftFirst
            ? -1
            : 1;
      });
      refs = refs.slice(0, ctx.limit);
    } else {
      const scope = [...baseScope];
      if (ctx.cursor) {
        scope.push(
          cursorCondition(ctx.sortBy, ctx.sortOrder, ctx.cursor.value, ctx.cursor.id),
        );
      }

      const lookups = await resolveTicketLookups(tx, ctx.term, ctx.isAdmin);
      const boundary = await fetchScanBoundary(
        tx,
        scope,
        ctx.sortBy,
        ctx.sortOrder,
        ctx.budget,
      );
      const match = buildMatchCondition(ctx.term, numericId, lookups);
      const candidates = await fetchCandidates(
        tx,
        scope,
        match,
        boundary,
        ctx.sortBy,
        ctx.sortOrder,
        ctx.limit + 1,
      );

      if (candidates.length > ctx.limit) {
        refs = candidates.slice(0, ctx.limit);
        hasMore = true;
        nextRef = refs[refs.length - 1];
      } else {
        refs = candidates;
        if (boundary) {
          // Budget used up before the page filled: resume after the boundary.
          hasMore = true;
          nextRef = boundary;
        }
      }
    }

    const ids = refs.map((ref) => ref.id);
    const found =
      ids.length === 0
        ? []
        : await tx.ticket.findMany({
            where: {
              id: { in: ids },
              // Defensive: ownership is checked again when loading rows.
              ...(ctx.filters.ownerId !== undefined
                ? { userId: ctx.filters.ownerId }
                : {}),
            },
            select: TICKET_LIST_SELECT,
          });

    const byId = new Map(found.map((row) => [row.id.toString(), row]));
    const rows = ids
      .map((id) => byId.get(id.toString()))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);

    const nextCursor = nextRef
      ? encodeTicketCursor({
          sortBy: ctx.sortBy,
          sortOrder: ctx.sortOrder,
          value: refValue(nextRef, ctx.sortBy),
          id: nextRef.id,
          fingerprint: ctx.fingerprint,
        })
      : null;

    return { rows, hasMore, nextCursor };
  }
}