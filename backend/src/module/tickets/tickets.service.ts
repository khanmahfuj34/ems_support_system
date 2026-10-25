import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, Priority } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UserRoleId } from '../../common/decorators/roles.decorator.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto.js';
import {
  sanitizeTicketDescription,
  stripHtmlTags,
} from './utils/sanitize-html.js';

const TICKET_STATUS = {
  PENDING_REVIEW: 2,
} as const;

const SLA_STATUS = {
  ON_TRACK: 1,
} as const;

type TicketListUser = {
  id: string;
  roleId: number;
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a ticket and its initial history records atomically.
   *
   * The authenticated user ID must come from the validated JWT context,
   * never from the request body.
   */
  async create(userId: string, dto: CreateTicketDto) {
    if (!/^[1-9]\d*$/.test(userId)) {
      throw new BadRequestException('Invalid authenticated user ID');
    }

    const authenticatedUserId = BigInt(userId);
    const categoryId = BigInt(dto.categoryId);
    const subCategoryId = dto.subCategoryId
      ? BigInt(dto.subCategoryId)
      : null;

    const priority = dto.priority as Priority;
    const subject = dto.subject.trim();

    // PRD "Rich Text Security": rich text must be sanitized before storage.
    const description = sanitizeTicketDescription(dto.description.trim());

    if (!subject || !stripHtmlTags(description)) {
      throw new BadRequestException(
        'Subject and description must not be empty',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Confirm that the authenticated account is still active.
      const user = await tx.user.findUnique({
        where: { id: authenticatedUserId },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException('Active user account not found');
      }

      // Only active categories can receive new tickets.
      const category = await tx.ticketCategory.findFirst({
        where: {
          id: categoryId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException('Active category not found');
      }

      // A selected subcategory must belong to the selected category.
      if (subCategoryId !== null) {
        const subCategory = await tx.ticketSubCategory.findFirst({
          where: {
            id: subCategoryId,
            categoryId,
            isActive: true,
          },
          select: { id: true },
        });

        if (!subCategory) {
          throw new BadRequestException(
            'Subcategory is invalid, inactive, or does not belong to this category',
          );
        }
      }

      // Load the active SLA policy configured for the requested priority.
      const slaPolicy = await tx.slaPolicy.findFirst({
        where: {
          priority,
          isActive: true,
        },
        select: {
          id: true,
          firstResponseMinutes: true,
          resolutionMinutes: true,
        },
      });

      if (!slaPolicy) {
        throw new BadRequestException(
          'No active SLA policy is configured for this priority',
        );
      }

      // Ensure the required initial status exists in the lookup table.
      const initialStatus = await tx.ticketStatus.findUnique({
        where: { id: TICKET_STATUS.PENDING_REVIEW },
        select: { id: true },
      });

      if (!initialStatus) {
        throw new Error(
          'Ticket status configuration is missing: PENDING_REVIEW',
        );
      }

      const now = new Date();
      const firstResponseDueAt = new Date(
        now.getTime() + slaPolicy.firstResponseMinutes * 60_000,
      );
      const resolutionDueAt = new Date(
        now.getTime() + slaPolicy.resolutionMinutes * 60_000,
      );

      // 128 bits of entropy encoded as base64url keeps this unique reference
      // within the ticket_number VARCHAR(30) limit (26 characters total).
      const ticketNumber = `EMS-${randomBytes(16).toString('base64url')}`;

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          userId: authenticatedUserId,
          categoryId,
          subCategoryId,
          slaPolicyId: slaPolicy.id,
          subject,
          description,
          userPriority: priority,
          adminPriority: null,
          statusId: TICKET_STATUS.PENDING_REVIEW,
          slaStatus: SLA_STATUS.ON_TRACK,
          firstResponseDueAt,
          resolutionDueAt,
        },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          description: true,
          userPriority: true,
          statusId: true,
          slaStatus: true,
          firstResponseDueAt: true,
          resolutionDueAt: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          subCategory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Record the initial status transition as part of the same transaction.
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          changedBy: authenticatedUserId,
          oldStatusId: null,
          newStatusId: TICKET_STATUS.PENDING_REVIEW,
          reason: 'Ticket created by user',
        },
      });

      // Record the creation event for the ticket activity timeline.
      await tx.ticketActivityLog.create({
        data: {
          ticketId: ticket.id,
          actorId: authenticatedUserId,
          action: 'TICKET_CREATED',
          newValue: {
            ticketNumber: ticket.ticketNumber,
            statusId: TICKET_STATUS.PENDING_REVIEW,
            priority,
          },
        },
      });

      // Convert BigInt values before returning a JSON-serializable response.
      return {
        message: 'Ticket created successfully',
        data: {
          ...ticket,
          id: ticket.id.toString(),
          category: {
            ...ticket.category,
            id: ticket.category.id.toString(),
          },
          subCategory: ticket.subCategory
            ? {
                ...ticket.subCategory,
                id: ticket.subCategory.id.toString(),
              }
            : null,
        },
      };
    });
  }

  async list(user: TicketListUser, query: ListTicketsQueryDto) {
    if (!/^[1-9]\d*$/.test(user.id)) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    // Regular users can only access their own tickets.
    if (user.roleId !== UserRoleId.ADMIN) {
      where.userId = BigInt(user.id);
    }

    if (query.statusId !== undefined) {
      where.statusId = query.statusId;
    }

    if (query.categoryId !== undefined) {
      where.categoryId = BigInt(query.categoryId);
    }

    const andConditions: Prisma.TicketWhereInput[] = [];

    if (query.priority !== undefined) {
      // Filter by the effective priority selected by the admin, if present.
      andConditions.push({
        OR: [
          { adminPriority: query.priority },
          {
            adminPriority: null,
            userPriority: query.priority,
          },
        ],
      });
    }

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const searchConditions: Prisma.TicketWhereInput[] = [
        { subject: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { ticketNumber: { contains: searchTerm } },
        { category: { name: { contains: searchTerm } } },
        { subCategory: { name: { contains: searchTerm } } },
      ];

      // Support searching by numeric ticket ID if the search term is a valid positive integer
      if (/^[1-9]\d{0,18}$/.test(searchTerm)) {
        searchConditions.push({ id: BigInt(searchTerm) });
      }

      // Requester name and email search are available only for administrators
      if (Number(user.roleId) === UserRoleId.ADMIN) {
        searchConditions.push(
          { user: { name: { contains: searchTerm } } },
          { user: { email: { contains: searchTerm } } },
        );
      }

      andConditions.push({ OR: searchConditions });
    }

    if (andConditions.length === 1) {
      Object.assign(where, andConditions[0]);
    } else if (andConditions.length > 1) {
      where.AND = andConditions;
    }

    const orderBy: Prisma.TicketOrderByWithRelationInput = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: [
          orderBy,
          { id: 'desc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          description: true,
          userId: true,
          categoryId: true,
          subCategoryId: true,
          userPriority: true,
          adminPriority: true,
          statusId: true,
          slaStatus: true,
          firstResponseAt: true,
          firstResponseDueAt: true,
          resolutionDueAt: true,
          resolvedAt: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          subCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          status: {
            select: {
              id: true,
              name: true,
            },
          },
          slaPolicy: {
            select: {
              id: true,
              priority: true,
              firstResponseMinutes: true,
              resolutionMinutes: true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const data = tickets.map((ticket: {
      id: bigint;
      userId: bigint;
      categoryId: bigint;
      subCategoryId: bigint | null;
      category: { id: bigint; name: string } | null;
      subCategory: { id: bigint; name: string } | null;
      slaPolicy: {
        id: bigint;
        priority: Priority;
        firstResponseMinutes: number;
        resolutionMinutes: number;
      } | null;
    }) => ({
      ...ticket,
      id: ticket.id.toString(),
      userId: ticket.userId.toString(),
      categoryId: ticket.categoryId.toString(),
      subCategoryId: ticket.subCategoryId?.toString() ?? null,
      category: ticket.category
        ? {
            ...ticket.category,
            id: ticket.category.id.toString(),
          }
        : null,
      subCategory: ticket.subCategory
        ? {
            ...ticket.subCategory,
            id: ticket.subCategory.id.toString(),
          }
        : null,
      slaPolicy: ticket.slaPolicy
        ? {
            ...ticket.slaPolicy,
            id: ticket.slaPolicy.id.toString(),
          }
        : null,
    }));

    return {
      message: 'Tickets retrieved successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(ticketId: string, user: TicketListUser) {
    if (!/^[1-9]\d*$/.test(ticketId)) {
      throw new BadRequestException('Invalid ticket ID');
    }

    if (!/^[1-9]\d*$/.test(user.id)) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    const where: Prisma.TicketWhereInput = {
      id: BigInt(ticketId),
    };

    // Restrict regular users to their own tickets.
    if (Number(user.roleId) !== UserRoleId.ADMIN) {
      where.userId = BigInt(user.id);
    }

    const ticket = await this.prisma.ticket.findFirst({
      where,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        description: true,
        userId: true,
        categoryId: true,
        subCategoryId: true,
        userPriority: true,
        adminPriority: true,
        statusId: true,
        rejectionReason: true,
        resolutionSummary: true,
        slaStatus: true,
        firstResponseAt: true,
        firstResponseDueAt: true,
        resolutionDueAt: true,
        resolvedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        status: {
          select: {
            id: true,
            name: true,
          },
        },
        slaPolicy: {
          select: {
            id: true,
            priority: true,
            firstResponseMinutes: true,
            resolutionMinutes: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            oldStatusId: true,
            newStatusId: true,
            reason: true,
            createdAt: true,
            oldStatus: {
              select: { id: true, name: true },
            },
            newStatus: {
              select: { id: true, name: true },
            },
            actor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  roleId: true,
                },
              },
            },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Never include internal notes in this response.
    const data = {
      ...ticket,
      id: ticket.id.toString(),
      userId: ticket.userId.toString(),
      categoryId: ticket.categoryId.toString(),
      subCategoryId: ticket.subCategoryId?.toString() ?? null,
      category: ticket.category
        ? { ...ticket.category, id: ticket.category.id.toString() }
        : null,
      subCategory: ticket.subCategory
        ? { ...ticket.subCategory, id: ticket.subCategory.id.toString() }
        : null,
      slaPolicy: ticket.slaPolicy
        ? { ...ticket.slaPolicy, id: ticket.slaPolicy.id.toString() }
        : null,
      statusHistory: ticket.statusHistory.map((history) => ({
        ...history,
        id: history.id.toString(),
        oldStatusId: history.oldStatusId,
        newStatusId: history.newStatusId,
        actor: {
          ...history.actor,
          id: history.actor.id.toString(),
        },
      })),
      comments: ticket.comments.map((comment) => ({
        ...comment,
        id: comment.id.toString(),
        user: {
          ...comment.user,
          id: comment.user.id.toString(),
        },
      })),
      attachments: ticket.attachments.map((attachment) => ({
        ...attachment,
        id: attachment.id.toString(),
        fileSize: attachment.fileSize.toString(),
      })),
    };

    return {
      message: 'Ticket retrieved successfully',
      data,
    };
  }
}
