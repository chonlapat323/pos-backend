import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(shopId: string, query: QueryServiceDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      shopId,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.service.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(shopId: string, id: string) {
    const service = await this.prisma.service.findFirst({ where: { id, shopId }, include: { category: true } });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  create(shopId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({ data: { ...dto, shopId } });
  }

  async update(shopId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(shopId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(shopId: string, id: string) {
    await this.findOne(shopId, id);
    await this.prisma.service.delete({ where: { id } });
    return { success: true };
  }
}
