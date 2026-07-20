import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
      include: {
        shop: { select: { isActive: true, suspendReason: true } },
      },
    });

    if (!staff || !staff.passwordHash || !staff.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      staff.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const subscriptionExpired = !staff.shop.isActive && staff.shop.suspendReason === 'SUBSCRIPTION_EXPIRED';
    if (!staff.shop.isActive) {
      // An owner whose shop is only suspended for a lapsed subscription (not a manual admin
      // suspension) is let through so they can reach the in-app purchase flow and reactivate;
      // everything else they'd normally do still gets rejected downstream by JwtStrategy.
      const canBypass = staff.role === 'OWNER' && subscriptionExpired;
      if (!canBypass) {
        const reason = staff.shop.suspendReason ?? 'MANUAL';
        throw new UnauthorizedException({
          message:
            reason === 'SUBSCRIPTION_EXPIRED'
              ? "This shop's subscription has expired"
              : 'This shop has been suspended',
          reason,
        });
      }
    }

    const payload: JwtPayload = {
      sub: staff.id,
      shopId: staff.shopId,
      role: staff.role,
      name: staff.name,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
      subscriptionExpired,
    };
  }
}
