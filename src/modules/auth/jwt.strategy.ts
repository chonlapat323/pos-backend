import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload, JwtPayload } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: payload.sub },
      select: {
        shop: { select: { isActive: true } },
        roleRef: { select: { permissions: true } },
      },
    });
    if (!staff || !staff.shop.isActive) {
      throw new UnauthorizedException('This shop has been suspended');
    }

    return {
      id: payload.sub,
      shopId: payload.shopId,
      role: payload.role,
      name: payload.name,
      permissions: staff.roleRef?.permissions ?? [],
    };
  }
}
