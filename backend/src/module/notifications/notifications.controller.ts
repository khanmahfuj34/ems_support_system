import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: number;
  };
}

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * GET /api/v1/notifications?page=1&limit=10
   * Optional: &unreadOnly=true
   */
  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listForUser(
      request.user.id,
      query,
    );
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(
      request.user.id,
    );
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(
      request.user.id,
      id,
    );
  }
}