import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Member } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { QueryBillDto } from './dto/query-bill.dto';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    shopId: string,
    query: QueryBillDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      shopId,
      ...(query.search
        ? {
            OR: [
              { member: { name: { contains: query.search, mode: 'insensitive' as const } } },
              { member: { phone: { contains: query.search } } },
              { staff: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
              ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          member: true,
          staff: { select: { id: true, name: true } },
          items: { include: { service: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(shopId: string, id: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, shopId },
      include: {
        member: true,
        staff: { select: { id: true, name: true } },
        items: { include: { service: true } },
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  async create(shopId: string, staffId: string, dto: CreateBillDto) {
    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
    });

    if (dto.items.length === 0) {
      throw new BadRequestException('Bill must have at least one item');
    }

    const serviceIds = dto.items.map((item) => item.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds }, shopId },
    });
    if (services.length !== new Set(serviceIds).size) {
      throw new BadRequestException(
        'One or more services do not belong to this shop',
      );
    }

    const servicesById = new Map(
      services.map((service) => [service.id, service]),
    );
    const subtotal = dto.items.reduce((sum, item) => {
      const service = servicesById.get(item.serviceId)!;
      return sum + Number(service.price) * item.quantity;
    }, 0);

    const discount = dto.discount ?? 0;
    const pointsUsed = dto.pointsUsed ?? 0;

    let member: Member | null = null;
    if (dto.memberId) {
      member = await this.prisma.member.findFirst({
        where: { id: dto.memberId, shopId },
      });
      if (!member) throw new NotFoundException('Member not found');
    }

    if (pointsUsed > 0) {
      if (!member)
        throw new BadRequestException('memberId is required to use points');
      if (member.pointBalance < pointsUsed)
        throw new BadRequestException('Member does not have enough points');
    }

    const pointsDiscount = pointsUsed * shop.bahtPerPoint;
    const total = Math.max(0, subtotal - discount - pointsDiscount);
    const pointEarned = member ? Math.floor(total / shop.bahtPerPoint) : 0;

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          shopId,
          staffId,
          memberId: dto.memberId,
          subtotal,
          discount,
          total,
          paymentMethod: dto.paymentMethod,
          pointEarned,
          pointUsed: pointsUsed,
          status: 'PAID',
          items: {
            create: dto.items.map((item) => ({
              serviceId: item.serviceId,
              quantity: item.quantity,
              priceAtSale: Number(servicesById.get(item.serviceId)!.price),
            })),
          },
        },
        include: { items: { include: { service: true } } },
      });

      if (member) {
        const netPointChange = pointEarned - pointsUsed;
        if (netPointChange !== 0) {
          await tx.member.update({
            where: { id: member.id },
            data: { pointBalance: { increment: netPointChange } },
          });
        }

        if (pointsUsed > 0) {
          await tx.pointTransaction.create({
            data: {
              shopId,
              memberId: member.id,
              type: 'REDEEM',
              points: -pointsUsed,
              billId: bill.id,
              note: 'ใช้ point เป็นส่วนลดบิล',
            },
          });
        }

        if (pointEarned > 0) {
          await tx.pointTransaction.create({
            data: {
              shopId,
              memberId: member.id,
              type: 'EARN',
              points: pointEarned,
              billId: bill.id,
              note: 'สะสม point จากบิล',
            },
          });
        }
      }

      return bill;
    });
  }
}
