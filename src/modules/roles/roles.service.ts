import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: string) {
    return this.prisma.role.findMany({
      where: { shopId, scope: 'SHOP' },
      include: { _count: { select: { staff: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(shopId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, shopId, scope: 'SHOP' },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  create(shopId: string, dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: { ...dto, shopId, scope: 'SHOP' },
    });
  }

  async update(shopId: string, id: string, dto: UpdateRoleDto) {
    await this.findOne(shopId, id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(shopId: string, id: string) {
    await this.findOne(shopId, id);
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
