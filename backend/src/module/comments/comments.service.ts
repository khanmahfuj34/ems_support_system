import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UserRoleId } from '../../common/decorators/roles.decorator.js';

interface CommentUser {
  id: string;
  roleId: number;
}

type AccessibleTicket = {
  id: bigint;
  userId: bigint;
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a ticket only when the authenticated user is allowed to see it:
   * regular users are limited to their own tickets, admins can access all.
   */
  private async getAccessibleTicket(
    ticketId: string,
    user: CommentUser,
  ): Promise<AccessibleTicket> {
    if (!/^[1-9]\d*$/.test(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    if (!/^[1-9]\d*$/.test(user.id)) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(ticketId) },
      select: { id: true, userId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (user.roleId !== UserRoleId.ADMIN && ticket.userId !== BigInt(user.id)) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  /**
   * Lists the ticket conversation chronologically (oldest first).
   */
  async listComments(ticketId: string, user: CommentUser) {
    const ticket = await this.getAccessibleTicket(ticketId, user);

    const comments = await this.prisma.ticketComment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        ticketId: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, roleId: true },
        },
      },
    });

    return {
      message: 'Comments retrieved successfully',
      data: comments.map((comment) => ({
        ...comment,
        id: comment.id.toString(),
        ticketId: comment.ticketId.toString(),
        user: {
          ...comment.user,
          id: comment.user.id.toString(),
        },
      })),
    };
  }

  /**
   * Adds a comment to a ticket the subscriber is authorized to reach and
   * records the COMMENT_ADDED activity, atomically together with the comment.
   */
  async addComment(ticketId: string, user: CommentUser, dto: CreateCommentDto) {
    const ticket = await this.getAccessibleTicket(ticketId, user);

    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Comment content must not be empty');
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticketId: ticket.id,
          userId: BigInt(user.id),
          content,
        },
        select: {
          id: true,
          ticketId: true,
          content: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, roleId: true },
          },
        },
      });

      await tx.ticketActivityLog.create({
        data: {
          ticketId: ticket.id,
          actorId: BigInt(user.id),
          action: 'COMMENT_ADDED',
          newValue: { commentId: comment.id.toString() },
        },
      });

      return {
        message: 'Comment added successfully',
        data: {
          ...comment,
          id: comment.id.toString(),
          ticketId: comment.ticketId.toString(),
          user: {
            ...comment.user,
            id: comment.user.id.toString(),
          },
        },
      };
    });
  }
}
