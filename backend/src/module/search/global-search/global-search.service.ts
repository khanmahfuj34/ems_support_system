import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UserRoleId } from '../../../common/decorators/roles.decorator.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import {
  normalizeSearchTerm,
  parsePositiveBigInt,
} from '../common/search-normalization.js';
import {
  GLOBAL_GROUP_LIMIT,
  GLOBAL_TICKET_SCAN_BUDGET,
  SEARCH_MIN_TEXT_LENGTH,
} from '../search.constants.js';
import type { SearchActor } from '../search.types.js';
import { TicketSearchService } from '../ticket-search/ticket-search.service.js';
import { UserSearchService } from '../user-search/user-search.service.js';
import type {
  CategorySearchItem,
  SearchGroup,
  SubCategorySearchItem,
} from './global-search.types.js';

/**
 * Global search never runs one giant OR over many tables.
 * It calls each focused search service for a few top results and returns
 * separate groups. One failing group does not break the others.
 *
 * Not included yet: comments (needs a comment_preview column or FULLTEXT)
 * and knowledge base (no table yet).
 */
@Injectable()
export class GlobalSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketSearchService,
    private readonly users: UserSearchService,
  ) {}

  async search(actor: SearchActor, rawTerm?: string, limit = GLOBAL_GROUP_LIMIT) {
    if (!/^[1-9]\d*$/.test(actor.id)) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    const term = normalizeSearchTerm(rawTerm);
    const isAdmin = Number(actor.roleId) === UserRoleId.ADMIN;
    const searchable =
      term.length >= SEARCH_MIN_TEXT_LENGTH || parsePositiveBigInt(term) !== null;

    if (!searchable) {
      return { term, groups: this.emptyGroups() };
    }

    const [tickets, users, categories, subCategories] = await Promise.allSettled([
      this.tickets.search(
        actor,
        { search: term, limit },
        { budget: GLOBAL_TICKET_SCAN_BUDGET },
      ),
      isAdmin
        ? this.users.searchUsers(actor, { search: term, limit })
        : Promise.resolve(null),
      this.searchCategories(term, limit),
      this.searchSubCategories(term, limit),
    ]);

    return {
      term,
      groups: {
        tickets:
          tickets.status === 'fulfilled'
            ? ({
                items: tickets.value.data,
                hasMore: tickets.value.pagination.hasMore,
                partial:
                  tickets.value.pagination.hasMore &&
                  tickets.value.data.length < limit,
              } satisfies SearchGroup<(typeof tickets.value.data)[number]>)
            : this.failed(),
        users: !isAdmin
          ? undefined
          : users.status === 'fulfilled' && users.value
            ? { items: users.value.data, hasMore: users.value.pagination.hasMore }
            : this.failed(),
        categories:
          categories.status === 'fulfilled' ? categories.value : this.failed(),
        subCategories:
          subCategories.status === 'fulfilled'
            ? subCategories.value
            : this.failed(),
      },
    };
  }

  // Small tables (categories): a plain Prisma contains is fine here.
  private async searchCategories(
    term: string,
    limit: number,
  ): Promise<SearchGroup<CategorySearchItem>> {
    const rows = await this.prisma.ticketCategory.findMany({
      where: { isActive: true, name: { contains: term } },
      orderBy: { sortOrder: 'asc' },
      take: limit + 1,
      select: { id: true, name: true },
    });
    return {
      items: rows.slice(0, limit).map((r) => ({ id: r.id.toString(), name: r.name })),
      hasMore: rows.length > limit,
    };
  }

  private async searchSubCategories(
    term: string,
    limit: number,
  ): Promise<SearchGroup<SubCategorySearchItem>> {
    const rows = await this.prisma.ticketSubCategory.findMany({
      where: { isActive: true, name: { contains: term } },
      orderBy: { sortOrder: 'asc' },
      take: limit + 1,
      select: {
        id: true,
        name: true,
        category: { select: { id: true, name: true } },
      },
    });
    return {
      items: rows.slice(0, limit).map((r) => ({
        id: r.id.toString(),
        name: r.name,
        categoryId: r.category.id.toString(),
        categoryName: r.category.name,
      })),
      hasMore: rows.length > limit,
    };
  }

  private failed(): SearchGroup<never> {
    return { items: [], hasMore: false, failed: true };
  }

  private emptyGroups() {
    return {
      tickets: { items: [], hasMore: false },
      users: undefined,
      categories: { items: [], hasMore: false },
      subCategories: { items: [], hasMore: false },
    };
  }
}