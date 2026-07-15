import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { QueryServiceCategoryDto } from './dto/query-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { ServiceCategoriesService } from './service-categories.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly service: ServiceCategoriesService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceCategoryDto,
  ) {
    return this.service.findAll(user.shopId, query);
  }

  @Get('select')
  findAllForSelect(@CurrentUser() user: CurrentUserPayload) {
    return this.service.findAllForSelect(user.shopId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.findOne(user.shopId, id);
  }

  @Post()
  @RequirePermission('shop.categories.manage')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateServiceCategoryDto,
  ) {
    return this.service.create(user.shopId, dto);
  }

  @Patch(':id')
  @RequirePermission('shop.categories.manage')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ) {
    return this.service.update(user.shopId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('shop.categories.manage')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.remove(user.shopId, id);
  }
}
