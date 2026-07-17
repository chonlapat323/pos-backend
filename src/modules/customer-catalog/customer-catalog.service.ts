import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(slug: string): Promise<string> {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop.id;
  }

  async getShop(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, isActive: true },
      select: {
        name: true,
        logoUrl: true,
        openTime: true,
        closeTime: true,
        bahtPerPoint: true,
        signupBonusPoints: true,
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async getCategories(slug: string) {
    const shopId = await this.resolveShopId(slug);
    return this.prisma.serviceCategory.findMany({
      where: { shopId, isHidden: false },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, imageUrl: true },
    });
  }

  async getServices(slug: string, categoryId?: string) {
    const shopId = await this.resolveShopId(slug);
    return this.prisma.service.findMany({
      where: {
        shopId,
        status: { in: ['ACTIVE', 'PROMOTION'] },
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMinutes: true,
        imageUrl: true,
        status: true,
        categoryId: true,
      },
    });
  }
}
