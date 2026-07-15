import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @RequirePermission('shop.reports.view')
  summary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.summary(user.shopId);
  }

  @Get('top-services')
  @RequirePermission('shop.reports.view')
  topServices(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.topServices(user.shopId);
  }

  @Get('staff-sales')
  @RequirePermission('shop.reports.view')
  staffSales(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.staffSales(user.shopId);
  }
}
