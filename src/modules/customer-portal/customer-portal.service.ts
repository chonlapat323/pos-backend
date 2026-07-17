import { Injectable } from '@nestjs/common';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
  ) {}

  async getMe(shopId: string, memberId: string) {
    const [member, visitCount, spentAgg] = await Promise.all([
      this.membersService.findOne(shopId, memberId),
      this.prisma.bill.count({ where: { memberId, status: 'PAID' } }),
      this.prisma.bill.aggregate({
        where: { memberId, status: 'PAID' },
        _sum: { total: true },
      }),
    ]);

    return {
      ...member,
      visitCount,
      totalSpent: Number(spentAgg._sum.total ?? 0),
    };
  }

  async getRewards(shopId: string, memberId: string) {
    const [rewards, member] = await Promise.all([
      this.prisma.reward.findMany({
        where: { shopId, isActive: true },
        orderBy: { pointCost: 'asc' },
      }),
      this.prisma.member.findUnique({
        where: { id: memberId },
        select: { pointBalance: true },
      }),
    ]);

    const pointBalance = member?.pointBalance ?? 0;
    return rewards.map((reward) => ({
      ...reward,
      canRedeem: pointBalance >= reward.pointCost,
    }));
  }
}
