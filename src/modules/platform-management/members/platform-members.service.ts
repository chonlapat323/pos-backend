import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMemberDto } from '../../members/dto/update-member.dto';
import { CreatePlatformMemberDto } from './dto/create-platform-member.dto';
import { QueryPlatformMemberDto } from './dto/query-platform-member.dto';

@Injectable()
export class PlatformMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPlatformMemberDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.search
        ? {
            OR: [
              { phone: { contains: query.search } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: { shop: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreatePlatformMemberDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const existing = await this.prisma.member.findUnique({
      where: { shopId_phone: { shopId: dto.shopId, phone: dto.phone } },
    });
    if (existing) {
      throw new ConflictException(
        'Member with this phone already exists in this shop',
      );
    }

    const { shopId, ...rest } = dto;
    return this.prisma.member.create({
      data: {
        ...rest,
        shopId,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateMemberDto) {
    await this.assertExists(id);
    return this.prisma.member.update({
      where: { id },
      data: {
        ...dto,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.member.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Member not found');
  }
}
