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
    });

    if (!staff || !staff.passwordHash || !staff.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
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
    };
  }
}
