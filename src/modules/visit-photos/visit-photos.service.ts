import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitPhotoDto } from './dto/create-visit-photo.dto';

@Injectable()
export class VisitPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForMember(shopId: string, memberId: string) {
    await this.assertMemberExists(shopId, memberId);
    return this.prisma.visitPhoto.findMany({
      where: { shopId, memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(shopId: string, dto: CreateVisitPhotoDto) {
    await this.assertMemberExists(shopId, dto.memberId);
    if (dto.billId) {
      await this.assertBillBelongsToMember(shopId, dto.billId, dto.memberId);
    }
    return this.prisma.visitPhoto.create({
      data: {
        shopId,
        memberId: dto.memberId,
        type: dto.type,
        imageUrl: dto.imageUrl,
        billId: dto.billId,
      },
    });
  }

  async remove(shopId: string, id: string) {
    const photo = await this.prisma.visitPhoto.findFirst({
      where: { id, shopId },
      select: { id: true },
    });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.prisma.visitPhoto.delete({ where: { id } });
    return { success: true };
  }

  private async assertMemberExists(shopId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, shopId },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Member not found');
  }

  private async assertBillBelongsToMember(
    shopId: string,
    billId: string,
    memberId: string,
  ) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, shopId, memberId },
      select: { id: true },
    });
    if (!bill) throw new NotFoundException('Bill not found');
  }
}
