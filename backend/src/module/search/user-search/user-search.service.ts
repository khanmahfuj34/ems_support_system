import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { UserRoleId } from '../../../common/decorators/roles.decorator.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import {
  buildCursorFingerprint,
  buildCursorWhere,
  decodeTicketCursor,
  encodeTicketCursor,
  type TicketCursorScope,
} from '../../tickets/utils/ticket-cursor.js';
import {
  serializeTicketListRow,
  TICKET_LIST_SELECT,
} from '../../tickets/utils/ticket-list.mapper.js';
import { SearchExecutor } from '../common/search-executor.service.js';
import {
  normalizeSearchTerm,
  parsePositiveBigInt,
} from '../common/search-normalization.js';
import {
  clampLimit,
  decodeIdCursor,
  encodeIdCursor,
} from '../common/search-pagination.js';
import { SEARCH_MIN_TEXT_LENGTH } from '../search.constants.js';
import type { SearchActor } from '../search.types.js';
import {
  findUserIds,
  USER_LIST_SELECT,
  USER_PROFILE_SELECT,
} from './user-search.query.js';
import type {
  UserSearchInput,
  UserTicketsInput,
} from './user-search.types.js';

@Injectable()
export class UserSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: SearchExecutor,
  ) {}

  private assertAdmin(actor: SearchActor) {
    if (Number(actor.roleId) !== UserRoleId.ADMIN) {
      throw new ForbiddenException('Only admins can search users');
    }
  }

  /** Step 1: find users. Light rows only (no tickets, no descriptions). */
  async searchUsers(actor: SearchActor, input: UserSearchInput) {
    this.assertAdmin(actor);

    const term = normalizeSearchTerm(input.search);
    const limit = clampLimit(input.limit);
    const numericId = parsePositiveBigInt(term);

    if (!numericId && term.length < SEARCH_MIN_TEXT_LENGTH) {
      return {
        message: 'Users retrieved successfully',
        data: [],
        pagination: { limit, hasMore: false, nextCursor: null as string | null },
      };
    }

    const afterId = input.cursor ? decodeIdCursor(input.cursor, term) : undefined;

    const ids = await this.executor.run((tx) =>
      findUserIds(tx, term, numericId, afterId, limit + 1),
    );

    const hasMore = ids.length > limit;
    const pageIds = hasMore ? ids.slice(0, limit) : ids;

    const users =
      pageIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: pageIds } },
            select: USER_LIST_SELECT,
          });

    const byId = new Map(users.map((u) => [u.id.toString(), u]));
    const data = pageIds
      .map((id) => byId.get(id.toString()))
      .filter((u): u is NonNullable<typeof u> => u !== undefined)
      .map((u) => ({ ...u, id: u.id.toString() }));

    const lastId = pageIds[pageIds.length - 1];
    return {
      message: 'Users retrieved successfully',
      data,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore && lastId ? encodeIdCursor(term, lastId) : null,
      },
    };
  }

  /** Step 2: the profile page header. One row, no tickets. */
  async getProfile(actor: SearchActor, userId: string) {
    this.assertAdmin(actor);
    if (!/^[1-9]\d*$/.test(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      message: 'User retrieved successfully',
      data: { ...user, id: user.id.toString() },
    };
  }

  /**
   * Step 3: that user's tickets, paginated. Uses the (user_id, created_at)
   * index and the preview column, so no full description is loaded.
   */
  async listTickets(
    actor: SearchActor,
    userId: string,
    input: UserTicketsInput,
  ) {
    this.assertAdmin(actor);
    if (!/^[1-9]\d*$/.test(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const limit = clampLimit(input.limit);
    const sortOrder = input.sortOrder ?? 'desc';
    const ownerId = BigInt(userId);

    const scope: TicketCursorScope = {
      sortBy: 'createdAt',
      sortOrder,
      userId,
      roleId: actor.roleId,
    };
    const fingerprint = buildCursorFingerprint(scope);

    const where: Prisma.TicketWhereInput = input.cursor
      ? {
          AND: [
            { userId: ownerId },
            buildCursorWhere(
              'createdAt',
              sortOrder,
              decodeTicketCursor(input.cursor, scope),
            ),
          ],
        }
      : { userId: ownerId };

    const [rows, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: [{ createdAt: sortOrder }, { id: sortOrder }],
        take: limit + 1,
        select: TICKET_LIST_SELECT,
      }),
      // Cheap: counted through the user_id index, first page only.
      input.cursor
        ? Promise.resolve(undefined)
        : this.prisma.ticket.count({ where: { userId: ownerId } }),
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
      message: 'User tickets retrieved successfully',
      data: pageRows.map(serializeTicketListRow),
      pagination: {
        limit,
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeTicketCursor({
                sortBy: 'createdAt',
                sortOrder,
                value: last.createdAt,
                id: last.id,
                fingerprint,
              })
            : null,
        ...(total !== undefined ? { total } : {}),
      },
    };
  }
}