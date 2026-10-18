import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CategoriesController } from './categories.controller.js';

@Module({
  providers: [CategoriesService, PrismaService],
  exports: [CategoriesService],
  controllers: [CategoriesController]
})
export class CategoriesModule {}
