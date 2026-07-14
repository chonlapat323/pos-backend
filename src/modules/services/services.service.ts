import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: string) {
    return this.prisma.service.findMany({
      where: { shopId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
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
