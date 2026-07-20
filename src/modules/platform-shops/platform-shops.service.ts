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
import { GrantShopSubscriptionDto } from './dto/grant-shop-subscription.dto';
import { DashboardPeriod, QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryPlatformShopDto } from './dto/query-shop.dto';
import { UpdateShopSlugDto } from './dto/update-shop-slug.dto';
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

function sinceForPeriod(
  period: DashboardPeriod | undefined,
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

// Immediately-preceding period of equal length, for the revenue-delta comparison. 'all' has no
// meaningful "period before all time", so it returns undefined (delta is omitted in that case).
function previousRangeForPeriod(
  period: DashboardPeriod | undefined,
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

const THAI_DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']; // indexed by Date#getDay()
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

// Buckets revenue in JS after fetching matching bills, same style as the existing JS-side reduce
// in reports.service.ts's topServices() - data volumes here are small enough that a raw SQL
// GROUP BY isn't worth the added complexity.
function bucketRevenue(
  bills: { createdAt: Date; total: unknown }[],
  period: DashboardPeriod | undefined,
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

  // month: weekly buckets counted from the 1st (a 28-31 day month is always 4-5 buckets)
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

// Member.birthday stores an arbitrary year, so "within N days" means comparing month+day of the
// *next* occurrence (this year if it hasn't passed yet, otherwise next year) - a plain date-range
// query can't express that directly.
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

// Groups individual before/after rows into pairs for display. Grouped by billId when present
// (exact); most existing rows still have billId: null (POS doesn't attach photos to a bill yet),
// so those fall back to grouping by (memberId, same calendar day) as a pragmatic heuristic.
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
      const trialPackage = await tx.package.findUniqueOrThrow({
        where: { code: 'TRIAL_60' },
      });
      const trialEndsAt = new Date(
        Date.now() + trialPackage.durationDays * 24 * 60 * 60 * 1000,
      );

      const shop = await tx.shop.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          shopType: dto.shopType,
          address: dto.address,
          phone: dto.phone,
          subscriptionStatus: 'TRIALING',
          subscriptionEndsAt: trialEndsAt,
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

      await tx.shopSubscription.create({
        data: {
          shopId: shop.id,
          packageId: trialPackage.id,
          status: 'TRIALING',
          startAt: new Date(),
          endAt: trialEndsAt,
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
      data: {
        isActive: dto.isActive,
        suspendReason: dto.isActive ? null : 'MANUAL',
      },
    });
  }

  async updateSlug(id: string, dto: UpdateShopSlugDto) {
    await this.assertExists(id);

    const existingSlug = await this.prisma.shop.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug && existingSlug.id !== id) {
      throw new ConflictException('Shop slug already in use');
    }

    return this.prisma.shop.update({
      where: { id },
      data: { slug: dto.slug },
    });
  }

  async getSubscription(id: string) {
    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id },
      select: {
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        isActive: true,
      },
    });
    const [history, purchasablePackages] = await Promise.all([
      this.prisma.shopSubscription.findMany({
        where: { shopId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          package: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.package.findMany({
        where: { isTrial: false },
        orderBy: { durationDays: 'asc' },
      }),
    ]);

    return {
      subscriptionStatus: shop.subscriptionStatus,
      subscriptionEndsAt: shop.subscriptionEndsAt,
      isActive: shop.isActive,
      currentPackage: history[0]?.package ?? null,
      history,
      purchasablePackages,
    };
  }

  async grantSubscription(id: string, dto: GrantShopSubscriptionDto) {
    await this.assertExists(id);
    const pkg = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    const endAt = new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.shopSubscription.create({
        data: {
          shopId: id,
          packageId: pkg.id,
          status: 'ACTIVE',
          startAt: new Date(),
          endAt,
        },
      });
      await tx.subscriptionPayment.create({
        data: {
          shopSubscriptionId: subscription.id,
          amountThb: pkg.priceThb,
          status: 'PAID',
          paidAt: new Date(),
        },
      });
      return tx.shop.update({
        where: { id },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionEndsAt: endAt,
          isActive: true,
          suspendReason: null,
        },
      });
    });
  }

  async dashboard(query: QueryDashboardDto) {
    const now = new Date();
    const shopWhere = query.shopId ? { id: query.shopId } : {};
    const memberWhere = query.shopId ? { shopId: query.shopId } : {};
    const staffWhere = query.shopId ? { shopId: query.shopId } : {};
    const since = sinceForPeriod(query.period, now);
    const billWhere = {
      status: 'PAID' as const,
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    const prevRange = previousRangeForPeriod(query.period, now);
    // "New members" is always "this calendar month", independent of the selected revenue period -
    // matches the mockup, which hardcodes the "เดือนนี้" label regardless of period.
    const monthStart = startOfMonth(now);

    const [
      totalShops,
      activeShops,
      totalMembers,
      newMembersCount,
      totalStaff,
      revenue,
      prevRevenue,
      revenueBills,
      topServiceItems,
      staffGrouped,
      newMembers,
      birthdayCandidates,
      visitPhotoRows,
    ] = await Promise.all([
      this.prisma.shop.count({ where: shopWhere }),
      this.prisma.shop.count({ where: { ...shopWhere, isActive: true } }),
      this.prisma.member.count({ where: memberWhere }),
      this.prisma.member.count({
        where: { ...memberWhere, createdAt: { gte: monthStart } },
      }),
      this.prisma.staffUser.count({ where: staffWhere }),
      this.prisma.bill.aggregate({ where: billWhere, _sum: { total: true } }),
      prevRange
        ? this.prisma.bill.aggregate({
            where: {
              status: 'PAID',
              ...(query.shopId ? { shopId: query.shopId } : {}),
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
          serviceId: true,
          quantity: true,
          priceAtSale: true,
          service: { select: { name: true } },
        },
      }),
      this.prisma.bill.groupBy({
        by: ['staffId'],
        where: billWhere,
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.member.findMany({
        where: memberWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
          shop: { select: { name: true } },
        },
      }),
      this.prisma.member.findMany({
        where: { ...memberWhere, birthday: { not: null } },
        select: {
          id: true,
          name: true,
          birthday: true,
          pointBalance: true,
          shop: { select: { name: true } },
        },
      }),
      this.prisma.visitPhoto.findMany({
        where: query.shopId ? { shopId: query.shopId } : {},
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

    const totalsByService = new Map<
      string,
      { name: string; totalQuantity: number; totalRevenue: number }
    >();
    for (const item of topServiceItems) {
      const existing = totalsByService.get(item.serviceId) ?? {
        name: item.service.name,
        totalQuantity: 0,
        totalRevenue: 0,
      };
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += Number(item.priceAtSale) * item.quantity;
      totalsByService.set(item.serviceId, existing);
    }
    const topServices = Array.from(totalsByService.entries())
      .map(([serviceId, totals]) => ({ serviceId, ...totals }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    const staffUsers = await this.prisma.staffUser.findMany({
      where: { id: { in: staffGrouped.map((g) => g.staffId) } },
      select: { id: true, name: true, shop: { select: { name: true } } },
    });
    const staffById = new Map(staffUsers.map((s) => [s.id, s]));
    const staffSales = staffGrouped.map((g) => ({
      staffId: g.staffId,
      name: staffById.get(g.staffId)?.name ?? 'Unknown',
      shopName: staffById.get(g.staffId)?.shop.name ?? '',
      totalSales: Number(g._sum.total ?? 0),
      billCount: g._count.id,
    }));

    let revenueByShop: { name: string; revenue: number }[] | null = null;
    if (!query.shopId) {
      const shopRevenueGrouped = await this.prisma.bill.groupBy({
        by: ['shopId'],
        where: billWhere,
        _sum: { total: true },
      });
      const shops = await this.prisma.shop.findMany({
        where: { id: { in: shopRevenueGrouped.map((g) => g.shopId) } },
        select: { id: true, name: true },
      });
      const shopsById = new Map(shops.map((s) => [s.id, s.name]));
      const sorted = shopRevenueGrouped
        .map((g) => ({
          name: shopsById.get(g.shopId) ?? 'Unknown',
          revenue: Number(g._sum.total ?? 0),
        }))
        .sort((a, b) => b.revenue - a.revenue);
      const top = sorted.slice(0, 5);
      const rest = sorted.slice(5);
      revenueByShop = rest.length
        ? [
            ...top,
            {
              name: `อื่นๆ (${rest.length} ร้าน)`,
              revenue: rest.reduce((sum, s) => sum + s.revenue, 0),
            },
          ]
        : top;
    }

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
          shopName: m.shop.name,
          pointBalance: m.pointBalance,
          date: `${target.getDate()} ${THAI_MONTH_LABELS[target.getMonth()]}`,
        };
      });

    const recentVisitPhotos = groupVisitPhotos(visitPhotoRows, 3);

    return {
      totalShops,
      activeShops,
      suspendedShops: totalShops - activeShops,
      totalMembers,
      newMembersCount,
      totalStaff,
      revenue: currentTotal,
      revenueDelta,
      revenueSeries: bucketRevenue(revenueBills, query.period, now),
      revenueByShop,
      topServices,
      staffSales,
      newMembers: newMembers.map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        shopName: m.shop.name,
        createdAt: m.createdAt,
      })),
      birthdays,
      recentVisitPhotos,
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
