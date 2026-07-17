import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QueryReportsDashboardDto,
  ReportsDashboardPeriod,
} from './dto/query-reports-dashboard.dto';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const diff = (day.getDay() + 6) % 7; // Monday as start of week
  day.setDate(day.getDate() - diff);
  return day;
}

function sinceForPeriod(
  period: ReportsDashboardPeriod | undefined,
  now: Date,
): Date | undefined {
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

// Immediately-preceding period of equal length, for the revenue-delta comparison - same approach
// as platform-shops.service.ts's dashboard() (duplicated rather than shared, matching this
// codebase's shop-vs-platform convention).
function previousRangeForPeriod(
  period: ReportsDashboardPeriod | undefined,
  now: Date,
): { since: Date; until: Date } | undefined {
  switch (period) {
    case 'today': {
      const until = startOfDay(now);
      const since = new Date(until);
      since.setDate(since.getDate() - 1);
      return { since, until };
    }
    case 'week': {
      const until = startOfWeek(now);
      const since = new Date(until);
      since.setDate(since.getDate() - 7);
      return { since, until };
    }
    case 'all':
      return undefined;
    default: {
      const until = startOfMonth(now);
      const since = new Date(until);
      since.setMonth(since.getMonth() - 1);
      return { since, until };
    }
  }
}

const THAI_DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const THAI_MONTH_LABELS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export interface RevenueBucket {
  label: string;
  value: number;
}

function bucketRevenue(
  bills: { createdAt: Date; total: unknown }[],
  period: ReportsDashboardPeriod | undefined,
  now: Date,
): RevenueBucket[] {
  const amountOf = (b: { total: unknown }) => Number(b.total);

  if (period === 'today') {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      label: `${h}:00`,
      value: 0,
    }));
    for (const bill of bills)
      buckets[bill.createdAt.getHours()].value += amountOf(bill);
    return buckets.slice(0, now.getHours() + 1);
  }

  if (period === 'week') {
    const start = startOfWeek(now);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { label: THAI_DAY_LABELS[d.getDay()], value: 0 };
    });
    for (const bill of bills) {
      const dayIndex = Math.floor(
        (startOfDay(bill.createdAt).getTime() - start.getTime()) / 86_400_000,
      );
      if (dayIndex >= 0 && dayIndex < 7)
        buckets[dayIndex].value += amountOf(bill);
    }
    return buckets;
  }

  if (period === 'all') {
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const meta = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return {
        label: THAI_MONTH_LABELS[d.getMonth()],
        value: 0,
        year: d.getFullYear(),
        month: d.getMonth(),
      };
    });
    for (const bill of bills) {
      const idx = meta.findIndex(
        (b) =>
          b.year === bill.createdAt.getFullYear() &&
          b.month === bill.createdAt.getMonth(),
      );
      if (idx >= 0) meta[idx].value += amountOf(bill);
    }
    return meta.map(({ label, value }) => ({ label, value }));
  }

  const start = startOfMonth(now);
  const daysInMonth = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    0,
  ).getDate();
  const buckets = Array.from(
    { length: Math.ceil(daysInMonth / 7) },
    (_, i) => ({
      label: `สัปดาห์ ${i + 1}`,
      value: 0,
    }),
  );
  for (const bill of bills) {
    if (
      bill.createdAt.getFullYear() !== start.getFullYear() ||
      bill.createdAt.getMonth() !== start.getMonth()
    ) {
      continue;
    }
    const idx = Math.floor((bill.createdAt.getDate() - 1) / 7);
    if (idx < buckets.length) buckets[idx].value += amountOf(bill);
  }
  return buckets;
}

function daysUntilNextBirthday(birthday: Date, now: Date): number {
  const today = startOfDay(now);
  let next = new Date(
    now.getFullYear(),
    birthday.getMonth(),
    birthday.getDate(),
  );
  if (next < today)
    next = new Date(
      now.getFullYear() + 1,
      birthday.getMonth(),
      birthday.getDate(),
    );
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

interface VisitPhotoRow {
  id: string;
  memberId: string;
  billId: string | null;
  type: 'BEFORE' | 'AFTER';
  imageUrl: string;
  createdAt: Date;
  member: { name: string };
  bill: { items: { service: { name: string } }[] } | null;
}

// See platform-shops.service.ts's groupVisitPhotos() for the grouping rationale (billId when
// present, else fall back to memberId + same calendar day).
function groupVisitPhotos(photos: VisitPhotoRow[], limit: number) {
  const groups = new Map<
    string,
    {
      member: string;
      service: string | null;
      when: Date;
      before?: string;
      after?: string;
    }
  >();
  for (const p of photos) {
    const dayKey = p.createdAt.toISOString().slice(0, 10);
    const key = p.billId ?? `${p.memberId}:${dayKey}`;
    const existing = groups.get(key);
    const group = existing ?? {
      member: p.member.name,
      service: p.bill?.items[0]?.service.name ?? null,
      when: p.createdAt,
    };
    if (p.type === 'BEFORE' && !group.before) group.before = p.imageUrl;
    if (p.type === 'AFTER' && !group.after) group.after = p.imageUrl;
    if (p.createdAt > group.when) group.when = p.createdAt;
    groups.set(key, group);
  }
  return Array.from(groups.values())
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, limit);
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

  async dashboard(shopId: string, query: QueryReportsDashboardDto) {
    const now = new Date();
    const since = sinceForPeriod(query.period, now);
    const billWhere = {
      shopId,
      status: 'PAID' as const,
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    const prevRange = previousRangeForPeriod(query.period, now);
    const monthStart = startOfMonth(now);

    const [
      revenue,
      prevRevenue,
      revenueBills,
      categoryItems,
      topServices,
      staffSales,
      newMembers,
      birthdayCandidates,
      visitPhotoRows,
      totalPointsInSystem,
    ] = await Promise.all([
      this.prisma.bill.aggregate({ where: billWhere, _sum: { total: true } }),
      prevRange
        ? this.prisma.bill.aggregate({
            where: {
              shopId,
              status: 'PAID',
              createdAt: { gte: prevRange.since, lt: prevRange.until },
            },
            _sum: { total: true },
          })
        : Promise.resolve(null),
      this.prisma.bill.findMany({
        where: billWhere,
        select: { createdAt: true, total: true },
      }),
      this.prisma.billItem.findMany({
        where: { bill: billWhere },
        select: {
          quantity: true,
          priceAtSale: true,
          service: {
            select: { category: { select: { id: true, name: true } } },
          },
        },
      }),
      this.topServices(shopId, 5),
      this.staffSales(shopId),
      this.prisma.member.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, phone: true, createdAt: true },
      }),
      this.prisma.member.findMany({
        where: { shopId, birthday: { not: null } },
        select: { id: true, name: true, birthday: true, pointBalance: true },
      }),
      this.prisma.visitPhoto.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          memberId: true,
          billId: true,
          type: true,
          imageUrl: true,
          createdAt: true,
          member: { select: { name: true } },
          bill: {
            select: {
              items: {
                select: { service: { select: { name: true } } },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.member.aggregate({
        where: { shopId },
        _sum: { pointBalance: true },
      }),
    ]);

    const currentTotal = Number(revenue._sum.total ?? 0);
    const prevTotal = prevRevenue ? Number(prevRevenue._sum.total ?? 0) : 0;
    const revenueDelta =
      prevRange && prevTotal > 0
        ? {
            percent:
              Math.round(((currentTotal - prevTotal) / prevTotal) * 1000) / 10,
            up: currentTotal >= prevTotal,
          }
        : null;

    const totalsByCategory = new Map<
      string,
      { name: string; revenue: number }
    >();
    for (const item of categoryItems) {
      const existing = totalsByCategory.get(item.service.category.id) ?? {
        name: item.service.category.name,
        revenue: 0,
      };
      existing.revenue += Number(item.priceAtSale) * item.quantity;
      totalsByCategory.set(item.service.category.id, existing);
    }
    const revenueByCategory = Array.from(totalsByCategory.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const birthdays = birthdayCandidates
      .map((m) => ({
        ...m,
        daysUntil: daysUntilNextBirthday(m.birthday as Date, now),
      }))
      .filter((m) => m.daysUntil >= 0 && m.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5)
      .map((m) => {
        const next = new Date(
          now.getFullYear(),
          (m.birthday as Date).getMonth(),
          (m.birthday as Date).getDate(),
        );
        const target =
          next < startOfDay(now)
            ? new Date(now.getFullYear() + 1, next.getMonth(), next.getDate())
            : next;
        return {
          name: m.name,
          pointBalance: m.pointBalance,
          date: `${target.getDate()} ${THAI_MONTH_LABELS[target.getMonth()]}`,
        };
      });

    const newMembersThisMonth = await this.prisma.member.count({
      where: { shopId, createdAt: { gte: monthStart } },
    });

    return {
      revenue: currentTotal,
      revenueDelta,
      revenueSeries: bucketRevenue(revenueBills, query.period, now),
      revenueByCategory,
      topServices,
      staffSales,
      newMembers,
      newMembersThisMonth,
      totalPointsInSystem: totalPointsInSystem._sum.pointBalance ?? 0,
      birthdays,
      recentVisitPhotos: groupVisitPhotos(visitPhotoRows, 3),
      period: query.period ?? 'month',
    };
  }
}
