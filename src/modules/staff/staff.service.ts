import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    shopId: string,
    query: QueryStaffDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      shopId,
      ...(query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.staffUser.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.staffUser.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(shopId: string, id: string) {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id, shopId },
      select: SAFE_SELECT,
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async create(shopId: string, dto: CreateStaffDto) {
    const existing = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { password: _password, ...rest } = dto;
    const staff = await this.prisma.staffUser.create({
      data: { ...rest, shopId, passwordHash },
      select: SAFE_SELECT,
    });
    return staff;
  }

  async update(shopId: string, id: string, dto: UpdateStaffDto) {
    await this.findOne(shopId, id);
    const { password, ...rest } = dto;
    return this.prisma.staffUser.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async remove(shopId: string, id: string) {
    await this.findOne(shopId, id);
    await this.prisma.staffUser.delete({ where: { id } });
    return { success: true };
  }
}
