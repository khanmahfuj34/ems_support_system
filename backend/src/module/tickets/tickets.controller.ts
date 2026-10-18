import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto.js';
import { TicketsService } from './tickets.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: number;
  };
}

@Controller('api/v1/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Creates a support ticket for the authenticated user.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(request.user.id, dto);
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.list(
      {
        id: request.user.id,
        roleId: request.user.roleId,
      },
      query,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ticketsService.getById(id, {
      id: request.user.id,
      roleId: request.user.roleId,
    });
  }
}
