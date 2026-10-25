import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  TICKET_STATUS,
  TICKET_STATUS_NAME,
} from '../../common/constants/ticket-status.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RejectTicketDto } from './dto/reject-ticket.dto.js';
import {
  type AdminTicketTargetStatus,
  UpdateTicketStatusDto,
} from './dto/update-ticket-status.dto.js';

/**
 * Status IDs accepted by the generic lifecycle endpoint.
 * PENDING_REVIEW acceptance/rejection remain on their existing endpoints.
 */
const TARGET_STATUS_ID: Record<AdminTicketTargetStatus, number> = {
  IN_PROGRESS: TICKET_STATUS.IN_PROGRESS,
  WAITING_FOR_USER: TICKET_STATUS.WAITING_FOR_USER,
  RESOLVED: TICKET_STATUS.RESOLVED,
  CLOSED: TICKET_STATUS.CLOSED,
  REOPENED: TICKET_STATUS.REOPENED,
};

/**
 * Valid state transitions.
 * The current ticket status determines which target statuses are allowed.
 */
const ALLOWED_TRANSITIONS: Partial<
  Record<number, readonly AdminTicketTargetStatus[]>
> = {
  [TICKET_STATUS.ACCEPTED]: ['IN_PROGRESS'],

  [TICKET_STATUS.IN_PROGRESS]: [
    'WAITING_FOR_USER',
    'RESOLVED',
  ],

  [TICKET_STATUS.WAITING_FOR_USER]: ['IN_PROGRESS'],

  [TICKET_STATUS.RESOLVED]: [
    'CLOSED',
    'REOPENED',
  ],

  [TICKET_STATUS.REOPENED]: ['IN_PROGRESS'],
};

/**
 * SLA status lookup IDs from the existing schema.
 * 1 = ON_TRACK, 3 = BREACHED, 4 = COMPLETED.
 */
const SLA_STATUS = {
  ON_TRACK: 1,
  BREACHED: 3,
  COMPLETED: 4,
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Accept a ticket awaiting administrator review.
   */
  async acceptTicket(ticketId: string, adminId: string) {
    return this.reviewTicket(ticketId, adminId, 'ACCEPT');
  }

  /**
   * Reject a ticket awaiting administrator review.
   */
  async rejectTicket(
    ticketId: string,
    adminId: string,
    dto: RejectTicketDto,
  ) {
    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException(
        'Rejection reason is required',
      );
    }

    return this.reviewTicket(
      ticketId,
      adminId,
      'REJECT',
      reason,
    );
  }

  /**
   * Apply a lifecycle status transition.
   *
   * Ticket update, status history, and activity log are written
   * inside one database transaction.
   */
  async updateTicketStatus(
    ticketId: string,
    adminId: string,
    dto: UpdateTicketStatusDto,
  ) {
    this.validateIds(ticketId, adminId);

    const id = BigInt(ticketId);
    const actorId = BigInt(adminId);

    const targetStatusId = TARGET_STATUS_ID[dto.status];
    const targetStatusName = dto.status;

    const reason = dto.reason?.trim();
    const resolutionSummary = dto.resolutionSummary?.trim();

    // Validate business rules even when this service is called directly.
    if (
      dto.status === 'WAITING_FOR_USER' &&
      (!reason || reason.length < 3)
    ) {
      throw new BadRequestException(
        'A reason is required when waiting for the user',
      );
    }

    if (
      dto.status === 'REOPENED' &&
      (!reason || reason.length < 3)
    ) {
      throw new BadRequestException(
        'A reason is required to reopen a ticket',
      );
    }

    if (
      dto.status === 'RESOLVED' &&
      (!resolutionSummary || resolutionSummary.length < 3)
    ) {
      throw new BadRequestException(
        'Resolution summary is required',
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.ticket.findUnique({
          where: { id },
          select: {
            id: true,
            ticketNumber: true,
            statusId: true,
            userId: true,
            firstResponseAt: true,
            resolutionDueAt: true,
            resolutionSummary: true,
          },
        });

        if (!existing) {
          throw new NotFoundException('Ticket not found');
        }

        const allowedNextStatuses =
          ALLOWED_TRANSITIONS[existing.statusId] ?? [];

        if (!allowedNextStatuses.includes(dto.status)) {
          const currentStatus =
            TICKET_STATUS_NAME[existing.statusId] ??
            'UNKNOWN';

          throw new ConflictException(
            `Invalid ticket status transition: ${currentStatus} -> ${targetStatusName}`,
          );
        }

        const now = new Date();

        const updateData: Prisma.TicketUncheckedUpdateManyInput = {
          statusId: targetStatusId,
        };

        switch (dto.status) {
          case 'IN_PROGRESS': {
            // Record the first response only once.
            if (!existing.firstResponseAt) {
              updateData.firstResponseAt = now;
            }

            updateData.resolvedAt = null;
            updateData.closedAt = null;
            break;
          }

          case 'WAITING_FOR_USER': {
            // The reason is recorded in status history and activity log.
            break;
          }

          case 'RESOLVED': {
            updateData.resolutionSummary =
              resolutionSummary!;

            updateData.resolvedAt = now;
            updateData.closedAt = null;
            updateData.slaStatus = SLA_STATUS.COMPLETED;
            break;
          }

          case 'CLOSED': {
            updateData.closedAt = now;
            break;
          }

          case 'REOPENED': {
            // Clear the current resolution state.
            updateData.resolutionSummary = null;
            updateData.resolvedAt = null;
            updateData.closedAt = null;

            // Re-evaluate the existing resolution deadline.
            updateData.slaStatus =
              existing.resolutionDueAt &&
              existing.resolutionDueAt.getTime() < now.getTime()
                ? SLA_STATUS.BREACHED
                : SLA_STATUS.ON_TRACK;

            break;
          }
        }

        /**
         * Conditional update protects against stale and concurrent
         * status changes.
         */
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            statusId: existing.statusId,
          },
          data: updateData,
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'Ticket status changed. Refresh and try again',
          );
        }

        const previousStatusName =
          TICKET_STATUS_NAME[existing.statusId] ??
          'UNKNOWN';

        const historyReason =
          reason ??
          (dto.status === 'RESOLVED'
            ? `Resolved: ${resolutionSummary}`
            : `Ticket status changed to ${targetStatusName}`);

        // Record the transition.
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: id,
            changedBy: actorId,
            oldStatusId: existing.statusId,
            newStatusId: targetStatusId,
            reason: historyReason,
          },
        });

        // Record the activity timeline event.
        await tx.ticketActivityLog.create({
          data: {
            ticketId: id,
            actorId,
            action: 'TICKET_STATUS_CHANGED',

            oldValue: {
              statusId: existing.statusId,
              status: previousStatusName,
              resolutionSummary:
                existing.resolutionSummary,
            },

            newValue: {
              statusId: targetStatusId,
              status: targetStatusName,
              reason: reason ?? null,
              resolutionSummary:
                dto.status === 'RESOLVED'
                  ? resolutionSummary
                  : null,
            },

            metadata: {
              ticketNumber: existing.ticketNumber,
            },
          },
        });

        // Notify the requester within the same transaction so the
        // notification commits/rolls back with the status transition.
        await this.notifications.createTicketNotification(tx, {
          userId: existing.userId,
          ticketId: id,
          title: 'Ticket status updated',
          type: 'TICKET_STATUS_CHANGED',
          message: historyReason,
        });

        return {
          id: existing.id.toString(),
          ticketNumber: existing.ticketNumber,
          previousStatus: previousStatusName,
          statusId: targetStatusId,
          status: targetStatusName,
          reason: reason ?? null,
          resolutionSummary:
            dto.status === 'RESOLVED'
              ? resolutionSummary
              : null,
        };
      },
    );

    return {
      message: 'Ticket status updated successfully',
      data: result,
    };
  }

  /**
   * Shared ID validation.
   */
  private validateIds(
    ticketId: string,
    actorId: string,
  ) {
    if (!/^[1-9]\d*$/.test(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    if (!/^[1-9]\d*$/.test(actorId)) {
      throw new BadRequestException('Invalid admin ID');
    }
  }

  /**
   * Shared implementation for the existing accept/reject operations.
   */
  private async reviewTicket(
    ticketId: string,
    adminId: string,
    action: 'ACCEPT' | 'REJECT',
    reason?: string,
  ) {
    this.validateIds(ticketId, adminId);

    const id = BigInt(ticketId);
    const actorId = BigInt(adminId);

    const newStatusId =
      action === 'ACCEPT'
        ? TICKET_STATUS.ACCEPTED
        : TICKET_STATUS.REJECTED;

    const newStatusName =
      action === 'ACCEPT'
        ? 'ACCEPTED'
        : 'REJECTED';

    const result = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.ticket.findUnique({
          where: { id },
          select: {
            id: true,
            ticketNumber: true,
            statusId: true,
            userId: true,
          },
        });

        if (!existing) {
          throw new NotFoundException('Ticket not found');
        }

        if (
          existing.statusId !==
          TICKET_STATUS.PENDING_REVIEW
        ) {
          throw new ConflictException(
            'Only tickets pending review can be accepted or rejected',
          );
        }

        // Update only if the ticket is still pending review.
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            statusId: TICKET_STATUS.PENDING_REVIEW,
          },
          data: {
            statusId: newStatusId,
            rejectionReason:
              action === 'REJECT' ? reason : null,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'Ticket status changed. Refresh and try again',
          );
        }

        await tx.ticketStatusHistory.create({
          data: {
            ticketId: id,
            changedBy: actorId,
            oldStatusId: TICKET_STATUS.PENDING_REVIEW,
            newStatusId,
            reason:
              action === 'REJECT'
                ? reason!
                : 'Ticket accepted by administrator',
          },
        });

        await tx.ticketActivityLog.create({
          data: {
            ticketId: id,
            actorId,
            action:
              action === 'ACCEPT'
                ? 'TICKET_ACCEPTED'
                : 'TICKET_REJECTED',

            oldValue: {
              statusId: TICKET_STATUS.PENDING_REVIEW,
              status: 'PENDING_REVIEW',
            },

            newValue: {
              statusId: newStatusId,
              status: newStatusName,
              ...(reason
                ? { rejectionReason: reason }
                : {}),
            },

            metadata: {
              ticketNumber: existing.ticketNumber,
            },
          },
        });

        // Notify the requester within the same transaction so the
        // notification commits/rolls back with the review decision.
        await this.notifications.createTicketNotification(tx, {
          userId: existing.userId,
          ticketId: id,
          title: action === 'ACCEPT' ? 'Ticket accepted' : 'Ticket rejected',
          type: action === 'ACCEPT' ? 'TICKET_ACCEPTED' : 'TICKET_REJECTED',
          message:
            action === 'ACCEPT'
              ? `Your ticket ${existing.ticketNumber} has been accepted by an administrator.`
              : `Your ticket ${existing.ticketNumber} has been rejected: ${reason}`,
        });

        return {
          id: existing.id.toString(),
          ticketNumber: existing.ticketNumber,
          statusId: newStatusId,
          status: newStatusName,
          rejectionReason:
            action === 'REJECT' ? reason : null,
        };
      },
    );

    return {
      message:
        action === 'ACCEPT'
          ? 'Ticket accepted successfully'
          : 'Ticket rejected successfully',
      data: result,
    };
  }
}