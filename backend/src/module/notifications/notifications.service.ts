import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';

export const NOTIFICATION_SELECT = {
  id: true,
  ticketId: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  createdAt: true,
} as const;

export interface CreateTicketNotificationInput {
  userId: bigint;
  ticketId: bigint;
  title: string;
  message: string;
  type: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateId(value: string, label: string): bigint {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return BigInt(value);
  }

  private serializeNotification<
    T extends {
      id: bigint;
      ticketId: bigint | null;
    },
  >(notification: T) {
    return {
      ...notification,
      id: notification.id.toString(),
      ticketId: notification.ticketId?.toString() ?? null,
    };
  }

  /**
   * Lists notifications belonging only to the authenticated user.
   * unreadCount always represents all unread notifications,
   * regardless of the selected list filter.
   */
  async listForUser(
    userId: string,
    query: ListNotificationsQueryDto,
  ) {
    const userIdBigInt = this.validateId(userId, 'user ID');

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId: userIdBigInt,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] =
      await this.prisma.$transaction([
        this.prisma.notification.findMany({
          where,
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          skip,
          take: limit,
          select: NOTIFICATION_SELECT,
        }),

        this.prisma.notification.count({ where }),

        this.prisma.notification.count({
          where: {
            userId: userIdBigInt,
            isRead: false,
          },
        }),
      ]);

    return {
      message: 'Notifications retrieved successfully',
      data: notifications.map((notification) =>
        this.serializeNotification(notification),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Marks one notification as read.
   * The ownership check prevents users from modifying another
   * user's notifications. Repeated calls are safe.
   */
  async markAsRead(userId: string, notificationId: string) {
    const userIdBigInt = this.validateId(userId, 'user ID');
    const notificationIdBigInt = this.validateId(
      notificationId,
      'notification ID',
    );

    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notificationIdBigInt,
        userId: userIdBigInt,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationIdBigInt,
        userId: userIdBigInt,
      },
      select: NOTIFICATION_SELECT,
    });

    if (!notification) {
      // Return 404 for missing notifications and other users' records.
      throw new NotFoundException('Notification not found');
    }

    return {
      message:
        updated.count > 0
          ? 'Notification marked as read'
          : 'Notification was already read',
      data: this.serializeNotification(notification),
    };
  }

  /**
   * Marks all unread notifications belonging to the current user as read.
   */
  async markAllAsRead(userId: string) {
    const userIdBigInt = this.validateId(userId, 'user ID');

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: userIdBigInt,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      message: 'Unread notifications marked as read',
      updatedCount: result.count,
    };
  }

  /**
   * Creates a ticket notification inside the caller's transaction.
   *
   * The caller must pass its current Prisma transaction client so
   * notification creation can roll back with the ticket update.
   */
  async createTicketNotification(
    tx: Prisma.TransactionClient,
    input: CreateTicketNotificationInput,
  ): Promise<void> {
    await tx.notification.create({
      data: {
        userId: input.userId,
        ticketId: input.ticketId,
        title: input.title,
        message: input.message,
        type: input.type,
      },
    });
  }
}