import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentPlatformAdminPayload, PlatformJwtPayload } from './types';

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('PLATFORM_JWT_SECRET'),
    });
  }

  async validate(
    payload: PlatformJwtPayload,
  ): Promise<CurrentPlatformAdminPayload> {
    if (payload.type !== 'platform') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: payload.sub },
      select: {
        isSuperAdmin: true,
        roleRef: { select: { permissions: true } },
      },
    });
    if (!admin) {
      throw new UnauthorizedException('Platform admin not found');
    }

    return {
      id: payload.sub,
      name: payload.name,
      permissions: admin.roleRef?.permissions ?? [],
      isSuperAdmin: admin.isSuperAdmin,
    };
  }
}
