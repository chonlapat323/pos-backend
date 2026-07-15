import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateStaffDto } from '../../staff/dto/update-staff.dto';
import { CreatePlatformStaffDto } from './dto/create-platform-staff.dto';
import { QueryPlatformStaffDto } from './dto/query-platform-staff.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  shop: { select: { id: true, name: true } },
};

@Injectable()
export class PlatformStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPlatformStaffDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.staffUser.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.staffUser.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(dto: CreatePlatformStaffDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const existing = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password: _password, shopId, ...rest } = dto;
    return this.prisma.staffUser.create({
      data: { ...rest, shopId, passwordHash },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.assertExists(id);
    const { password, ...rest } = dto;
    return this.prisma.staffUser.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.staffUser.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
  }
}
