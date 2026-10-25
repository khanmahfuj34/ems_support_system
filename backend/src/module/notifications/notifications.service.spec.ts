import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

function createService() {
  return new NotificationsService(prismaMock as never);
}

const notificationRow = {
  id: 3n,
  ticketId: 1n,
  title: 'Ticket accepted',
  message: 'Your ticket was accepted',
  type: 'TICKET_ACCEPTED',
  isRead: false,
  createdAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationsService.listForUser', () => {
  it('scopes the query to the authenticated user and paginates', async () => {
    prismaMock.notification.findMany.mockResolvedValue([notificationRow]);
    prismaMock.notification.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);
    prismaMock.$transaction.mockImplementation(async (ops) =>
      Promise.all(ops),
    );

    const service = createService();

    const result = await service.listForUser('5', {
      page: 2,
      limit: 10,
    });

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 5n },
        skip: 10,
        take: 10,
      }),
    );

    expect(result).toMatchObject({
      message: 'Notifications retrieved successfully',
      pagination: {
        page: 2,
        limit: 10,
        total: 5,
        totalPages: 1,
      },
      unreadCount: 1,
    });
    expect(result.data[0]).toEqual({
      ...notificationRow,
      id: '3',
      ticketId: '1',
    });
  });

  it('filters unread notifications when unreadOnly is requested', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);
    prismaMock.$transaction.mockImplementation(async (ops) =>
      Promise.all(ops),
    );

    const service = createService();

    await service.listForUser('5', {
      page: 1,
      limit: 10,
      unreadOnly: true,
    });

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 5n, isRead: false },
      }),
    );

    const countCalls = prismaMock.notification.count.mock.calls;
    expect(countCalls).toEqual([
      [{ where: { userId: 5n, isRead: false } }],
      [{ where: { userId: 5n, isRead: false } }],
    ]);
  });

  it('rejects an invalid user ID', async () => {
    const service = createService();

    await expect(
      service.listForUser('0', { page: 1, limit: 10 }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.markAsRead', () => {
  it('marks an owned unread notification as read', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.notification.findFirst.mockResolvedValue({
      ...notificationRow,
      isRead: true,
    });

    const service = createService();

    const result = await service.markAsRead('5', '3');

    expect(result.message).toBe('Notification marked as read');

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 3n, userId: 5n, isRead: false },
      data: { isRead: true },
    });
  });

  it('rejects an invalid notification ID', async () => {
    const service = createService();

    await expect(
      service.markAsRead('5', 'not-a-number'),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.notification.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotFound for another users notification', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.notification.findFirst.mockResolvedValue(null);

    const service = createService();

    await expect(service.markAsRead('5', '3')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('NotificationsService.markAllAsRead', () => {
  it('marks only the authenticated users unread notifications', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 4 });

    const service = createService();

    const result = await service.markAllAsRead('5');

    expect(result).toEqual({
      message: 'Unread notifications marked as read',
      updatedCount: 4,
    });

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 5n, isRead: false },
      data: { isRead: true },
    });
  });
});
