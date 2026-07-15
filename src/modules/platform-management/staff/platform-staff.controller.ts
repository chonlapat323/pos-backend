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
import { UpdateStaffDto } from '../../staff/dto/update-staff.dto';
import { CreatePlatformStaffDto } from './dto/create-platform-staff.dto';
import { QueryPlatformStaffDto } from './dto/query-platform-staff.dto';
import { PlatformStaffService } from './platform-staff.service';

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/staff')
export class PlatformStaffController {
  constructor(private readonly service: PlatformStaffService) {}

  @Get()
  findAll(@Query() query: QueryPlatformStaffDto) {
    return this.service.findAll(query);
  }

  @Post()
  create(@Body() dto: CreatePlatformStaffDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
