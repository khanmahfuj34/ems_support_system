import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminController } from './admin.controller.js';
@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}