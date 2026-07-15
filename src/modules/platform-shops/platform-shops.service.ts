import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { UpdateShopDto } from '../shop/dto/update-shop.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformShopDto } from './dto/create-shop.dto';
import { DashboardPeriod, QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryPlatformShopDto } from './dto/query-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const diff = (day.getDay() + 6) % 7; // Monday as start of week
  day.setDate(day.getDate() - diff);
  return day;
}

function sinceForPeriod(period: DashboardPeriod | undefined, now: Date): Date | undefined {
  switch (period) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now);
    case 'all':
      return undefined;
    default:
      return startOfMonth(now);
  }
}

@Injectable()
export class PlatformShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryPlatformShopDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        include: { _count: { select: { members: true, staff: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  findAllForSelect() {
    return this.prisma.shop.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isActive: true },
    });
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, staff: true, services: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const revenueThisMonth = await this.prisma.bill.aggregate({
      where: {
        shopId: id,
        status: 'PAID',
        createdAt: { gte: startOfMonth(new Date()) },
      },
      _sum: { total: true },
    });

    return {
      ...shop,
      revenueThisMonth: Number(revenueThisMonth._sum.total ?? 0),
    };
  }

  async create(dto: CreatePlatformShopDto) {
    const existingSlug = await this.prisma.shop.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) throw new ConflictException('Shop slug already in use');

    const existingOwnerEmail = await this.prisma.staffUser.findUnique({
      where: { email: dto.ownerEmail },
    });
    if (existingOwnerEmail)
      throw new ConflictException('Owner email already in use');

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          shopType: dto.shopType,
          address: dto.address,
          phone: dto.phone,
        },
      });

      await tx.staffUser.create({
        data: {
          shopId: shop.id,
          name: dto.ownerName,
          email: dto.ownerEmail,
          passwordHash,
          role: 'OWNER',
        },
      });

      return shop;
    });
  }

  async update(id: string, dto: UpdateShopDto) {
    await this.assertExists(id);
    return this.prisma.shop.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, dto: UpdateShopStatusDto) {
    await this.assertExists(id);
    return this.prisma.shop.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }

  async dashboard(query: QueryDashboardDto) {
    const shopWhere = query.shopId ? { id: query.shopId } : {};
    const memberWhere = query.shopId ? { shopId: query.shopId } : {};
    const staffWhere = query.shopId ? { shopId: query.shopId } : {};
    const since = sinceForPeriod(query.period, new Date());
    const billWhere = {
      status: 'PAID' as const,
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    const [totalShops, activeShops, totalMembers, totalStaff, revenue] =
      await Promise.all([
        this.prisma.shop.count({ where: shopWhere }),
        this.prisma.shop.count({ where: { ...shopWhere, isActive: true } }),
        this.prisma.member.count({ where: memberWhere }),
        this.prisma.staffUser.count({ where: staffWhere }),
        this.prisma.bill.aggregate({ where: billWhere, _sum: { total: true } }),
      ]);

    return {
      totalShops,
      activeShops,
      suspendedShops: totalShops - activeShops,
      totalMembers,
      totalStaff,
      revenue: Number(revenue._sum.total ?? 0),
      period: query.period ?? 'month',
    };
  }

  private async assertExists(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
  }
}
