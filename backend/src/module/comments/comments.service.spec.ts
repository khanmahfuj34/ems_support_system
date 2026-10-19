import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

import { CommentsService } from './comments.service.js';

// In-memory stand-in for the Prisma client; no real database is touched.
const prismaMock = vi.hoisted(() => ({
  ticket: {
    findUnique: vi.fn(),
  },
  ticketComment: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  ticketActivityLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

const OWNER = { id: '101', roleId: 1 };
const ADMIN = { id: '202', roleId: 2 };
const OUTSIDER = { id: '303', roleId: 1 };

function ownTicketRow() {
  return Promise.resolve({ id: BigInt(1), userId: BigInt(101) });
}

function createService() {
  return new CommentsService(prismaMock as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CommentsService authorization', () => {
  it('rejects an invalid ticket id without querying the database', async () => {
    const service = createService();

    await expect(service.listComments('abc', OWNER)).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the ticket does not exist', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);
    const service = createService();

    await expect(service.listComments('1', OWNER)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects a regular user reading another user ticket', async () => {
    prismaMock.ticket.findUnique.mockImplementation(ownTicketRow);
    const service = createService();

    await expect(service.listComments('1', OUTSIDER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows the owner to read the conversation and maps BigInt fields', async () => {
    prismaMock.ticket.findUnique.mockImplementation(ownTicketRow);
    prismaMock.ticketComment.findMany.mockResolvedValue([
      {
        id: BigInt(9),
        ticketId: BigInt(1),
        content: 'Any update?',
        createdAt: new Date('2026-01-02T10:00:00Z'),
        user: { id: BigInt(101), name: 'Owner', roleId: 1 },
      },
    ]);
    const service = createService();

    const result = await service.listComments('1', OWNER);

    expect(result.message).toBe('Comments retrieved successfully');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: '9',
      ticketId: '1',
      content: 'Any update?',
      user: { id: '101', name: 'Owner' },
    });
  });

  it('allows an admin to read any ticket conversation', async () => {
    prismaMock.ticket.findUnique.mockImplementation(ownTicketRow);
    prismaMock.ticketComment.findMany.mockResolvedValue([]);
    const service = createService();

    expect((await service.listComments('1', ADMIN)).data).toEqual([]);
  });
});

describe('CommentsService.addComment', () => {
  function withTransaction() {
    const activityLogCreate = vi.fn().mockResolvedValue({});
    const commentCreate = vi.fn().mockResolvedValue({
      id: BigInt(9),
      ticketId: BigInt(1),
      content: 'Any update?',
      createdAt: new Date('2026-01-02T11:30:00Z'),
      user: { id: BigInt(202), name: 'Admin', roleId: 2 },
    });
    const tx = {
      ticketComment: { create: commentCreate },
      ticketActivityLog: { create: activityLogCreate },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    return { commentCreate, activityLogCreate };
  }

  it('stores the trimmed comment and records COMMENT_ADDED atomically', async () => {
    prismaMock.ticket.findUnique.mockImplementation(ownTicketRow);
    const { commentCreate, activityLogCreate } = withTransaction();
    const service = createService();

    const result = await service.addComment('1', OWNER, {
      content: '  Any update?  ',
    });

    expect(result.message).toBe('Comment added successfully');
    expect(result.data).toMatchObject({
      id: '9',
      ticketId: '1',
      content: 'Any update?',
      user: { name: 'Admin' },
    });

    expect(commentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: BigInt(1),
          userId: BigInt(101),
          content: 'Any update?',
        }),
      }),
    );
    expect(activityLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'COMMENT_ADDED' }),
      }),
    );
  });

  it('rejects whitespace-only comments', async () => {
    prismaMock.ticket.findUnique.mockImplementation(ownTicketRow);
    const service = createService();

    await expect(
      service.addComment('1', OWNER, { content: '    ' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a regular user commenting on a ticket they do not own', async () => {
    prismaMock.ticket.findUnique.mockImplementation(ownTicketRow);
    const service = createService();

    await expect(
      service.addComment('1', OUTSIDER, { content: 'Hello' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
