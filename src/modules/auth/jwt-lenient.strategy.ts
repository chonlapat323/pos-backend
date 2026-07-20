import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload, JwtPayload } from './types';

/**
 * Same as JwtStrategy, but lets a shop through when it's only suspended for
 * SUBSCRIPTION_EXPIRED - used for the subscription self-service routes, since an
 * expired shop's owner must still be able to reach them to pay and reactivate.
 * A MANUAL suspension (platform admin decision) still blocks, same as JwtStrategy.
 */
@Injectable()
export class JwtLenientStrategy extends PassportStrategy(Strategy, 'jwt-lenient') {
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
        shop: { select: { isActive: true, suspendReason: true } },
        roleRef: { select: { permissions: true } },
      },
    });
    if (!staff) {
      throw new UnauthorizedException({ message: 'This shop has been suspended', reason: 'MANUAL' });
    }
    if (!staff.shop.isActive && staff.shop.suspendReason !== 'SUBSCRIPTION_EXPIRED') {
      throw new UnauthorizedException({ message: 'This shop has been suspended', reason: 'MANUAL' });
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
