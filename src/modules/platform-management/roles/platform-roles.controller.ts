import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PLATFORM_PERMISSIONS } from '../../../common/permissions';
import { CurrentPlatformAdmin } from '../../platform-auth/current-platform-admin.decorator';
import { PlatformJwtAuthGuard } from '../../platform-auth/platform-jwt-auth.guard';
import type { CurrentPlatformAdminPayload } from '../../platform-auth/types';
import { CreatePlatformRoleDto } from './dto/create-platform-role.dto';
import { UpdatePlatformRoleDto } from './dto/update-platform-role.dto';
import { PlatformRolesService } from './platform-roles.service';

function assertSuperAdmin(admin: CurrentPlatformAdminPayload) {
  if (!admin.isSuperAdmin) {
    throw new ForbiddenException(
      'Only a super-admin (no restricted role assigned) can manage platform roles',
    );
  }
}

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/roles')
export class PlatformRolesController {
  constructor(private readonly service: PlatformRolesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('catalog')
  catalog() {
    return PLATFORM_PERMISSIONS;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload,
    @Body() dto: CreatePlatformRoleDto,
  ) {
    assertSuperAdmin(admin);
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformRoleDto,
  ) {
    assertSuperAdmin(admin);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload,
    @Param('id') id: string,
  ) {
    assertSuperAdmin(admin);
    return this.service.remove(id);
  }
}
