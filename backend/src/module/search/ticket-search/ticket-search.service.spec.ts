import { inspect } from 'node:util';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { UserRoleId } from '../../../common/decorators/roles.decorator.js';
import {
  buildCursorFingerprint,
  encodeTicketCursor,
} from '../../tickets/utils/ticket-cursor.js';
import { TicketSearchService } from './ticket-search.service.js';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  ticket: { findMany: vi.fn() },
}));

vi.mock('../../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

const executorMock = {
  run: vi.fn((operation: (tx: unknown) => Promise<unknown>) =>
    operation(prismaMock),
  ),
};

const admin = { id: '202', roleId: UserRoleId.ADMIN };
const user = { id: '101', roleId: UserRoleId.USER };
const createdAt = new Date('2026-01-01T00:00:00.000Z');

function createService() {
  return new TicketSearchService(prismaMock as never, executorMock as never);
}

function ref(id: string) {
  return { id: BigInt(id), createdAt, updatedAt: createdAt };
}

describe('TicketSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executorMock.run.mockImplementation(
      (operation: (tx: unknown) => Promise<unknown>) => operation(prismaMock),
    );
    prismaMock.ticket.findMany.mockResolvedValue([]);
  });

  it('rejects an invalid authenticated user', async () => {
    await expect(
      createService().search({ id: 'not-an-id', roleId: UserRoleId.USER }, {
        search: 'abc',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects admin search sorted by updatedAt', async () => {
    await expect(
      createService().search(admin, { search: 'abc', sortBy: 'updatedAt' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes regular-user search to the owner', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([ref('9')]);

    await createService().search(user, { search: '1', limit: 5 });

    const statement = inspect(prismaMock.$queryRaw.mock.calls[0]);
    expect(statement).toContain('t.user_id = ');
    expect(statement).toContain('101n');
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 101n }),
      }),
    );
  });

  it('slices short identifier results and breaks ties by id', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      ref('1'),
      ref('3'),
      ref('2'),
    ]);

    await createService().search(admin, { search: '2', limit: 2 });

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [3n, 2n] } },
      }),
    );
  });

  it('rejects a cursor from a different search term', async () => {
    const term = 'alpha';
    const cursor = encodeTicketCursor({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      value: createdAt,
      id: 5n,
      fingerprint: buildCursorFingerprint({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: term,
        userId: undefined,
        roleId: admin.roleId,
      }),
    });

    await expect(
      createService().search(admin, { search: 'beta', cursor }),
    ).rejects.toThrow('search or filters');
    expect(executorMock.run).not.toHaveBeenCalled();
  });

  it('reports budget exhaustion with hasMore and a resumable cursor', async () => {
    const boundary = ref('10');
    prismaMock.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([boundary])
      .mockResolvedValueOnce([]);

    const result = await createService().search(
      admin,
      { search: 'needle', limit: 10 },
      { budget: 100 },
    );

    expect(result.data).toEqual([]);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBeTruthy();
    expect(result.pagination).not.toHaveProperty('total');
  });
});
