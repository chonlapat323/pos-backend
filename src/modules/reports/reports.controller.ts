import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.summary(user.shopId);
  }

  @Get('top-services')
  topServices(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.topServices(user.shopId);
  }

  @Get('staff-sales')
  staffSales(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.staffSales(user.shopId);
  }
}
