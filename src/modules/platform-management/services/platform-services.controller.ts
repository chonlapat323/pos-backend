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
import { UpdateServiceDto } from '../../services/dto/update-service.dto';
import { CreatePlatformServiceDto } from './dto/create-platform-service.dto';
import { QueryPlatformServiceDto } from './dto/query-platform-service.dto';
import { PlatformServicesService } from './platform-services.service';

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/services')
export class PlatformServicesController {
  constructor(private readonly service: PlatformServicesService) {}

  @Get()
  findAll(@Query() query: QueryPlatformServiceDto) {
    return this.service.findAll(query);
  }

  @Post()
  create(@Body() dto: CreatePlatformServiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
