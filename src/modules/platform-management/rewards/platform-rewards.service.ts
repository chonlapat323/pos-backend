import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRewardDto } from '../../rewards/dto/update-reward.dto';
import { CreatePlatformRewardDto } from './dto/create-platform-reward.dto';
import { QueryPlatformRewardDto } from './dto/query-platform-reward.dto';

@Injectable()
export class PlatformRewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPlatformRewardDto,
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
      this.prisma.reward.findMany({
        where,
        include: { shop: { select: { id: true, name: true } } },
        orderBy: { pointCost: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.reward.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreatePlatformRewardDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const { shopId, ...rest } = dto;
    return this.prisma.reward.create({ data: { ...rest, shopId } });
  }

  async update(id: string, dto: UpdateRewardDto) {
    await this.assertExists(id);
    return this.prisma.reward.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.reward.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!reward) throw new NotFoundException('Reward not found');
  }
}
