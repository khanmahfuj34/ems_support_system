import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { UserRoleId } from '../../../common/decorators/roles.decorator.js';
import { UserSearchService } from './user-search.service.js';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  user: { findMany: vi.fn(), findUnique: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn() },
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
const createdAt = new Date('2026-01-02T03:04:05.000Z');

function createService() {
  return new UserSearchService(prismaMock as never, executorMock as never);
}

function ticketRow(id: bigint) {
  return {
    id,
    ticketNumber: `EMS-${id}`,
    subject: `Issue ${id}`,
    userPriority: 'HIGH',
    adminPriority: null,
    statusId: 2,
    createdAt,
    status: { id: 2, name: 'PENDING_REVIEW' },
  };
}

describe('UserSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executorMock.run.mockImplementation(
      (operation: (tx: unknown) => Promise<unknown>) => operation(prismaMock),
    );
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.ticket.findMany.mockResolvedValue([]);
    prismaMock.ticket.count.mockResolvedValue(0);
  });

  it('returns bounded user pages and a resumable cursor', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: 3n }, { id: 2n }]);
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 3n,
        name: 'A Person',
        email: 'person@gmail.com',
        roleId: UserRoleId.USER,
        isActive: true,
        createdAt,
      },
    ]);

    const result = await createService().searchUsers(admin, {
      search: '@gmail.com',
      limit: 1,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('3');
    expect(result.pagination).toMatchObject({
      limit: 1,
      hasMore: true,
    });
    expect(result.pagination.nextCursor).toBeTruthy();
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [3n] } },
        select: expect.not.objectContaining({ password: expect.anything() }),
      }),
    );
  });

  it('allows exact numeric ID searches shorter than the text minimum', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: 7n }]);

    await createService().searchUsers(admin, { search: '7' });

    expect(executorMock.run).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns a profile with the role and no password field', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 7n,
      name: 'A Person',
      email: 'person@example.com',
      roleId: UserRoleId.USER,
      isActive: true,
      createdAt,
      lastLoginAt: null,
      role: { id: UserRoleId.USER, name: 'USER' },
    });

    const result = await createService().getProfile(admin, '7');

    expect(result.data).toMatchObject({
      id: '7',
      role: { id: UserRoleId.USER, name: 'USER' },
      isActive: true,
      createdAt,
    });
    const query = prismaMock.user.findUnique.mock.calls[0][0];
    expect(query.select).not.toHaveProperty('password');
    expect(query.select).toHaveProperty('role.select.name', true);
  });

  it('rejects invalid and out-of-range user IDs before querying', async () => {
    await expect(createService().getProfile(admin, '0')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      createService().listTickets(admin, '18446744073709551616', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.ticket.findMany).not.toHaveBeenCalled();
  });

  it('returns selected ticket history fields with cursor pagination', async () => {
    prismaMock.ticket.findMany.mockResolvedValueOnce([
      ticketRow(9n),
      ticketRow(8n),
      ticketRow(7n),
    ]);
    prismaMock.ticket.count.mockResolvedValueOnce(3);

    const result = await createService().listTickets(admin, '7', {
      limit: 2,
    });

    expect(result.data).toEqual([
      {
        id: '9',
        ticketNumber: 'EMS-9',
        subject: 'Issue 9',
        statusId: 2,
        status: { id: 2, name: 'PENDING_REVIEW' },
        userPriority: 'HIGH',
        adminPriority: null,
        createdAt,
      },
      {
        id: '8',
        ticketNumber: 'EMS-8',
        subject: 'Issue 8',
        statusId: 2,
        status: { id: 2, name: 'PENDING_REVIEW' },
        userPriority: 'HIGH',
        adminPriority: null,
        createdAt,
      },
    ]);
    expect(result.pagination).toMatchObject({
      limit: 2,
      total: 3,
      hasMore: true,
    });
    expect(result.pagination.nextCursor).toBeTruthy();
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7n },
        take: 3,
        select: expect.not.objectContaining({
          description: expect.anything(),
          descriptionPreview: expect.anything(),
        }),
      }),
    );
  });

  it('rejects non-admin access to search, profile, and ticket history', async () => {
    const service = createService();

    await expect(service.searchUsers(user, { search: 'person' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getProfile(user, '7')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.listTickets(user, '7', {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
