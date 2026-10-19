import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CommentsService } from './comments.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: number;
  };
}

/**
 * Ticket conversation endpoints.
 *
 * Access is enforced in the service layer: regular users are limited to
 * tickets they own, admins can access every ticket.
 */
@Controller('api/v1/tickets/:ticketId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(
    @Param('ticketId') ticketId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.commentsService.listComments(ticketId, request.user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('ticketId') ticketId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.addComment(ticketId, request.user, dto);
  }
}
