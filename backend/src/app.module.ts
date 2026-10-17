import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { AuthModule } from './module/auth/auth.module.js';
import { UsersModule } from './module/users/users.module.js';
import { TicketsModule } from './module/tickets/tickets.module.js';
import { DepartmentsModule } from './module/departments/departments.module.js';
import { CategoriesModule } from './module/categories/categories.module.js';
import { CommentsModule } from './module/comments/comments.module.js';

import { PrismaModule } from './database/prisma/prisma.module.js';
import { AdminController } from './module/admin/admin.controller.js';
import { AdminModule } from './module/admin/admin.module.js';

export const { ObserveModule, ObserveInstrument } =
  createObserveModule();

const observeEnabled =
  process.env.OBSERVE_ENABLED !== 'false' &&
  Boolean(process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ...(observeEnabled
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY!,
            appSecret: process.env.OBSERVE_APP_SECRET!,
            serviceId: 'backend',
          }),
        ]
      : []),

    PrismaModule,

    AuthModule,
    UsersModule,
    TicketsModule,
    DepartmentsModule,
    CategoriesModule,
    CommentsModule,
    AdminModule,
  ],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule {}

export { observeEnabled as ObserveEnabled };
