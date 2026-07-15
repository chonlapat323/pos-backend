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
import { PlatformJwtAuthGuard } from '../../platform-auth/platform-jwt-auth.guard';
import { UpdateServiceCategoryDto } from '../../service-categories/dto/update-service-category.dto';
import { CreatePlatformServiceCategoryDto } from './dto/create-platform-service-category.dto';
import { QueryPlatformServiceCategoryDto } from './dto/query-platform-service-category.dto';
import { PlatformServiceCategoriesService } from './platform-service-categories.service';

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/service-categories')
export class PlatformServiceCategoriesController {
  constructor(private readonly service: PlatformServiceCategoriesService) {}

  @Get()
  findAll(@Query() query: QueryPlatformServiceCategoryDto) {
    return this.service.findAll(query);
  }

  @Post()
  create(@Body() dto: CreatePlatformServiceCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
