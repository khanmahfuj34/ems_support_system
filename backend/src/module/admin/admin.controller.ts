import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  Roles,
  UserRoleId,
} from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('test')
  @Roles(UserRoleId.ADMIN)
  getAdminTest() {
    return {
      message: 'Admin authorization successful',
    };
  }
}