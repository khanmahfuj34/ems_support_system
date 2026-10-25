import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [AdminController],
  providers: [RolesGuard, AdminService],
})
export class AdminModule {}