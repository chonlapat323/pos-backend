import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: string, search?: string) {
    return this.prisma.member.findMany({
      where: {
        shopId,
        ...(search
          ? {
              OR: [
                { phone: { contains: search } },
                { name: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(shopId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, shopId },
      include: {
        pointTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        bills: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: { include: { service: true } } } },
        visitPhotos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async create(shopId: string, dto: CreateMemberDto) {
    const existing = await this.prisma.member.findUnique({
      where: { shopId_phone: { shopId, phone: dto.phone } },
    });
    if (existing) throw new ConflictException('Member with this phone already exists in this shop');

    return this.prisma.member.create({
      data: { ...dto, shopId, birthday: dto.birthday ? new Date(dto.birthday) : undefined },
    });
  }

  async update(shopId: string, id: string, dto: UpdateMemberDto) {
    await this.assertExists(shopId, id);
    return this.prisma.member.update({
      where: { id },
      data: { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : undefined },
    });
  }

  async remove(shopId: string, id: string) {
    await this.assertExists(shopId, id);
    await this.prisma.member.delete({ where: { id } });
    return { success: true };
  }

  private async assertExists(shopId: string, id: string) {
    const member = await this.prisma.member.findFirst({ where: { id, shopId }, select: { id: true } });
    if (!member) throw new NotFoundException('Member not found');
  }
}
