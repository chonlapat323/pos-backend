import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { shopId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
  }

  async findOne(shopId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({ where: { id, shopId } });
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
