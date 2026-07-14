import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  update(shopId: string, dto: UpdateShopDto) {
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }
}
