import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformRoleDto } from './dto/create-platform-role.dto';
import { UpdatePlatformRoleDto } from './dto/update-platform-role.dto';

@Injectable()
export class PlatformRolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      where: { scope: 'PLATFORM' },
      include: { _count: { select: { platformAdmins: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, scope: 'PLATFORM' },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  create(dto: CreatePlatformRoleDto) {
    return this.prisma.role.create({ data: { ...dto, scope: 'PLATFORM' } });
  }

  async update(id: string, dto: UpdatePlatformRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
