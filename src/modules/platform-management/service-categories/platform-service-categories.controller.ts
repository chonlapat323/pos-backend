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
import { RequirePlatformPermission } from '../../../common/decorators/require-permission.decorator';
import { PlatformPermissionsGuard } from '../../../common/guards/platform-permissions.guard';
import { PlatformJwtAuthGuard } from '../../platform-auth/platform-jwt-auth.guard';
import { UpdateServiceCategoryDto } from '../../service-categories/dto/update-service-category.dto';
import { CreatePlatformServiceCategoryDto } from './dto/create-platform-service-category.dto';
import { QueryPlatformServiceCategoryDto } from './dto/query-platform-service-category.dto';
import { PlatformServiceCategoriesService } from './platform-service-categories.service';

@UseGuards(PlatformJwtAuthGuard, PlatformPermissionsGuard)
@Controller('platform/service-categories')
export class PlatformServiceCategoriesController {
  constructor(private readonly service: PlatformServiceCategoriesService) {}

  @Get()
  findAll(@Query() query: QueryPlatformServiceCategoryDto) {
    return this.service.findAll(query);
  }

  @Get('select')
  findAllForSelect(@Query('shopId') shopId?: string) {
    return this.service.findAllForSelect(shopId);
  }

  @Post()
  @RequirePlatformPermission('platform.categories.manage')
  create(@Body() dto: CreatePlatformServiceCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePlatformPermission('platform.categories.manage')
  update(@Param('id') id: string, @Body() dto: UpdateServiceCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePlatformPermission('platform.categories.manage')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
