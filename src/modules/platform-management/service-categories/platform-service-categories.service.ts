import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateServiceCategoryDto } from '../../service-categories/dto/update-service-category.dto';
import { CreatePlatformServiceCategoryDto } from './dto/create-platform-service-category.dto';
import { QueryPlatformServiceCategoryDto } from './dto/query-platform-service-category.dto';

@Injectable()
export class PlatformServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPlatformServiceCategoryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        where,
        include: {
          shop: { select: { id: true, name: true } },
          _count: { select: { services: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreatePlatformServiceCategoryDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const { shopId, ...rest } = dto;
    return this.prisma.serviceCategory.create({
      data: { ...rest, shopId },
    });
  }

  async update(id: string, dto: UpdateServiceCategoryDto) {
    await this.assertExists(id);
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.serviceCategory.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Service category not found');
  }
}
