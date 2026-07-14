import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(shopId: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = startOfMonth(now);

    const [
      revenueToday,
      revenueWeek,
      revenueMonth,
      billsToday,
      newMembersThisMonth,
      memberPointSum,
    ] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { shopId, status: 'PAID', createdAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      this.prisma.bill.aggregate({
        where: { shopId, status: 'PAID', createdAt: { gte: weekStart } },
        _sum: { total: true },
      }),
      this.prisma.bill.aggregate({
        where: { shopId, status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      this.prisma.bill.count({
        where: { shopId, status: 'PAID', createdAt: { gte: todayStart } },
      }),
      this.prisma.member.count({
        where: { shopId, createdAt: { gte: monthStart } },
      }),
      this.prisma.member.aggregate({
        where: { shopId },
        _sum: { pointBalance: true },
      }),
    ]);

    return {
      revenueToday: Number(revenueToday._sum.total ?? 0),
      revenueWeek: Number(revenueWeek._sum.total ?? 0),
      revenueMonth: Number(revenueMonth._sum.total ?? 0),
      billsToday,
      newMembersThisMonth,
      totalPointsInSystem: memberPointSum._sum.pointBalance ?? 0,
    };
  }

  async topServices(shopId: string, limit = 10) {
    const items = await this.prisma.billItem.findMany({
      where: { bill: { shopId, status: 'PAID' } },
      select: {
        serviceId: true,
        quantity: true,
        priceAtSale: true,
        service: { select: { name: true } },
      },
    });

    const totalsByService = new Map<
      string,
      { name: string; totalQuantity: number; totalRevenue: number }
    >();
    for (const item of items) {
      const existing = totalsByService.get(item.serviceId) ?? {
        name: item.service.name,
        totalQuantity: 0,
        totalRevenue: 0,
      };
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += Number(item.priceAtSale) * item.quantity;
      totalsByService.set(item.serviceId, existing);
    }

    return Array.from(totalsByService.entries())
      .map(([serviceId, totals]) => ({ serviceId, ...totals }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }

  async staffSales(shopId: string) {
    const grouped = await this.prisma.bill.groupBy({
      by: ['staffId'],
      where: { shopId, status: 'PAID' },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    const staff = await this.prisma.staffUser.findMany({
      where: { id: { in: grouped.map((g) => g.staffId) } },
    });
    const staffById = new Map(staff.map((s) => [s.id, s]));

    return grouped.map((g) => ({
      staffId: g.staffId,
      name: staffById.get(g.staffId)?.name ?? 'Unknown',
      totalSales: Number(g._sum.total ?? 0),
      billCount: g._count.id,
    }));
  }
}
