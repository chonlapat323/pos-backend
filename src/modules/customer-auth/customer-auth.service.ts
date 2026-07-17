import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerLoginDto } from './dto/login.dto';
import { CustomerJwtPayload } from './types';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: CustomerLoginDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug: dto.shopSlug, isActive: true },
      select: { id: true, name: true },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const member = await this.prisma.member.findUnique({
      where: { shopId_phone: { shopId: shop.id, phone: dto.phone } },
    });
    if (!member) {
      throw new NotFoundException(
        'ไม่พบคุณในระบบสมาชิก กรุณาติดต่อพนักงานหน้าร้าน',
      );
    }

    const payload: CustomerJwtPayload = {
      sub: member.id,
      shopId: shop.id,
      type: 'customer',
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      member: {
        id: member.id,
        name: member.name,
        pointBalance: member.pointBalance,
      },
    };
  }
}
