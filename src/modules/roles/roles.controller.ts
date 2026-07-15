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
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types';
import { SHOP_PERMISSIONS } from '../../common/permissions';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

function assertOwner(user: CurrentUserPayload) {
  if (user.role !== 'OWNER') {
    throw new ForbiddenException('Only the shop owner can manage roles');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.findAll(user.shopId);
  }

  @Get('catalog')
  catalog() {
    return SHOP_PERMISSIONS;
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.rolesService.findOne(user.shopId, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateRoleDto) {
    assertOwner(user);
    return this.rolesService.create(user.shopId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    assertOwner(user);
    return this.rolesService.update(user.shopId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    assertOwner(user);
    return this.rolesService.remove(user.shopId, id);
  }
}
