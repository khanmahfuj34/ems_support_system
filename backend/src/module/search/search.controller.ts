import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  Roles,
  UserRoleId,
} from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GlobalSearchService } from './global-search/global-search.service.js';
import { UserSearchService } from './user-search/user-search.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: number;
  };
}

@Controller('api/v1/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleId.ADMIN)
export class SearchController {
  constructor(
    private readonly users: UserSearchService,
    private readonly globalSearch: GlobalSearchService,
  ) {}

  @Get('users')
  searchUsers(
    @Req() request: AuthenticatedRequest,
    @Query('search') search = '',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.users.searchUsers(
      { id: request.user.id, roleId: request.user.roleId },
      {
        search,
        limit: limit ? Number(limit) : undefined,
        cursor,
      },
    );
  }

  @Get('users/:id')
  getUserProfile(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.users.getProfile(
      { id: request.user.id, roleId: request.user.roleId },
      id,
    );
  }

  @Get('users/:id/tickets')
  getUserTickets(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.users.listTickets(
      { id: request.user.id, roleId: request.user.roleId },
      id,
      {
        limit: limit ? Number(limit) : undefined,
        cursor,
        sortOrder,
      },
    );
  }

  @Get('global')
  global(
    @Req() request: AuthenticatedRequest,
    @Query('q') query = '',
    @Query('limit') limit?: string,
  ) {
    return this.globalSearch.search(
      { id: request.user.id, roleId: request.user.roleId },
      query,
      limit ? Number(limit) : undefined,
    );
  }
}
