import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CategoriesService } from './categories.service.js';

@Controller('api/v1/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':categoryId/subcategories')
  findSubcategories(
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.findSubcategories(categoryId);
  }
}