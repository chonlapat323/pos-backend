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
import { CurrentPlatformAdmin } from '../../platform-auth/current-platform-admin.decorator';
import { PlatformJwtAuthGuard } from '../../platform-auth/platform-jwt-auth.guard';
import type { CurrentPlatformAdminPayload } from '../../platform-auth/types';
import { CreatePlatformAdminAccountDto } from './dto/create-platform-admin-account.dto';
import { UpdatePlatformAdminAccountDto } from './dto/update-platform-admin-account.dto';
import { PlatformAdminsService } from './platform-admins.service';

function assertSuperAdmin(admin: CurrentPlatformAdminPayload) {
  if (!admin.isSuperAdmin) {
    throw new ForbiddenException(
      'Only a super-admin (no restricted role assigned) can manage platform admin accounts',
    );
  }
}

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/admins')
export class PlatformAdminsController {
  constructor(private readonly service: PlatformAdminsService) {}

  @Get()
  findAll(@CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload) {
    assertSuperAdmin(admin);
    return this.service.findAll();
  }

  @Post()
  create(
    @CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload,
    @Body() dto: CreatePlatformAdminAccountDto,
  ) {
    assertSuperAdmin(admin);
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @CurrentPlatformAdmin() admin: CurrentPlatformAdminPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformAdminAccountDto,
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
    if (admin.id === id) {
      throw new ForbiddenException('Cannot delete your own admin account');
    }
    return this.service.remove(id);
  }
}
