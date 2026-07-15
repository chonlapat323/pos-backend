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
import { PlatformJwtAuthGuard } from '../platform-auth/platform-jwt-auth.guard';
import { UpdateShopDto } from '../shop/dto/update-shop.dto';
import { CreatePlatformShopDto } from './dto/create-shop.dto';
import { QueryPlatformShopDto } from './dto/query-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { PlatformShopsService } from './platform-shops.service';

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/shops')
export class PlatformShopsController {
  constructor(private readonly platformShopsService: PlatformShopsService) {}

  @Get()
  findAll(@Query() query: QueryPlatformShopDto) {
    return this.platformShopsService.findAll(query);
  }

  @Get('dashboard')
  dashboard() {
    return this.platformShopsService.dashboard();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformShopsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlatformShopDto) {
    return this.platformShopsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.platformShopsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShopStatusDto) {
    return this.platformShopsService.updateStatus(id, dto);
  }
}
