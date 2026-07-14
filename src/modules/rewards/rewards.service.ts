import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(shopId: string) {
    return this.prisma.reward.findMany({ where: { shopId }, orderBy: { pointCost: 'asc' } });
  }

  async findOne(shopId: string, id: string) {
    const reward = await this.prisma.reward.findFirst({ where: { id, shopId } });
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }

  create(shopId: string, dto: CreateRewardDto) {
    return this.prisma.reward.create({ data: { ...dto, shopId } });
  }

  async update(shopId: string, id: string, dto: UpdateRewardDto) {
    await this.findOne(shopId, id);
    return this.prisma.reward.update({ where: { id }, data: dto });
  }

  async remove(shopId: string, id: string) {
    await this.findOne(shopId, id);
    await this.prisma.reward.delete({ where: { id } });
    return { success: true };
  }

  async redeem(shopId: string, rewardId: string, memberId: string) {
    const reward = await this.findOne(shopId, rewardId);
    const member = await this.prisma.member.findFirst({ where: { id: memberId, shopId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.pointBalance < reward.pointCost) {
      throw new BadRequestException('Member does not have enough points for this reward');
    }

    const [, pointTransaction] = await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id: memberId },
        data: { pointBalance: { decrement: reward.pointCost } },
      }),
      this.prisma.pointTransaction.create({
        data: {
          shopId,
          memberId,
          type: 'REDEEM',
          points: -reward.pointCost,
          rewardId,
          note: `แลกรางวัล: ${reward.name}`,
        },
      }),
    ]);

    return pointTransaction;
  }
}
