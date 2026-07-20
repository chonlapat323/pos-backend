import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePlatformPermission } from '../../common/decorators/require-permission.decorator';
import { PlatformPermissionsGuard } from '../../common/guards/platform-permissions.guard';
import { PlatformJwtAuthGuard } from '../platform-auth/platform-jwt-auth.guard';
import { UpdateShopDto } from '../shop/dto/update-shop.dto';
import { CreatePlatformShopDto } from './dto/create-shop.dto';
import { GrantShopSubscriptionDto } from './dto/grant-shop-subscription.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { QueryPlatformShopDto } from './dto/query-shop.dto';
import { UpdateShopSlugDto } from './dto/update-shop-slug.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { PlatformShopsService } from './platform-shops.service';

@UseGuards(PlatformJwtAuthGuard, PlatformPermissionsGuard)
@Controller('platform/shops')
export class PlatformShopsController {
  constructor(private readonly platformShopsService: PlatformShopsService) {}

  @Get()
  findAll(@Query() query: QueryPlatformShopDto) {
    return this.platformShopsService.findAll(query);
  }

  @Get('dashboard')
  @RequirePlatformPermission('platform.dashboard.view')
  dashboard(@Query() query: QueryDashboardDto) {
    return this.platformShopsService.dashboard(query);
  }

  @Get('select')
  findAllForSelect() {
    return this.platformShopsService.findAllForSelect();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformShopsService.findOne(id);
  }

  @Post()
  @RequirePlatformPermission('platform.shops.manage')
  create(@Body() dto: CreatePlatformShopDto) {
    return this.platformShopsService.create(dto);
  }

  @Patch(':id')
  @RequirePlatformPermission('platform.shops.manage')
  update(@Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.platformShopsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePlatformPermission('platform.shops.manage')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShopStatusDto) {
    return this.platformShopsService.updateStatus(id, dto);
  }

  @Patch(':id/slug')
  @RequirePlatformPermission('platform.shops.manage')
  updateSlug(@Param('id') id: string, @Body() dto: UpdateShopSlugDto) {
    return this.platformShopsService.updateSlug(id, dto);
  }

  @Get(':id/subscription')
  @RequirePlatformPermission('platform.subscriptions.manage')
  getSubscription(@Param('id') id: string) {
    return this.platformShopsService.getSubscription(id);
  }

  @Patch(':id/subscription')
  @RequirePlatformPermission('platform.subscriptions.manage')
  grantSubscription(
    @Param('id') id: string,
    @Body() dto: GrantShopSubscriptionDto,
  ) {
    return this.platformShopsService.grantSubscription(id, dto);
  }
}
