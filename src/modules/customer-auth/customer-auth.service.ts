import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerLoginDto } from './dto/login.dto';
import { CustomerRegisterDto } from './dto/register.dto';
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
      name: member.name,
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

  async register(dto: CustomerRegisterDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug: dto.shopSlug, isActive: true },
      select: { id: true, name: true, signupBonusPoints: true },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const existing = await this.prisma.member.findUnique({
      where: { shopId_phone: { shopId: shop.id, phone: dto.phone } },
    });
    if (existing) {
      throw new ConflictException(
        'เบอร์นี้เป็นสมาชิกอยู่แล้ว กรุณาเข้าสู่ระบบแทน',
      );
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          shopId: shop.id,
          phone: dto.phone,
          name: dto.name,
          birthday: dto.birthday ? new Date(dto.birthday) : undefined,
          address: dto.address,
          note: dto.note,
          pointBalance: shop.signupBonusPoints,
        },
      });

      if (shop.signupBonusPoints > 0) {
        await tx.pointTransaction.create({
          data: {
            shopId: shop.id,
            memberId: created.id,
            type: 'EARN',
            points: shop.signupBonusPoints,
            note: 'โบนัสสมัครสมาชิกใหม่',
          },
        });
      }

      return created;
    });

    const payload: CustomerJwtPayload = {
      sub: member.id,
      shopId: shop.id,
      name: member.name,
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
