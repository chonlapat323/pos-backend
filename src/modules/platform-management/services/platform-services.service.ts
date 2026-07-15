import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateServiceDto } from '../../services/dto/update-service.dto';
import { CreatePlatformServiceDto } from './dto/create-platform-service.dto';
import { QueryPlatformServiceDto } from './dto/query-platform-service.dto';

@Injectable()
export class PlatformServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPlatformServiceDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: {
          shop: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreatePlatformServiceDto) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
      select: { shopId: true },
    });
    if (!category) throw new NotFoundException('Service category not found');
    if (category.shopId !== dto.shopId) {
      throw new BadRequestException(
        'Service category does not belong to the selected shop',
      );
    }

    const { shopId, ...rest } = dto;
    return this.prisma.service.create({ data: { ...rest, shopId } });
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.assertExists(id);

    if (dto.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: dto.categoryId },
        select: { shopId: true },
      });
      if (!category) throw new NotFoundException('Service category not found');
      if (category.shopId !== service.shopId) {
        throw new BadRequestException(
          'Service category does not belong to this service\'s shop',
        );
      }
    }

    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.service.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { id: true, shopId: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }
}
