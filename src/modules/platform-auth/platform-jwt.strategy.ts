import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentPlatformAdminPayload, PlatformJwtPayload } from './types';

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('PLATFORM_JWT_SECRET'),
    });
  }

  validate(payload: PlatformJwtPayload): CurrentPlatformAdminPayload {
    if (payload.type !== 'platform') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { id: payload.sub, name: payload.name };
  }
}
