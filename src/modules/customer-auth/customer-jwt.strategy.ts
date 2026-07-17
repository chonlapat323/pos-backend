import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentCustomerPayload, CustomerJwtPayload } from './types';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CurrentCustomerPayload> {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Invalid token type');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
      select: { id: true, shopId: true },
    });
    if (!member || member.shopId !== payload.shopId) {
      throw new UnauthorizedException('Member not found');
    }

    return { memberId: member.id, shopId: member.shopId };
  }
}
