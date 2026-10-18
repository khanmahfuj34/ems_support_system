import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RejectTicketDto } from './dto/reject-ticket.dto.js';

const PENDING_REVIEW = 2;
const ACCEPTED = 3;
const REJECTED = 8;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async acceptTicket(ticketId: string, adminId: string) {
    return this.reviewTicket(ticketId, adminId, 'ACCEPT');
  }

  async rejectTicket(
    ticketId: string,
    adminId: string,
    dto: RejectTicketDto,
  ) {
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.reviewTicket(ticketId, adminId, 'REJECT', reason);
  }

  private async reviewTicket(
    ticketId: string,
    adminId: string,
    action: 'ACCEPT' | 'REJECT',
    reason?: string,
  ) {
    if (!/^[1-9]\d*$/.test(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    if (!/^[1-9]\d*$/.test(adminId)) {
      throw new BadRequestException('Invalid admin ID');
    }

    const id = BigInt(ticketId);
    const actorId = BigInt(adminId);

    const newStatusId = action === 'ACCEPT' ? ACCEPTED : REJECTED;
    const newStatusName = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    const result = await this.prisma.$transaction(async (tx) => {
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

      if (existing.statusId !== PENDING_REVIEW) {
        throw new ConflictException(
          'Only tickets pending review can be accepted or rejected',
        );
      }

      // Update conditionally to prevent concurrent review of the same ticket.
      const updated = await tx.ticket.updateMany({
        where: {
          id,
          statusId: PENDING_REVIEW,
        },
        data: {
          statusId: newStatusId,
          rejectionReason: action === 'REJECT' ? reason : null,
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
          oldStatusId: PENDING_REVIEW,
          newStatusId,
          reason:
            action === 'REJECT'
              ? reason
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
            statusId: PENDING_REVIEW,
            status: 'PENDING_REVIEW',
          },
          newValue: {
            statusId: newStatusId,
            status: newStatusName,
            ...(reason ? { rejectionReason: reason } : {}),
          },
          metadata: {
            ticketNumber: existing.ticketNumber,
          },
        },
      });

      return {
        id: existing.id.toString(),
        ticketNumber: existing.ticketNumber,
        statusId: newStatusId,
        status: newStatusName,
        rejectionReason: action === 'REJECT' ? reason : null,
      };
    });

    return {
      message:
        action === 'ACCEPT'
          ? 'Ticket accepted successfully'
          : 'Ticket rejected successfully',
      data: result,
    };
  }
}
