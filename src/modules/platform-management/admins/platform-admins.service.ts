import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformAdminAccountDto } from './dto/create-platform-admin-account.dto';
import { UpdatePlatformAdminAccountDto } from './dto/update-platform-admin-account.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  isSuperAdmin: true,
  roleId: true,
  roleRef: { select: { id: true, name: true } },
  createdAt: true,
};

@Injectable()
export class PlatformAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.platformAdmin.findMany({
      select: SAFE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreatePlatformAdminAccountDto) {
    const existing = await this.prisma.platformAdmin.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.platformAdmin.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
        isSuperAdmin: dto.isSuperAdmin ?? false,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdatePlatformAdminAccountDto) {
    await this.assertExists(id);
    const { password, ...rest } = dto;
    return this.prisma.platformAdmin.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.platformAdmin.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!admin) throw new NotFoundException('Platform admin not found');
  }
}
