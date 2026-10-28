import {
  Body,
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
import {
  Roles,
  UserRoleId,
} from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminService } from './admin.service.js';
import { RejectTicketDto } from './dto/reject-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { SearchUsersQueryDto } from './dto/search-users-query.dto.js';
import { UserTicketsQueryDto } from './dto/user-tickets-query.dto.js';
import { UserSearchService } from '../search/user-search/user-search.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: number;
  };
}

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleId.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userSearch: UserSearchService,
  ) {}

  @Get('test')
  getAdminTest() {
    return {
      message: 'Admin authorization successful',
    };
  }

  @Get('users')
  searchUsers(
    @Req() request: AuthenticatedRequest,
    @Query() query: SearchUsersQueryDto,
  ) {
    return this.userSearch.searchUsers(request.user, query);
  }

  @Get('users/:id')
  getUserProfile(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userSearch.getProfile(request.user, id);
  }

  @Get('users/:id/tickets')
  listUserTickets(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: UserTicketsQueryDto,
  ) {
    return this.userSearch.listTickets(request.user, id, query);
  }

  @Patch('tickets/:id/accept')
  @HttpCode(HttpStatus.OK)
  acceptTicket(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.acceptTicket(id, request.user.id);
  }

  @Patch('tickets/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectTicket(
    @Param('id') id: string,
    @Body() dto: RejectTicketDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.rejectTicket(
      id,
      request.user.id,
      dto,
    );
  }

  @Patch('tickets/:id/status')
  @HttpCode(HttpStatus.OK)
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.updateTicketStatus(
      id,
      request.user.id,
      dto,
    );
  }
}
