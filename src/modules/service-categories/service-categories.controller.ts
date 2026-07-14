import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { ServiceCategoriesService } from './service-categories.service';

@UseGuards(JwtAuthGuard)
@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly service: ServiceCategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.shopId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.findOne(user.shopId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateServiceCategoryDto) {
    return this.service.create(user.shopId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateServiceCategoryDto) {
    return this.service.update(user.shopId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.remove(user.shopId, id);
  }
}
