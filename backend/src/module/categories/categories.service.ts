import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all active categories ordered by sort order and name.
   */
  async findAll() {
    const categories = await this.prisma.ticketCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: categories.map((category) => ({
        ...category,
        id: category.id.toString(),
      })),
    };
  }

  /**
   * Returns active subcategories for an active category.
   */
  async findSubcategories(categoryId: string) {
    if (!/^[1-9]\d*$/.test(categoryId)) {
      throw new BadRequestException('Invalid category ID.');
    }

    const id = BigInt(categoryId);

    const category = await this.prisma.ticketCategory.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    const subcategories = await this.prisma.ticketSubCategory.findMany({
      where: {
        categoryId: id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: subcategories.map((subcategory) => ({
        ...subcategory,
        id: subcategory.id.toString(),
      })),
    };
  }
}