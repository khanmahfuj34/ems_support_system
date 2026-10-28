import { BadRequestException } from '@nestjs/common';

import { SearchExecutor } from '../search/common/search-executor.service.js';
import { buildScopeConditions } from '../search/ticket-search/ticket-search.query.js';
import { TicketsService } from './tickets.service.js';
import { UserRoleId } from '../../common/decorators/roles.decorator.js';

type FakeTicket = {
  id: bigint;
  descriptionPreview: string;
  userId: bigint;
  categoryId: bigint;
  subCategoryId: bigint | null;
  userPriority: string;
  adminPriority: string | null;
  statusId: number;
  slaStatus: number;
  firstResponseAt: Date | null;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: { id: number; name: string } | null;
  slaPolicy: null;
};

const dataset: FakeTicket[] = [];

const prismaMock = vi.hoisted(() => ({
  ticket: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  ticketCategory: { findFirst: vi.fn() },
  ticketSubCategory: { findFirst: vi.fn() },
  slaPolicy: { findFirst: vi.fn() },
  ticketStatus: { findUnique: vi.fn() },
  ticketStatusHistory: { create: vi.fn() },
  ticketActivityLog: { create: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
}));

const ticketSearchMock = {
  search: vi.fn(),
};

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

function createService() {
  return new TicketsService(
    prismaMock as never,
    ticketSearchMock as never,
    new SearchExecutor(prismaMock as never),
  );
}

function makeTicket(
  index: number,
  overrides: Partial<FakeTicket> = {},
): FakeTicket {
  const createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index));

  return {
    id: BigInt(index + 1),
    descriptionPreview: `Description ${index + 1}`,
    userId: BigInt(101),
    categoryId: BigInt(1),
    subCategoryId: null,
    userPriority: 'MEDIUM',
    adminPriority: null,
    statusId: 2,
    slaStatus: 1,
    firstResponseAt: null,
    firstResponseDueAt: createdAt,
    resolutionDueAt: createdAt,
    resolvedAt: null,
    closedAt: null,
    createdAt,
    updatedAt: createdAt,
    status: { id: 2, name: 'PENDING_REVIEW' },
    slaPolicy: null,
    ...overrides,
  };
}

function addTickets(
  count: number,
  overrides: (index: number) => Partial<FakeTicket> = () => ({}),
) {
  for (let index = 0; index < count; index += 1) {
    dataset.push(makeTicket(index, overrides(index)));
  }
}

function compareFilter(actual: unknown, expected: unknown): boolean {
  if (
    expected &&
    typeof expected === 'object' &&
    !(expected instanceof Date) &&
    !Array.isArray(expected)
  ) {
    const filter = expected as Record<string, unknown>;

    if ('in' in filter) {
      const candidates = filter.in as unknown[];
      return candidates.some((candidate) => {
        if (actual instanceof Date && candidate instanceof Date) {
          return actual.getTime() === candidate.getTime();
        }
        return actual === candidate;
      });
    }

    const comparisonKeys = ['lt', 'gt', 'lte', 'gte', 'equals'];
    if (comparisonKeys.some((key) => key in filter)) {
      return comparisonKeys.every((key) => {
        if (!(key in filter)) return true;
        const target = filter[key];

        if (key === 'equals') {
          if (actual instanceof Date && target instanceof Date) {
            return actual.getTime() === target.getTime();
          }
          return actual === target;
        }

        if (actual instanceof Date && target instanceof Date) {
          const left = actual.getTime();
          const right = target.getTime();
          if (key === 'lt') return left < right;
          if (key === 'gt') return left > right;
          if (key === 'lte') return left <= right;
          return left >= right;
        }

        if (typeof actual === 'bigint' && typeof target === 'bigint') {
          if (key === 'lt') return actual < target;
          if (key === 'gt') return actual > target;
          if (key === 'lte') return actual <= target;
          return actual >= target;
        }

        return false;
      });
    }
  }

  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }

  return actual === expected;
}

function matchesWhere(
  row: FakeTicket,
  where: Record<string, unknown> | undefined,
): boolean {
  if (!where) return true;

  return Object.entries(where).every(([key, value]) => {
    switch (key) {
      case 'AND':
        return (value as Record<string, unknown>[]).every((condition) =>
          matchesWhere(row, condition),
        );
      case 'OR':
        return (value as Record<string, unknown>[]).some((condition) =>
          matchesWhere(row, condition),
        );
      case 'userId':
        return compareFilter(row.userId, value);
      case 'categoryId':
        return row.categoryId === value;
      case 'statusId':
        return row.statusId === value;
      case 'id':
        return compareFilter(row.id, value);
      case 'createdAt':
        return compareFilter(row.createdAt, value);
      case 'updatedAt':
        return compareFilter(row.updatedAt, value);
      case 'adminPriority':
        return row.adminPriority === value;
      case 'userPriority':
        return row.userPriority === value;
      default:
        throw new Error(`Unsupported where key in test fake: ${key}`);
    }
  });
}

function matchesRawScope(
  row: FakeTicket,
  conditions: ReturnType<typeof buildScopeConditions>,
): boolean {
  return conditions.every((condition) => {
    const sql = condition.sql;
    const value = condition.values[0];

    if (sql.startsWith('t.status_id =')) return row.statusId === value;
    if (sql.startsWith('t.category_id =')) return row.categoryId === value;
    if (sql.startsWith('COALESCE(t.admin_priority, t.user_priority) =')) {
      return (row.adminPriority ?? row.userPriority) === value;
    }
    if (sql.startsWith('t.created_at >=') && value instanceof Date) {
      return row.createdAt >= value;
    }
    if (sql.startsWith('t.created_at <=') && value instanceof Date) {
      return row.createdAt <= value;
    }

    throw new Error(`Unsupported raw scope condition: ${sql}`);
  });
}

function compareRows(
  left: FakeTicket,
  right: FakeTicket,
  orderBy: Record<string, 'asc' | 'desc'>[],
): number {
  for (const clause of orderBy) {
    for (const [field, direction] of Object.entries(clause)) {
      const leftValue = left[field as keyof FakeTicket];
      const rightValue = right[field as keyof FakeTicket];
      let comparison = 0;

      if (leftValue instanceof Date && rightValue instanceof Date) {
        comparison = leftValue.getTime() - rightValue.getTime();
      } else if (
        typeof leftValue === 'bigint' &&
        typeof rightValue === 'bigint'
      ) {
        comparison =
          leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue));
      }

      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
  }

  return 0;
}

beforeEach(() => {
  dataset.length = 0;
  vi.clearAllMocks();

  prismaMock.ticket.findMany.mockImplementation(
    async (args: {
      where?: Record<string, unknown>;
      orderBy: Record<string, 'asc' | 'desc'>[];
      take?: number;
    }) => {
      const filtered = dataset.filter((row) =>
        matchesWhere(row, args.where),
      );
      const sorted = [...filtered].sort((left, right) =>
        compareRows(left, right, args.orderBy),
      );
      return args.take === undefined ? sorted : sorted.slice(0, args.take);
    },
  );

  prismaMock.ticket.count.mockImplementation(
    async (args: { where?: Record<string, unknown> }) =>
      dataset.filter((row) => matchesWhere(row, args.where)).length,
  );

  prismaMock.$transaction.mockImplementation(
    async (callbackOrOperations: unknown) => {
      if (typeof callbackOrOperations === 'function') {
        return callbackOrOperations(prismaMock);
      }
      return Promise.all(callbackOrOperations as Promise<unknown>[]);
    },
  );
  prismaMock.$queryRaw.mockResolvedValue([{ max_execution_time: 0 }]);
  prismaMock.$executeRaw.mockResolvedValue(0);
  prismaMock.user.findMany.mockResolvedValue([]);
});

type PageUser = { id: string; roleId: number };

async function collectPages(
  service: TicketsService,
  user: PageUser,
  baseQuery: Record<string, unknown> = {},
  limit = 10,
) {
  const ids: string[] = [];
  const pages: string[][] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 100; page += 1) {
    const result = await service.list(user, {
      ...baseQuery,
      limit,
      ...(cursor ? { cursor } : {}),
    } as never);

    const pageIds = result.data.map((ticket) => ticket.id);
    pages.push(pageIds);
    ids.push(...pageIds);

    if (!result.pagination.hasMore) {
      expect(result.pagination.nextCursor).toBeNull();
      return { ids, pages, last: result };
    }

    expect(result.pagination.nextCursor).toBeTruthy();
    cursor = result.pagination.nextCursor;
  }

  throw new Error('Pagination did not terminate');
}

const admin: PageUser = { id: '202', roleId: UserRoleId.ADMIN };

describe('TicketsService.list cursor pagination', () => {
  it('fetches limit + 1 rows without using offset skip', async () => {
    addTickets(11);
    const service = createService();

    const result = await service.list(admin, { limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.pagination).toMatchObject({ limit: 10, hasMore: true });

    const call = prismaMock.ticket.findMany.mock.calls[0][0] as {
      take: number;
      skip?: number;
    };
    expect(call.take).toBe(11);
    expect(call).not.toHaveProperty('skip');
  });

  it.each([0, 1, 10, 11, 20, 21])(
    'returns every matching ticket exactly once for %i rows',
    async (count) => {
      addTickets(count);
      const service = createService();

      const { ids, pages, last } = await collectPages(service, admin);

      expect(ids).toHaveLength(count);
      expect(new Set(ids).size).toBe(count);
      expect(ids).toEqual(
        Array.from({ length: count }, (_, index) => String(count - index)),
      );
      expect(pages.slice(0, -1).every((page) => page.length === 10)).toBe(
        true,
      );
      expect(last.pagination.hasMore).toBe(false);
      expect(last.pagination.nextCursor).toBeNull();
    },
  );

  it('uses the id tie-breaker when the sort field is not unique', async () => {
    const sameCreatedAt = new Date('2026-01-01T00:00:00.000Z');
    addTickets(5, () => ({ createdAt: sameCreatedAt }));
    const service = createService();

    const { ids, pages } = await collectPages(service, admin, {}, 2);

    expect(ids).toEqual(['5', '4', '3', '2', '1']);
    expect(pages).toEqual([['5', '4'], ['3', '2'], ['1']]);
  });

  it('paginates ascending createdAt order without duplicates', async () => {
    addTickets(21);
    const service = createService();

    const { ids } = await collectPages(
      service,
      admin,
      { sortBy: 'createdAt', sortOrder: 'asc' },
      10,
    );

    expect(ids).toEqual(
      Array.from({ length: 21 }, (_, index) => String(index + 1)),
    );
    expect(new Set(ids).size).toBe(21);
  });

  it('paginates by updatedAt with the id tie-breaker', async () => {
    const sharedUpdatedAt = new Date('2026-02-01T00:00:00.000Z');
    addTickets(7, (index) => ({
      updatedAt: new Date(sharedUpdatedAt.getTime() + (index % 2) * 1000),
    }));
    const service = createService();

    const { ids, pages } = await collectPages(
      service,
      admin,
      { sortBy: 'updatedAt', sortOrder: 'desc' },
      3,
    );

    expect(ids).toEqual(['6', '4', '2', '7', '5', '3', '1']);
    expect(pages).toEqual([
      ['6', '4', '2'],
      ['7', '5', '3'],
      ['1'],
    ]);
  });

  it('delegates non-empty search to TicketSearchService', async () => {
    const expected = {
      message: 'Tickets retrieved successfully',
      data: [],
      pagination: { limit: 5, hasMore: false, nextCursor: null },
    };
    ticketSearchMock.search.mockResolvedValue(expected);
    const service = createService();

    const result = await service.list(admin, { search: 'alpha', limit: 5 });

    expect(ticketSearchMock.search).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ search: 'alpha', limit: 5 }),
    );
    expect(result).toBe(expected);
    expect(prismaMock.ticket.findMany).not.toHaveBeenCalled();
  });

  it('keeps non-search lists on the local list path', async () => {
    addTickets(1);
    const service = createService();

    const result = await service.list(admin, { limit: 10 });

    expect(ticketSearchMock.search).not.toHaveBeenCalled();
    expect(result.data.map((ticket) => ticket.id)).toEqual(['1']);
  });

  it('applies ownership scope before pagination', async () => {
    addTickets(24, (index) => ({
      userId: index < 12 ? BigInt(101) : BigInt(202),
    }));
    const service = createService();

    const userPages = await collectPages(
      service,
      { id: '101', roleId: UserRoleId.USER },
      {},
      10,
    );
    expect(userPages.ids).toHaveLength(12);
    expect(new Set(userPages.ids).size).toBe(12);
    expect(userPages.ids).toEqual(
      Array.from({ length: 12 }, (_, index) => String(12 - index)),
    );

    const adminPages = await collectPages(service, admin, {}, 10);
    expect(adminPages.ids).toHaveLength(24);
    expect(new Set(adminPages.ids).size).toBe(24);
  });

  it('keeps category and status filters applied on every cursor page', async () => {
    addTickets(40, (index) => ({
      categoryId: index % 2 === 0 ? BigInt(1) : BigInt(2),
      statusId: index % 3 === 0 ? 4 : 2,
    }));
    const service = createService();

    const expected = dataset
      .filter(
        (row) => row.categoryId === BigInt(2) && row.statusId === 4,
      )
      .map((row) => row.id.toString())
      .sort((left, right) => Number(right) - Number(left));

    const { ids } = await collectPages(
      service,
      admin,
      { categoryId: '2', statusId: 4 },
      10,
    );

    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('selects the same tickets for non-search and ticket-search scope filters', async () => {
    addTickets(9, (index) => ({
      categoryId: index % 2 === 0 ? BigInt(2) : BigInt(1),
      statusId: index % 3 === 2 ? 4 : 2,
      userPriority: index % 2 === 0 ? 'HIGH' : 'LOW',
      adminPriority: index === 4 ? 'MEDIUM' : null,
    }));
    const service = createService();
    const createdFrom = new Date(
      Date.UTC(2026, 0, 1, 0, 0, 2),
    ).toISOString();
    const createdTo = new Date(
      Date.UTC(2026, 0, 1, 0, 0, 8),
    ).toISOString();
    const filters = {
      statusId: 4,
      categoryId: '2',
      priority: 'HIGH' as const,
      createdFrom,
      createdTo,
    };

    await service.list(admin, filters);

    const prismaWhere = prismaMock.ticket.findMany.mock.calls[0][0]
      .where as Record<string, unknown>;
    const prismaIds = dataset
      .filter((row) => matchesWhere(row, prismaWhere))
      .map((row) => row.id.toString());
    const rawScope = buildScopeConditions({
      statusId: filters.statusId,
      categoryId: BigInt(filters.categoryId),
      priority: filters.priority as never,
      createdFrom: new Date(filters.createdFrom),
      createdTo: new Date(filters.createdTo),
    });
    const rawSqlIds = dataset
      .filter((row) => matchesRawScope(row, rawScope))
      .map((row) => row.id.toString());

    expect(rawSqlIds).toEqual(prismaIds);
    expect(prismaIds).toEqual(['3', '9']);
  });

  it('keeps createdFrom applied on every cursor page', async () => {
    addTickets(20);
    const service = createService();
    const createdFrom = new Date(
      Date.UTC(2026, 0, 1, 0, 0, 10),
    ).toISOString();

    const { ids } = await collectPages(
      service,
      admin,
      { createdFrom },
      5,
    );

    expect(ids).toEqual(
      Array.from({ length: 10 }, (_, index) => String(20 - index)),
    );
  });

  it('handles a deleted cursor row without skipping remaining matches', async () => {
    addTickets(12);
    const service = createService();

    const firstPage = await service.list(admin, { limit: 5 });
    expect(firstPage.pagination.hasMore).toBe(true);

    const firstIds = firstPage.data.map((ticket) => ticket.id);
    const deletedCursorId = firstIds[firstIds.length - 1];
    const cursor = firstPage.pagination.nextCursor;
    expect(cursor).toBeTruthy();

    const deletedIndex = dataset.findIndex(
      (row) => row.id.toString() === deletedCursorId,
    );
    dataset.splice(deletedIndex, 1);

    const secondPage = await service.list(admin, {
      limit: 5,
      cursor: cursor ?? undefined,
    });
    expect(secondPage.data.map((ticket) => ticket.id)).toEqual([
      '7',
      '6',
      '5',
      '4',
      '3',
    ]);

    const thirdPage = await service.list(admin, {
      limit: 5,
      cursor: secondPage.pagination.nextCursor ?? undefined,
    });
    expect(thirdPage.data.map((ticket) => ticket.id)).toEqual(['2', '1']);

    const combined = [
      ...firstIds.filter((id) => id !== deletedCursorId),
      ...secondPage.data.map((ticket) => ticket.id),
      ...thirdPage.data.map((ticket) => ticket.id),
    ];
    expect(combined).toEqual([
      '12',
      '11',
      '10',
      '9',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
    ]);
  });

  it('rejects malformed and mismatched cursors', async () => {
    addTickets(12);
    const service = createService();

    await expect(
      service.list(admin, { cursor: 'not-a-cursor' }),
    ).rejects.toThrow(BadRequestException);

    const firstPage = await service.list(admin, { limit: 5 });
    const cursor = firstPage.pagination.nextCursor ?? undefined;

    await expect(
      service.list(admin, { limit: 5, cursor, sortOrder: 'asc' }),
    ).rejects.toThrow('sort order');
  });

  it('runs the count query only when includeTotal is requested', async () => {
    addTickets(21);
    const service = createService();

    const page = await service.list(admin, { limit: 10 });
    expect(prismaMock.ticket.count).not.toHaveBeenCalled();
    expect(page.pagination).not.toHaveProperty('total');

    const counted = await service.list(admin, {
      limit: 10,
      includeTotal: true,
    });
    expect(prismaMock.ticket.count).toHaveBeenCalledTimes(1);
    expect(counted.pagination.total).toBe(21);
  });

  it('selects the plain-text preview for list rows instead of the full description', async () => {
    addTickets(1);
    const service = createService();

    await service.list(admin, { limit: 10 });

    const selection = prismaMock.ticket.findMany.mock.calls[0][0].select;
    expect(selection).toHaveProperty('descriptionPreview', true);
    expect(selection).not.toHaveProperty('description');
  });

});

describe('TicketsService.list role restrictions', () => {
  it('restricts regular users to their own tickets', async () => {
    addTickets(1);
    const service = createService();

    const result = await service.list(
      { id: '101', roleId: UserRoleId.USER },
      { limit: 10 },
    );

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: BigInt(101) }),
      }),
    );
    expect(result.data[0]).toMatchObject({
      id: '1',
      userId: '101',
      categoryId: '1',
    });
  });

  it('lets admins see every ticket', async () => {
    addTickets(1);
    const service = createService();

    await service.list(
      { id: '202', roleId: UserRoleId.ADMIN },
      { limit: 10 },
    );

    const whereArgument = prismaMock.ticket.findMany.mock.calls[0][0] as {
      where?: Record<string, unknown>;
    };
    expect(whereArgument.where).not.toHaveProperty('userId');
  });
});

describe('TicketsService.getById role restrictions', () => {
  it('restricts the lookup to the owner ticket for regular users', async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    const service = createService();

    await expect(
      service.getById('1', { id: '303', roleId: UserRoleId.USER }),
    ).rejects.toThrow();

    expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: BigInt(303) }),
      }),
    );
  });

  it('removes the ownership filter for admins', async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    const service = createService();

    await expect(
      service.getById('1', { id: '202', roleId: UserRoleId.ADMIN }),
    ).rejects.toThrow();

    const callArguments = prismaMock.ticket.findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(callArguments.where).not.toHaveProperty('userId');
  });
});
