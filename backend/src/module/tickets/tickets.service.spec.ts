import { TicketsService } from './tickets.service.js';
import { UserRoleId } from '../../common/decorators/roles.decorator.js';

// Stand-in for the Prisma client; verifies the query filters applied per role.
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
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

function createService() {
  return new TicketsService(prismaMock as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TicketsService.list role restrictions', () => {
  function withListFixture() {
    const ticketRow = {
      id: BigInt(1),
      ticketNumber: 'EMS-x',
      subject: 'Printer broken',
      description: '<p>…</p>',
      userId: BigInt(101),
      categoryId: BigInt(1),
      subCategoryId: null,
      userPriority: 'MEDIUM',
      adminPriority: null,
      statusId: 2,
      slaStatus: 1,
      firstResponseAt: null,
      firstResponseDueAt: new Date(),
      resolutionDueAt: new Date(),
      resolvedAt: null,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: BigInt(1), name: 'Hardware' },
      subCategory: null,
      status: { id: 2, name: 'PENDING_REVIEW' },
      slaPolicy: null,
    };

    // list() runs findMany + count inside an array $transaction; the mocked
    // findMany/count calls are already awaited promises.
    prismaMock.$transaction.mockImplementation(async (operations: [Promise<unknown>, Promise<number>]) => {
      const [tickets, total] = await Promise.all(operations);
      return [tickets, total];
    });
    prismaMock.ticket.findMany.mockResolvedValue([ticketRow]);
    prismaMock.ticket.count.mockResolvedValue(1);
  }

  it('restricts regular users to their own tickets', async () => {
    withListFixture();
    const service = createService();

    const result = await service.list(
      { id: '101', roleId: UserRoleId.USER },
      { page: 1, limit: 10 },
    );

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: BigInt(101) }) }),
    );
    expect(result.data[0]).toMatchObject({
      id: '1',
      userId: '101',
      categoryId: '1',
    });
  });

  it('lets admins see every ticket', async () => {
    withListFixture();
    const service = createService();

    await service.list(
      { id: '202', roleId: UserRoleId.ADMIN },
      { page: 1, limit: 10 },
    );

    const whereArgument = prismaMock.ticket.findMany.mock.calls[0][0] as {
      where?: Record<string, unknown>;
    };
    // No user filtering is applied for admins.
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
