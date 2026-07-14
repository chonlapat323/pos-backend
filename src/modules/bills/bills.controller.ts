import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';

@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.billsService.findAll(user.shopId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.billsService.findOne(user.shopId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateBillDto) {
    return this.billsService.create(user.shopId, user.id, dto);
  }
}
