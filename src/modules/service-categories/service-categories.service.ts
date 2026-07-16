import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { QueryServiceCategoryDto } from './dto/query-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    shopId: string,
    query: QueryServiceCategoryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      shopId,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { services: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  findAllForSelect(shopId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { shopId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, imageUrl: true },
    });
  }

  async findOne(shopId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, shopId },
    });
    if (!category) throw new NotFoundException('Service category not found');
    return category;
  }

  create(shopId: string, dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({ data: { ...dto, shopId } });
  }

  async update(shopId: string, id: string, dto: UpdateServiceCategoryDto) {
    await this.findOne(shopId, id);
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }

  async remove(shopId: string, id: string) {
    await this.findOne(shopId, id);
    await this.prisma.serviceCategory.delete({ where: { id } });
    return { success: true };
  }
}
