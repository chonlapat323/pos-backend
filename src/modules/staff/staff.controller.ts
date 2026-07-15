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
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryStaffDto,
  ) {
    return this.staffService.findAll(user.shopId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.staffService.findOne(user.shopId, id);
  }

  @Post()
  @RequirePermission('shop.staff.manage')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateStaffDto) {
    return this.staffService.create(user.shopId, dto);
  }

  @Patch(':id')
  @RequirePermission('shop.staff.manage')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(user.shopId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('shop.staff.manage')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.staffService.remove(user.shopId, id);
  }
}
