import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './module/auth/auth.module.js';
import { UsersModule } from './module/users/users.module.js';
import { TicketsModule } from './module/tickets/tickets.module.js';
import { DepartmentsModule } from './module/departments/departments.module.js';
import { CategoriesModule } from './module/categories/categories.module.js';
import { CommentsModule } from './module/comments/comments.module.js';
import { PrismaService } from './database/prisma/prisma.service.js';
import { PrismaModule } from './database/prisma/prisma.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    AuthModule,
    UsersModule,
    TicketsModule,
    DepartmentsModule,
    CategoriesModule,
    CommentsModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
